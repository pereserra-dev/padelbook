const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  sendEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
} = require("../services/email.service");

const { ok, message, fail } = require("../utils/response");
const { verifyTurnstileToken } = require("../services/turnstile.service");
const { logSecurityEvent } = require("../utils/securityLogger");

const {
  normalizeEmail,
  normalizeFullName,
  validatePasswordStrength,
  validateProfileData,
} = require("../utils/validators");

const createAndSendVerificationEmail = async ({ userId, nom, email, subject }) => {
  await db.query(
    "DELETE FROM verification_codes WHERE user_id = ? AND type = 'email_verification'",
    [userId]
  );

  const verificationToken = crypto.randomBytes(32).toString("hex");

  await db.query(
    "INSERT INTO verification_codes (user_id, code, type, expires_at) VALUES (?, ?, 'email_verification', DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [userId, verificationToken]
  );

  const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: email,
    subject,
    html: buildVerificationEmail({ nom, verifyUrl }),
  });
};


// REGISTRE D'USUARI
exports.register = async (req, res) => {
  try {
    let { nom, llinatges, email, password, turnstileToken } = req.body;

    nom = normalizeFullName(nom);
    llinatges = normalizeFullName(llinatges);
    email = normalizeEmail(email);
    password = typeof password === "string" ? password : "";

    const profileValidation = validateProfileData(nom, llinatges, email);
    if (profileValidation.error) {
      return fail(res, profileValidation.error, 400);
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return fail(res, passwordError, 400);
    }

    const turnstileResult = await verifyTurnstileToken({
      token: turnstileToken,
      remoteip: req.ip,
    });

    if (!turnstileResult.success) {
      logSecurityEvent(req, "REGISTER_TURNSTILE_FAILED", {
        email,
        reason: turnstileResult.message,
      });

      return fail(res, turnstileResult.message, 400);
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      logSecurityEvent(req, "REGISTER_DUPLICATE_EMAIL", {
        email,
      });

      return fail(res, "Aquest correu electrònic ja està registrat.", 409);
    }

    const hash = await bcrypt.hash(password, 10);

    const [insertResult] = await db.query(
      "INSERT INTO users (nom, llinatges, email, password_hash, rol, email_verificat) VALUES (?, ?, ?, ?, 'usuari', 1)",
      [nom, llinatges, email, hash]
    );

    logSecurityEvent(req, "REGISTER_SUCCESS", {
      createdUserId: insertResult.insertId,
      email,
    });

    // Temporalment desactivat fins a configurar el sistema d'emails professional
    // await createAndSendVerificationEmail({
    //   userId: insertResult.insertId,
    //   nom,
    //   email,
    //   subject: "Verifica el teu compte - PadelBook",
    // });

    return message(
      res,
      "Usuari registrat correctament. Si no reps el correu de verificació, podràs reenviar-lo des del login o des del teu compte.",
      201
    );

  } catch (error) {
    console.error("Error al registre:", error);

    logSecurityEvent(req, "REGISTER_SERVER_ERROR", {
      email: typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null,
      errorMessage: error.message,
    });

    if (error.code === "ER_DUP_ENTRY") {
      return fail(res, "Aquest correu electrònic ja està registrat.", 409);
    }

    return fail(res, "Error intern del servidor durant el registre.", 500);
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    let { email, password, turnstileToken } = req.body;

    email = normalizeEmail(email);
    password = typeof password === "string" ? password : "";

    if (!email || !password) {
      return fail(res, "Has d'introduir email i contrasenya.", 400);
    }

    if (turnstileToken) {
      const turnstileResult = await verifyTurnstileToken({
        token: turnstileToken,
        remoteip: req.ip,
      });

      if (!turnstileResult.success) {
        logSecurityEvent(req, "LOGIN_TURNSTILE_FAILED", {
          email,
          reason: turnstileResult.message,
        });

        return fail(res, turnstileResult.message, 400);
      }
    }

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      logSecurityEvent(req, "LOGIN_FAILED", {
        email,
        reason: "invalid_credentials",
      });

      return fail(res, "Credencials incorrectes", 401);
    }

    const user = rows[0];

    if (user.email_verificat === 0) {
      return fail(res, "Has de verificar el teu correu abans d'iniciar sessió.", 403);
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      logSecurityEvent(req, "LOGIN_FAILED", {
        email,
        attemptedUserId: user.id,
        reason: "invalid_credentials",
      });

      return fail(res, "Credencials incorrectes", 401);
    }

    const token = jwt.sign(
      {
        id: user.id,
        rol: user.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    logSecurityEvent(req, "LOGIN_SUCCESS", {
      userId: user.id,
      rol: user.rol,
      email,
    });

    return message(res, "Login correcte", 200, {
      token,
      user: {
        id: user.id,
        nom: user.nom,
        llinatges: user.llinatges,
        email: user.email,
        rol: user.rol,
        telefon: user.telefon,
        email_verificat: user.email_verificat,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error("Error al login:", error);

    logSecurityEvent(req, "LOGIN_SERVER_ERROR", {
      email: typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null,
      errorMessage: error.message,
    });

    return fail(res, "No s'ha pogut iniciar sessió", 500);
    }
};

// OBTENIR DADES DE L'USUARI AUTENTICAT
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return fail(res, "Usuari no autenticat", 401);
    }

    if (!req.user || !req.user.id) {
      console.error("req.user no definit:", req.user);
      return fail(res, "Usuari no autenticat", 401);
    }

    const userId = req.user.id;
    console.log("USER ID getMe:", userId);

    const [rows] = await db.query(
      "SELECT id, nom, llinatges, email, rol, telefon, email_verificat, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return fail(res, "Usuari no trobat", 404);
    }

    return ok(res, rows[0]);

  } catch (error) {
    console.error("Error getMe:", error);
    return fail(res, "Error obtenint les dades de l'usuari");
  }
};

// ACTUALITZAR PERFIL
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    let { nom, llinatges, email, telefon } = req.body;

    telefon = typeof telefon === "string" ? telefon.trim() : null;

    nom = normalizeFullName(nom);
    llinatges = normalizeFullName(llinatges);
    email = normalizeEmail(email);

    const profileValidation = validateProfileData(nom, llinatges, email);
    if (profileValidation.error) {
      return fail(res, profileValidation.error, 400);
    }

    const [currentUsers] = await db.query(
      "SELECT id, nom, email, email_verificat FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (currentUsers.length === 0) {
      return fail(res, "Usuari no trobat.", 404);
    }

    const currentUser = currentUsers[0];
    const emailChanged = currentUser.email !== email;

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [email, userId]
    );

    if (existingUsers.length > 0) {
      return fail(
        res,
        "Aquest correu electrònic ja està registrat per un altre usuari.",
        409
      );
    }

    if (telefon && !/^[0-9]{9,15}$/.test(telefon)) {
      return fail(res, "El número de telèfon no és vàlid.", 400);
    }

    await db.query(
      "UPDATE users SET nom = ?, llinatges = ?, email = ?, telefon = ?, email_verificat = ? WHERE id = ?",
      [
        nom,
        llinatges,
        email,
        telefon,
        emailChanged ? 0 : currentUser.email_verificat,
        userId
      ]
    );

    if (emailChanged) {
      await createAndSendVerificationEmail({
        userId,
        nom,
        email,
        subject: "Verifica el teu nou correu - PadelBook",
      });
    }

    const [updatedRows] = await db.query(
      "SELECT id, nom, llinatges, email, rol, telefon, email_verificat, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    return message(
      res,
      emailChanged
        ? "Perfil actualitzat correctament. Hem enviat un correu de verificació a la nova adreça."
        : "Perfil actualitzat correctament",
      200,
      updatedRows[0]
    );

  } catch (error) {
    console.error("Error updateMe:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return fail(
        res,
        "Aquest correu electrònic ja està registrat per un altre usuari.",
        409
      );
    }

    return fail(res, "Error actualitzant el perfil");
  }
};

