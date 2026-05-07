const db = require("../config/db");
const { ok, message, fail } = require("../utils/response");
const {
  isValidDateFormat,
  getTodayString,
  parsePositiveInteger,
  isValidReservationStatus,
} = require("../utils/validators");
const {
  sendEmail,
  buildReservationCreatedEmail,
  buildReservationCancelledEmail,
} = require("../services/email.service");
const {
  MAX_ACTIVE_RESERVATIONS_PER_USER,
} = require("../config/reservationLimits");
const {
  RESERVATION_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  RESERVATION_DURATION,
} = require("../config/reservationConstants");

// Crear reserva (amb comprovacions de disponibilitat i bloqueig)
exports.createReservation = async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const user_id = req.user.id;
    const userRole = req.user.rol;

    const [userRows] = await connection.query(
      "SELECT email_verificat FROM users WHERE id = ? LIMIT 1",
      [user_id]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return fail(res, "Usuari no trobat", 404);
    }

    if (!userRows[0].email_verificat) {
      await connection.rollback();
      return fail(
        res,
        "Has de verificar el teu correu electrònic abans de gestionar reserves",
        403
      );
    }

    let { court_id, time_slot_id, data_reserva, duration, metode_pagament } = req.body;

    court_id = parsePositiveInteger(court_id);
    time_slot_id = parsePositiveInteger(time_slot_id);
    data_reserva = typeof data_reserva === "string" ? data_reserva.trim() : "";
    duration = Number(duration) || RESERVATION_DURATION.ONE_HOUR;

    if (!court_id || !time_slot_id || !data_reserva) {
      await connection.rollback();
      return fail(res, "Falten dades obligatòries", 400);
    }

    if (!isValidDateFormat(data_reserva)) {
      await connection.rollback();
      return fail(res, "La data ha de tenir format YYYY-MM-DD", 400);
    }

    const allowedDurations = Object.values(RESERVATION_DURATION);
    if (!allowedDurations.includes(duration)) {
      await connection.rollback();
      return fail(res, "Duració no vàlida", 400);
    }

    const todayString = getTodayString();
    if (data_reserva < todayString) {
      await connection.rollback();
      return fail(res, "No es poden fer reserves en dates passades", 400);
    }

    if (typeof metode_pagament === "string") {
      metode_pagament = metode_pagament.trim().toLowerCase();
    } else {
      metode_pagament = PAYMENT_METHOD.CLUB;
    }

    const allowedMethods = Object.values(PAYMENT_METHOD);
    if (!allowedMethods.includes(metode_pagament)) {
      await connection.rollback();
      return fail(res, "Mètode de pagament no vàlid", 400);
    }

    const estat_pagament = PAYMENT_STATUS.PENDING;

    const [courts] = await connection.query(
      "SELECT id, estat, preu_persona_1h, preu_persona_1h30, nom_pista, tipus FROM courts WHERE id = ? LIMIT 1",
      [court_id]
    );

    if (courts.length === 0) {
      await connection.rollback();
      return fail(res, "La pista indicada no existeix", 404);
    }

    const court = courts[0];

    if (court.estat !== "disponible") {
      await connection.rollback();
      return fail(res, "Aquesta pista no està disponible per reservar", 400);
    }

    const [allSlots] = await connection.query(
      "SELECT id, hora_inici, hora_fi FROM time_slots ORDER BY hora_inici ASC"
    );

    const slotIndex = allSlots.findIndex((s) => s.id === time_slot_id);

    if (slotIndex === -1) {
      await connection.rollback();
      return fail(res, "Franja no trobada", 404);
    }

    const slotsNeeded = duration;
    const selectedSlots = allSlots.slice(slotIndex, slotIndex + slotsNeeded);

    if (selectedSlots.length < slotsNeeded) {
      await connection.rollback();
      return fail(res, "No hi ha suficients franges consecutives", 400);
    }

    const firstSlot = selectedSlots[0];

    if (data_reserva === todayString) {
      const now = new Date();

      const [hours, minutes, seconds = 0] = String(firstSlot.hora_inici)
        .split(":")
        .map(Number);

      const slotDateTime = new Date();
      slotDateTime.setHours(hours, minutes, seconds, 0);

      if (slotDateTime <= now) {
        await connection.rollback();
        return fail(
          res,
          "No pots reservar una franja horària que ja ha passat",
          400
        );
      }
    }

    if (userRole !== "admin") {
      const [userActiveReservations] = await connection.query(
        `SELECT COUNT(DISTINCT codi_reserva) AS total
         FROM reservations
         WHERE user_id = ? AND estat = ?`,
        [user_id, RESERVATION_STATUS.ACTIVE]
      );

      if (userActiveReservations[0].total >= MAX_ACTIVE_RESERVATIONS_PER_USER) {
        await connection.rollback();
        return fail(
          res,
          `Has arribat al límit màxim de ${MAX_ACTIVE_RESERVATIONS_PER_USER} reserves actives`,
          400
        );
      }
    }

    for (const slot of selectedSlots) {
      const [existing] = await connection.query(
        `SELECT id FROM reservations
         WHERE court_id = ? AND time_slot_id = ? AND data_reserva = ? AND estat = ?`,
        [court_id, slot.id, data_reserva, RESERVATION_STATUS.ACTIVE]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return fail(res, "Una de les franges ja està reservada", 400);
      }

      const [maintenanceBlocks] = await connection.query(
        `SELECT id FROM maintenance_blocks
         WHERE court_id = ? AND time_slot_id = ? AND data_bloqueig = ?`,
        [court_id, slot.id, data_reserva]
      );

      if (maintenanceBlocks.length > 0) {
        await connection.rollback();
        return fail(
          res,
          "Una de les franges està bloquejada per manteniment",
          400
        );
      }
    }

    const playersCount = court.tipus === "individual" ? 2 : 4;

    const preuPerPersona =
      Number(duration) === RESERVATION_DURATION.ONE_HOUR
        ? Number(court.preu_persona_1h || 0)
        : Number(court.preu_persona_1h30 || 0);

    const preu_total = preuPerPersona * playersCount;

    const codi_reserva = `PB-${data_reserva.replace(/-/g, "")}-${Date.now()}-${user_id}`;

    const createdIds = [];

    for (const slot of selectedSlots) {
      const [insertResult] = await connection.query(
        `INSERT INTO reservations (
          codi_reserva,
          user_id,
          court_id,
          time_slot_id,
          data_reserva,
          estat,
          preu_total,
          estat_pagament,
          metode_pagament
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codi_reserva,
          user_id,
          court_id,
          slot.id,
          data_reserva,
          RESERVATION_STATUS.ACTIVE,
          preu_total,
          estat_pagament,
          metode_pagament,
        ]
      );

      createdIds.push(insertResult.insertId);
    }

    await connection.commit();

    const detail = {
      nom_pista: court.nom_pista,
      hora_inici: selectedSlots[0].hora_inici,
      hora_fi: selectedSlots[selectedSlots.length - 1].hora_fi,
    };

    const [reservationDetails] = await db.query(
      `SELECT nom, email FROM users WHERE id = ? LIMIT 1`,
      [user_id]
    );

    const userDetail = reservationDetails[0];

    if (userDetail?.email) {
      try {
        sendEmail({
          to: userDetail.email,
          subject: `Reserva confirmada - ${codi_reserva}`,
          html: buildReservationCreatedEmail({
            nom: userDetail.nom,
            codi_reserva,
            nom_pista: detail.nom_pista,
            data_reserva,
            hora_inici: detail.hora_inici,
            hora_fi: detail.hora_fi,
            preu_total,
            estat_pagament,
            metode_pagament,
          }),
        }).catch((emailError) => {
          console.error("Error enviant email de reserva:", emailError);
        });
      } catch (emailError) {
        console.error("Error enviant email de reserva:", emailError);
      }
    }

    return message(res, "Reserva creada correctament", 201, {
      id: createdIds[0],
      codi_reserva,
      preu_total,
      estat_pagament,
      metode_pagament,
      duration,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error("Error createReservation:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Ja existeix un conflicte de reserva per aquesta pista, franja i data.",
      });
    }

    return res.status(500).json({
      error: "Error creant la reserva",
    });
  } finally {
    if (connection) connection.release();
  }
};

// Obtenir reserves (totes per admin, només del propi usuari per a usuari normal)
exports.getReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const estat =
      typeof req.query.estat === "string"
        ? req.query.estat.trim().toLowerCase()
        : "";

    if (estat && !isValidReservationStatus(estat)) {
      return fail(
        res,
        "El filtre d'estat només pot ser 'activa' o 'cancel·lada'",
        400
      );
    }

    const params = [userId];
    let query = `
      SELECT
        MIN(r.id) AS id,
        r.codi_reserva,
        r.data_reserva,
        r.estat,
        MAX(r.preu_total) AS preu_total,
        r.estat_pagament,
        r.metode_pagament,
        MIN(r.created_at) AS created_at,
        c.nom_pista,
        MIN(t.hora_inici) AS hora_inici,
        MAX(t.hora_fi) AS hora_fi,
        COUNT(*) AS total_slots
      FROM reservations r
      JOIN courts c ON r.court_id = c.id
      JOIN time_slots t ON r.time_slot_id = t.id
      WHERE r.user_id = ?
    `;

    if (estat) {
      query += ` AND r.estat = ?`;
      params.push(estat);
    }

    query += `
      GROUP BY
        r.codi_reserva,
        r.data_reserva,
        r.estat,
        r.estat_pagament,
        r.metode_pagament,
        c.nom_pista
      ORDER BY r.data_reserva DESC, hora_inici DESC
    `;

    const [reservations] = await db.query(query, params);

    return ok(res, reservations);
  } catch (error) {
    console.error("Error getReservations:", error);
    return fail(res, "Error obtenint reserves");
  }
};

// Cancel·lar reserva (només el propietari o admin)
exports.deleteReservation = async (req, res) => {
  try {
    const reservationId = parsePositiveInteger(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.rol;

    if (!reservationId) {
      return fail(res, "L'identificador de la reserva no és vàlid", 400);
    }

    // 1. Comprovar si la reserva existeix
    const [reservations] = await db.query(
      "SELECT * FROM reservations WHERE id = ?",
      [reservationId]
    );

    if (reservations.length === 0) {
      return fail(res, "Reserva no trobada", 404);
    }

    const reservationBase = reservations[0];

    // 2. Si no és admin, només pot cancel·lar les seves reserves
    if (userRole !== "admin" && reservationBase.user_id !== userId) {
      return fail(res, "No tens permís per cancel·lar aquesta reserva", 403);
    }

    // 3. Si la reserva ja està cancel·lada, informar-ho
    if (reservationBase.estat === RESERVATION_STATUS.CANCELLED) {
      return fail(res, "Aquesta reserva ja està cancel·lada", 400);
    }

    // 4. Cancel·lar totes les reserves amb el mateix codi_reserva
    await db.query(
      "UPDATE reservations SET estat = ? WHERE codi_reserva = ?",
      [RESERVATION_STATUS.CANCELLED, reservationBase.codi_reserva]
    );

    const [reservationRows] = await db.query(
      `
        SELECT
          MIN(r.id) AS id,
          r.codi_reserva,
          r.user_id,
          r.court_id,
          r.data_reserva,
          r.estat,
          MAX(r.preu_total) AS preu_total,
          r.estat_pagament,
          r.metode_pagament,
          u.nom,
          u.email,
          c.nom_pista,
          MIN(t.hora_inici) AS hora_inici,
          MAX(t.hora_fi) AS hora_fi
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        JOIN courts c ON r.court_id = c.id
        JOIN time_slots t ON r.time_slot_id = t.id
        WHERE r.codi_reserva = ?
        GROUP BY
          r.codi_reserva,
          r.user_id,
          r.court_id,
          r.data_reserva,
          r.estat,
          r.estat_pagament,
          r.metode_pagament,
          u.nom,
          u.email,
          c.nom_pista
        LIMIT 1
      `,
      [reservationBase.codi_reserva]
    );

    const reservationDetails = reservationRows[0];

    // Enviar email de cancel·lació de reserva
    if (reservationDetails?.email) {
      try {
        sendEmail({
          to: reservationDetails.email,
          subject: `Reserva cancel·lada - ${reservationDetails.codi_reserva}`,
          html: buildReservationCancelledEmail({
            nom: reservationDetails.nom,
            codi_reserva: reservationDetails.codi_reserva,
            nom_pista: reservationDetails.nom_pista,
            data_reserva: reservationDetails.data_reserva,
            hora_inici: reservationDetails.hora_inici,
            hora_fi: reservationDetails.hora_fi,
            preu_total: reservationDetails.preu_total,
            estat_pagament: reservationDetails.estat_pagament,
            metode_pagament: reservationDetails.metode_pagament,
          }),
        }).catch((emailError) => {
          console.error("Error enviant email de cancel·lació:", emailError);
        });
      } catch (emailError) {
        console.error("Error enviant email de cancel·lació:", emailError);
      }
    }

    return message(res, "Reserva cancel·lada correctament");
  } catch (error) {
    console.error("Error deleteReservation:", error);
    return fail(res, "Error cancel·lant la reserva");
  }
};

// Eliminar definitivament una reserva cancel·lada (només el propietari o admin)
exports.deleteCancelledReservationPermanently = async (req, res) => {
  try {
    const reservationId = parsePositiveInteger(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.rol;

    if (!reservationId) {
      return fail(res, "L'identificador de la reserva no és vàlid", 400);
    }

    const [reservations] = await db.query(
      "SELECT * FROM reservations WHERE id = ? LIMIT 1",
      [reservationId]
    );

    if (reservations.length === 0) {
      return fail(res, "Reserva no trobada", 404);
    }

    const reservation = reservations[0];

    if (userRole !== "admin" && reservation.user_id !== userId) {
      return fail(res, "No tens permís per eliminar aquesta reserva", 403);
    }

    // Permetre eliminar:
    // - cancel·lades
    // - finalitzades (activa però passada)

    if (reservation.estat === RESERVATION_STATUS.ACTIVE) {
      const now = new Date();

      const [timeSlotRows] = await db.query(
        "SELECT hora_fi FROM time_slots WHERE id = ? LIMIT 1",
        [reservation.time_slot_id]
      );

      if (timeSlotRows.length === 0) {
        return fail(res, "No s'ha pogut validar la franja horària", 500);
      }

      const hora_fi = timeSlotRows[0].hora_fi;

      const baseDate = new Date(reservation.data_reserva);

      const [hours, minutes, seconds = 0] = String(hora_fi || "00:00:00")
        .split(":")
        .map(Number);

      const reservationEnd = new Date(baseDate);
      reservationEnd.setHours(hours, minutes, seconds, 0);

      if (reservationEnd >= now) {
        return fail(
          res,
          "Només es poden eliminar reserves cancel·lades o ja finalitzades",
          400
        );
      }
    }

    const wasCancelled =
      reservation.estat === RESERVATION_STATUS.CANCELLED;

    await db.query("DELETE FROM reservations WHERE codi_reserva = ?", [
      reservation.codi_reserva,
    ]);

    return message(
      res,
      wasCancelled
        ? "Reserva cancel·lada eliminada correctament"
        : "Reserva finalitzada eliminada correctament"
    );
  } catch (error) {
    console.error("Error deleteCancelledReservationPermanently:", error);
    return fail(res, "Error eliminant definitivament la reserva");
  }
};

// Obtenir una reserva pel seu codi
exports.getReservationByCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.rol;
    const codi_reserva =
      typeof req.params.codi_reserva === "string"
        ? req.params.codi_reserva.trim().toUpperCase()
        : "";

    if (!codi_reserva) {
      return fail(res, "El codi de reserva és obligatori", 400);
    }

    let query = `
      SELECT
        r.id,
        r.codi_reserva,
        r.user_id,
        r.court_id,
        r.time_slot_id,
        r.data_reserva,
        r.estat,
        r.preu_total,
        r.estat_pagament,
        r.metode_pagament,
        r.created_at,
        c.nom_pista,
        t.hora_inici,
        t.hora_fi
      FROM reservations r
      JOIN courts c ON r.court_id = c.id
      JOIN time_slots t ON r.time_slot_id = t.id
      WHERE r.codi_reserva = ?
    `;

    const params = [codi_reserva];

    if (userRole !== "admin") {
      query += ` AND r.user_id = ?`;
      params.push(userId);
    }

    query += ` LIMIT 1`;

    const [reservations] = await db.query(query, params);

    if (reservations.length === 0) {
      return fail(res, "Reserva no trobada", 404);
    }

    return ok(res, reservations[0]);
  } catch (error) {
    console.error("Error getReservationByCode:", error);
    return fail(res, "Error obtenint la reserva");
  }
};