// CANVIAR CONTRASENYA
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    let { currentPassword, newPassword } = req.body;

    currentPassword =
      typeof currentPassword === "string" ? currentPassword : "";

    newPassword =
      typeof newPassword === "string" ? newPassword : "";

    if (!currentPassword || !newPassword) {
      return fail(
        res,
        "Has d'introduir la contrasenya actual i la nova contrasenya.",
        400
      );
    }

    if (currentPassword === newPassword) {
      return fail(
        res,
        "La nova contrasenya no pot ser igual que l'actual.",
        400
      );
    }

    const passwordError = validatePasswordStrength(newPassword);

    if (passwordError) {
      return fail(
        res,
        passwordError.replace("La contrasenya", "La nova contrasenya"),
        400
      );
    }

    const [rows] = await db.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return fail(res, "Usuari no trobat.", 404);
    }

    const user = rows[0];

    const match = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!match) {
      return fail(res, "La contrasenya actual no és correcta.", 401);
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [newHash, userId]
    );

    return message(res, "Contrasenya actualitzada correctament.");

  } catch (error) {
    console.error("Error changePassword:", error);
    return fail(res, "Error canviant la contrasenya.");
  }
};

// VERIFICAR EMAIL
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return fail(res, "Token no proporcionat.", 400);
    }

    const [rows] = await db.query(
      "SELECT * FROM verification_codes WHERE code = ? AND type = 'email_verification' LIMIT 1",
      [token]
    );

    if (rows.length === 0) {
      return fail(res, "Token invàlid o expirat.", 400);
    }

    const verification = rows[0];

    if (new Date(verification.expires_at) < new Date()) {
      return fail(res, "Token invàlid o expirat.", 400);
    }

    const [userRows] = await db.query(
      "SELECT id, nom, email, email_verificat FROM users WHERE id = ? LIMIT 1",
      [verification.user_id]
    );

    if (userRows.length === 0) {
      return fail(res, "Usuari no trobat.", 404);
    }

    if (userRows[0].email_verificat === 1) {
      return message(res, "Aquest compte ja estava verificat.");
    }

    await db.query(
      "UPDATE users SET email_verificat = 1 WHERE id = ?",
      [verification.user_id]
    );

    try {
      await sendEmail({
        to: userRows[0].email,
        subject: "Benvingut/da a PadelBook",
        html: buildWelcomeEmail({
          nom: userRows[0].nom,
        }),
      });
    } catch (emailError) {
      console.error("Error enviant email de benvinguda:", emailError);
    }

    return message(res, "Compte verificat correctament.");
  } catch (error) {
    console.error("Error verifyEmail:", error);
    return fail(res, "Error verificant el compte.");
  }
};

// REENVIAR VERIFICACIÓ D'EMAIL
exports.resendVerification = async (req, res) => {
  try {
    let user = null;
    const resendMode = req.body?.mode === "initial" ? "initial" : "resend";

    if (req.user?.id) {
      const [rows] = await db.query(
        "SELECT id, nom, email, email_verificat FROM users WHERE id = ? LIMIT 1",
        [req.user.id]
      );

      if (rows.length === 0) {
        return fail(res, "Usuari no trobat.", 404);
      }

      user = rows[0];
    } else {
      const email = normalizeEmail(req.body?.email);

      if (!email) {
        return fail(res, "Has d'introduir un correu electrònic.", 400);
      }

      const [rows] = await db.query(
        "SELECT id, nom, email, email_verificat FROM users WHERE email = ? LIMIT 1",
        [email]
      );

      if (rows.length === 0) {
        return fail(
          res,
          "No existeix cap compte amb aquest correu electrònic.",
          404
        );
      }

      user = rows[0];
    }

    if (user.email_verificat === 1) {
      return fail(res, "Aquest compte ja està verificat.", 400);
    }

    await createAndSendVerificationEmail({
      userId: user.id,
      nom: user.nom,
      email: user.email,
      subject:
        resendMode === "initial"
          ? "Verifica el teu compte - PadelBook"
          : "Torna a verificar el teu compte - PadelBook",
    });

    return message(
      res,
      resendMode === "initial"
        ? "T'hem enviat el correu de verificació."
        : "T'hem reenviat el correu de verificació."
    );
  } catch (error) {
    console.error("Error resendVerification:", error);
    return fail(res, "No s'ha pogut reenviar el correu de verificació.");
  }
};

exports.verifyPhone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return fail(res, "Codi no proporcionat.", 400);
    }

    const [rows] = await db.query(
      "SELECT * FROM verification_codes WHERE user_id = ? AND code = ? AND type = 'phone_verification' LIMIT 1",
      [userId, code]
    );

    if (rows.length === 0) {
      return fail(res, "Codi invàlid o expirat.", 400);
    }

    const verification = rows[0];

    if (new Date(verification.expires_at) < new Date()) {
      return fail(res, "Codi expirat.", 400);
    }

    await db.query(
      "DELETE FROM verification_codes WHERE id = ?",
      [verification.id]
    );

    return fail(res, "La verificació de telèfon no està disponible actualment.", 501);

    return message(res, "Telèfon verificat correctament.");
  } catch (error) {
    console.error("Error verifyPhone:", error);
    return fail(res, "Error verificant el telèfon.");
  }
};