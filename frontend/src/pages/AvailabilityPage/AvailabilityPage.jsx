import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner";
import { scrollToElementWithOffset } from "../../utils/helpers";
import "./AvailabilityPage.css";
import { getErrorMessage } from "../../utils/errorHandler";

const COURT_SCROLL_EXTRA_OFFSET = 18;

const getCourtScrollOffset = () => {
  const navbar = document.querySelector(".pb-navbar");
  const navbarHeight = navbar?.getBoundingClientRect().height || 74;

  return navbarHeight + COURT_SCROLL_EXTRA_OFFSET;
};

const getCourtPanelHeight = (courtElement) => {
  const slotsPanel = courtElement?.querySelector(".ap-slots-panel.is-open");
  const slotsGrid = slotsPanel?.querySelector(".ap-slots-grid");

  return slotsGrid?.getBoundingClientRect().height || 0;
};

function AvailabilityPage() {
  const hiddenDateInputRef = useRef(null);
  const topFeedbackRef = useRef(null);
  const courtRefs = useRef({});
  const repeatReservationHandledRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getToday());
  const [availability, setAvailability] = useState([]);
  const [availabilitySummary, setAvailabilitySummary] = useState({
    total_courts: 0,
    total_slots: 0,
    total_available_slots: 0,
    total_unavailable_slots: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [courtTypeFilter, setCourtTypeFilter] = useState("tots");
  const [courtEnvironmentFilter, setCourtEnvironmentFilter] = useState("totes");
  const [showAuthHelp, setShowAuthHelp] = useState(false);
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online_simulat");
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [openCourtId, setOpenCourtId] = useState(null);
  const [reservationSummary, setReservationSummary] = useState(null);
  const [reserving, setReserving] = useState(false);
  const [repeatReservationInfo, setRepeatReservationInfo] = useState(null);

  // Funció per formatar el preu, mostrant "Preu no disponible" si no hi ha valor vàlid
  const formatPrice = (value) => {
    if (value == null || value === "") return "Preu no disponible";
    return `${Number(value).toFixed(2)} €`;
  };

  // Funció per formatar la data de visualització, mostrant "Cap data" si no hi ha valor vàlid
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Cap data";

    const dateObj = new Date(dateString);
    const formatted = dateObj.toLocaleDateString("ca-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Funció per obtenir el nom del dia de la setmana en format curt, amb la primera lletra en majúscula
  const formatShortWeekday = (dateObj) => {
    const formatted = dateObj.toLocaleDateString("ca-ES", { weekday: "short" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Funció per formatar l'hora, mostrant només les hores i minuts (HH:MM)
  const formatTimeShort = (timeString) => {
    if (!timeString) return "";
    return timeString.slice(0, 5);
  };

  const formatDurationLabel = (duration) => {
    if (Number(duration) === 3) return "1h30";
    return "1h";
  };

  const getReservationEndTime = (slot, duration, courtSlots = []) => {
    if (!slot?.hora_fi) return "";

    const slotIndex = courtSlots.findIndex(
      (courtSlot) => courtSlot.time_slot_id === slot.time_slot_id
    );

    if (slotIndex === -1) return "";

    const endSlot = courtSlots[slotIndex + Number(duration) - 1];

    if (!endSlot) return "";

    return endSlot.hora_fi;
  };

  // Funció per formatar el tipus de pista, normalitzant les variants d'"individual" i mostrant "Dobles" per qualsevol altre valor
  const formatCourtType = (tipus) => {
    const normalized = String(tipus || "").trim().toLowerCase();

    if (normalized === "individual" || normalized === "individuals") {
      return "Individuals";
    }

    return "Dobles";
  };

  // Funció per formatar el tipus d'entorn de la pista, mostrant "Indoor" per coberta i "Outdoor" per descoberta
  const formatCourtEnvironment = (coberta) => {
    return Number(coberta) === 1 ? "Indoor" : "Outdoor";
  };

  const getPlayersCount = (tipus) => {
    return String(tipus || "").trim().toLowerCase() === "individual" ? 2 : 4;
  };

  const getPerPersonPrice = (slot, duration) => {
    if (Number(duration) === 3) {
      return Number(slot?.preu_persona_1h30 || 0);
    }

    return Number(slot?.preu_persona_1h || 0);
  };

  const getReservationTotalPrice = (slot, duration) => {
    const perPersonPrice = getPerPersonPrice(slot, duration);
    const playersCount = getPlayersCount(slot?.tipus);

    return perPersonPrice * playersCount;
  };

  const getSlotStatusLabel = (slot, isPastSlot, isValid = true) => {
    if (isPastSlot) return "Hora passada";
    if (slot.disponible && isValid) return "Disponible";
    if (slot.disponible && !isValid) return "No vàlida";
    if (slot.motiu_no_disponible === "manteniment") return "Manteniment";
    if (slot.motiu_no_disponible === "reserva") return "Reservada";
    return "No disponible";
  };

  const getSlotTitle = (slot, isPastSlot) => {
    if (isPastSlot) return "Hora passada";
    if (slot.disponible) return "Franja disponible";
    return slot.detall_no_disponible || "Franja no disponible";
  };

  const isVisibleStartSlot = (slot) => {
    if (!slot?.hora_inici) return false;

    return slot.hora_inici <= "20:00:00";
  };

  // Funció per determinar si la data seleccionada és anterior a la data actual
  const isPastDate = (selectedDate) => {
    return selectedDate < getToday();
  };

  const isPastTimeSlot = (slot) => {
  const today = getToday();

  // Només aplicar si és avui
  if (date !== today) return false;

  const now = new Date();

  const [hours, minutes] = slot.hora_inici.split(":").map(Number);

  const slotTime = new Date();
  slotTime.setHours(hours, minutes, 0, 0);

  return slotTime <= now;
};

  // Funció per netejar missatges d'error i èxit, i restablir l'estat relacionat amb la reserva
  const clearMessages = () => {
    setError("");
    setSuccess("");
    setShowAuthHelp(false);
    setShowVerificationHelp(false);
    setReservationSummary(null);
    setSelectedDuration(2);
  };

  // Funció per obrir el selector de data ocult, amb maneig de compatibilitat per diferents navegadors
  const handleOpenDatePicker = () => {
    const input = hiddenDateInputRef.current;
    if (!input) return;

    try {
      input.focus();

      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }

      input.click();
    } catch {
      input.focus();
      input.click();
    }
  };

  // Funció per obtenir la disponibilitat de pistes per a la data seleccionada, amb validació i maneig d'errors
  const fetchAvailability = async (selectedDate) => {
    try {
      if (!selectedDate) {
        setError("Has de seleccionar una data.");
        setAvailability([]);
        setAvailabilitySummary({
          total_courts: 0,
          total_slots: 0,
          total_available_slots: 0,
          total_unavailable_slots: 0,
        });
        return;
      }

      if (isPastDate(selectedDate)) {
        setError("No pots consultar disponibilitat en dates passades.");
        setAvailability([]);
        setAvailabilitySummary({
          total_courts: 0,
          total_slots: 0,
          total_available_slots: 0,
          total_unavailable_slots: 0,
        });
        return;
      }

      setLoading(true);
      setError("");
      setShowAuthHelp(false);
      setSelectedSlot(null);

      const response = await api.get(`/availability?date=${selectedDate}`);
      const availabilityData = response?.data?.data || {};

      const courts = Array.isArray(availabilityData?.courts)
        ? availabilityData.courts
        : [];

      const flatSlots = courts.flatMap((court) =>
        Array.isArray(court.slots) ? court.slots : []
      );

      setAvailability(flatSlots);

      setAvailabilitySummary(
        availabilityData?.summary || {
          total_courts: 0,
          total_slots: 0,
          total_available_slots: 0,
          total_unavailable_slots: 0,
        }
      );
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "No s'ha pogut carregar la disponibilitat."));
      setAvailability([]);
      setAvailabilitySummary({
        total_courts: 0,
        total_slots: 0,
        total_available_slots: 0,
        total_unavailable_slots: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Funció per manejar el canvi de data manualment, amb validació per dates passades i actualització de l'estat
  const handleManualDateChange = (newDate) => {
    if (!newDate) return;

    if (isPastDate(newDate)) {
      setError("No pots seleccionar una data anterior a avui.");
      return;
    }

    clearMessages();
    setDate(newDate);
  };

  const getSelectedCourtSlots = () => {
    if (!selectedSlot) return [];

    const selectedCourt = allCourtsData.find(
      (court) => court.court_id === selectedSlot.court_id
    );

    return selectedCourt?.slots || [];
  };

  useEffect(() => {
    if (!selectedSlot) return;

    const selectedCourtSlots = getSelectedCourtSlots();

    const slotIndex = selectedCourtSlots.findIndex(
      (courtSlot) => courtSlot.time_slot_id === selectedSlot.time_slot_id
    );

    if (slotIndex === -1) {
      setSelectedSlot(null);
      setReservationSummary(null);
      return;
    }

    setSelectedSlot(selectedCourtSlots[slotIndex]);
  }, [selectedDuration, availability, courtTypeFilter, courtEnvironmentFilter, showOnlyAvailable]);

  // Funció per manejar la reserva d'una pista, amb validació d'autenticació, maneig d'errors i actualització de l'estat de la reserva
  const handleReserve = async () => {
    if (!selectedSlot) return;

    try {
      const selectedCourtSlots = getSelectedCourtSlots();
      const slotIndex = selectedCourtSlots.findIndex(
        (courtSlot) => courtSlot.time_slot_id === selectedSlot.time_slot_id
      );
      const canReserveSelectedSlot =
        slotIndex !== -1 &&
        isSlotValidForDuration(selectedSlot, selectedCourtSlots, slotIndex);

      if (!canReserveSelectedSlot) return;

      const token = localStorage.getItem("token");

      if (!token) {
        setError("Per reservar una pista, has d'iniciar sessió.");
        setShowAuthHelp(true);
        setShowVerificationHelp(false);
        return;
      }

      clearMessages();
      setReserving(true);

      const response = await api.post("/reservations", {
        court_id: selectedSlot.court_id,
        time_slot_id: selectedSlot.time_slot_id,
        data_reserva: date,
        duration: selectedDuration,
        metode_pagament: paymentMethod,
      });

      const reservationData = response?.data?.data || null;

      const reservationEndTime = getReservationEndTime(
        selectedSlot,
        selectedDuration,
        getSelectedCourtSlots()
      );

      setSuccess(
        `Reserva confirmada a ${selectedSlot.nom_pista} (${formatTimeShort(
          selectedSlot.hora_inici
        )} - ${formatTimeShort(reservationEndTime)}) · Duració: ${formatDurationLabel(
          selectedDuration
        )}.`
      );

      setReservationSummary({
        codi_reserva: reservationData?.codi_reserva || "No disponible",
        preu_total:
          reservationData?.preu_total != null
            ? reservationData.preu_total
            : reservationData?.preu != null
            ? reservationData.preu
            : null,
        metode_pagament: reservationData?.metode_pagament || paymentMethod,
        estat_pagament: reservationData?.estat_pagament || "No disponible",
        nom_pista: selectedSlot.nom_pista,
        hora_inici: selectedSlot.hora_inici,
        hora_fi: getReservationEndTime(
          selectedSlot,
          reservationData?.duration != null
            ? Number(reservationData.duration)
            : selectedDuration,
          getSelectedCourtSlots()
        ),
        duration:
          reservationData?.duration != null
            ? Number(reservationData.duration)
            : selectedDuration,
        data_reserva: date,
      });

      setSelectedSlot(null);
      fetchAvailability(date);
      scrollToElementWithOffset(topFeedbackRef.current, 120);
    } catch (err) {
      console.error(err);

      const errorMessage = getErrorMessage(
        err,
        "No s'ha pogut crear la reserva."
      );

      if (errorMessage.toLowerCase().includes("verificar el teu correu")) {
        setError("Has de verificar el teu correu abans de reservar.");
        setShowAuthHelp(false);
        setShowVerificationHelp(true);
      } else {
        setError(errorMessage);
        setShowVerificationHelp(false);
      }

      scrollToElementWithOffset(topFeedbackRef.current, 120);
    } finally {
      setReserving(false);
    }
  };

  useEffect(() => {
    const repeatReservation = location.state?.repeatReservation;

    if (!repeatReservation || repeatReservationHandledRef.current) return;

    repeatReservationHandledRef.current = true;
    setRepeatReservationInfo(repeatReservation);
    setDate(repeatReservation.data_reserva);

    if (repeatReservation.metode_pagament) {
      setPaymentMethod(repeatReservation.metode_pagament);
    }

    setShowOnlyAvailable(false);
    setCourtTypeFilter("tots");
    setCourtEnvironmentFilter("totes");
    clearMessages();
  }, [location.state]);

  // Efecte per obtenir la disponibilitat cada vegada que canvia la data seleccionada
  useEffect(() => {
    fetchAvailability(date);
  }, [date]);

  useEffect(() => {
    if (!repeatReservationInfo || loading || availability.length === 0) return;
    if (date !== repeatReservationInfo.data_reserva) return;

    const matchedSlot = availability.find((slot) => {
      return (
        slot.nom_pista === repeatReservationInfo.nom_pista &&
        slot.hora_inici === repeatReservationInfo.hora_inici &&
        slot.hora_fi === repeatReservationInfo.hora_fi
      );
    });

    if (matchedSlot && matchedSlot.disponible) {
      setSelectedSlot(matchedSlot);
      setSuccess("");
      setError("");
      scrollToElementWithOffset(topFeedbackRef.current, 120);
    } else {
      setSelectedSlot(null);

      let repeatErrorMessage =
        "La reserva anterior s'ha carregat, però aquesta franja ja no està disponible.";

      if (matchedSlot) {
        if (matchedSlot.motiu_no_disponible === "reserva") {
          repeatErrorMessage =
            "La reserva anterior s'ha carregat, però aquesta franja ja està reservada.";
        } else if (matchedSlot.motiu_no_disponible === "manteniment") {
          repeatErrorMessage =
            "La reserva anterior s'ha carregat, però aquesta franja està bloquejada per manteniment.";
        }
      } else {
        repeatErrorMessage =
          "La reserva anterior s'ha carregat, però no s'ha pogut trobar aquesta franja exacta.";
      }

      setError(repeatErrorMessage);
      scrollToElementWithOffset(topFeedbackRef.current, 120);
    }

    setRepeatReservationInfo(null);
    navigate(location.pathname, { replace: true, state: {} });
  }, [repeatReservationInfo, availability, loading, date, navigate, location.pathname]);

  // Memorització de la disponibilitat filtrada segons l'estat de "Només disponibles"
  const filteredAvailability = useMemo(() => {
    return availability.filter((slot) => {
      const normalizedType = String(slot.tipus || "").trim().toLowerCase();
      const normalizedEnvironment =
        Number(slot.coberta) === 1 ? "indoor" : "outdoor";

      const matchesAvailability =
        !showOnlyAvailable || (slot.disponible && !isPastTimeSlot(slot));

      const matchesCourtType =
        courtTypeFilter === "tots" || normalizedType === courtTypeFilter;

      const matchesCourtEnvironment =
        courtEnvironmentFilter === "totes" ||
        normalizedEnvironment === courtEnvironmentFilter;

      return (
        matchesAvailability &&
        matchesCourtType &&
        matchesCourtEnvironment
      );
    });
  }, [availability, showOnlyAvailable, courtTypeFilter, courtEnvironmentFilter]);

  // Memorització dels propers 7 dies per a la selecció ràpida, amb formatació de la data i identificació del dia actual
  const quickDays = useMemo(() => {
    const start = new Date();
    start.setHours(12, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);

      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");

      return {
        iso: `${year}-${month}-${day}`,
        dayNumber: current.getDate(),
        weekday: formatShortWeekday(current),
        isToday: index === 0,
      };
    });
  }, []);

  // Memorització de les pistes agrupades per nom, amb ordenació dels horaris i de les pistes
  const allCourtsData = useMemo(() => {
    const map = new Map();

    availability.forEach((slot) => {
      const normalizedType = String(slot.tipus || "").trim().toLowerCase();
      const normalizedEnvironment =
        Number(slot.coberta) === 1 ? "indoor" : "outdoor";

      const matchesCourtType =
        courtTypeFilter === "tots" || normalizedType === courtTypeFilter;

      const matchesCourtEnvironment =
        courtEnvironmentFilter === "totes" ||
        normalizedEnvironment === courtEnvironmentFilter;

      if (!matchesCourtType || !matchesCourtEnvironment) return;

      if (!map.has(slot.nom_pista)) {
        map.set(slot.nom_pista, {
          nom_pista: slot.nom_pista,
          court_id: slot.court_id,
          slots: [],
        });
      }

      map.get(slot.nom_pista).slots.push(slot);
    });

    const courtsList = Array.from(map.values());

    courtsList.forEach((court) => {
      court.slots.sort((a, b) => a.hora_inici.localeCompare(b.hora_inici));
    });

    return courtsList.sort((a, b) => a.nom_pista.localeCompare(b.nom_pista));
  }, [availability, courtTypeFilter, courtEnvironmentFilter]);

  const courtsData = useMemo(() => {
    return allCourtsData.map((court) => ({
      ...court,
      slots: court.slots.filter((slot) => {
        const visibleAsStart = isVisibleStartSlot(slot);
        const matchesAvailability =
          !showOnlyAvailable || (slot.disponible && !isPastTimeSlot(slot));

        return visibleAsStart && matchesAvailability;
      }),
    }));
  }, [allCourtsData, showOnlyAvailable, date]);

  // Memorització de les estadístiques generals de disponibilitat per mostrar-les a la capçalera
  const availabilityStats = useMemo(() => {
    return {
      totalSlots: availabilitySummary.total_slots || 0,
      availableSlots: availabilitySummary.total_available_slots || 0,
      occupiedSlots: availabilitySummary.total_unavailable_slots || 0,
      totalCourts: availabilitySummary.total_courts || 0,
    };
  }, [availabilitySummary]);

  const isSlotValidForDuration = (slot, courtSlots, slotIndex) => {
    if (!slot.disponible) return false;

    const slotsNeeded = Number(selectedDuration);

    for (let i = 0; i < slotsNeeded; i += 1) {
      const currentSlot = courtSlots[slotIndex + i];

      if (!currentSlot) return false;
      if (!currentSlot.disponible) return false;
      if (isPastTimeSlot(currentSlot)) return false;
    }

    return true;
  };

  const handleCourtToggle = (courtId) => {
    const nextOpenCourtId = openCourtId === courtId ? null : courtId;

    if (!nextOpenCourtId) {
      setOpenCourtId(null);
      return;
    }

    const courtElement = courtRefs.current[nextOpenCourtId];
    let targetTop = null;

    if (courtElement) {
      const currentOpenCourtElement = openCourtId
        ? courtRefs.current[openCourtId]
        : null;
      const courtRect = courtElement.getBoundingClientRect();
      const currentOpenCourtRect =
        currentOpenCourtElement?.getBoundingClientRect();
      const closingPanelAboveTarget =
        currentOpenCourtRect &&
        currentOpenCourtElement !== courtElement &&
        currentOpenCourtRect.top < courtRect.top;

      targetTop = courtRect.top + window.scrollY - getCourtScrollOffset();

      if (closingPanelAboveTarget) {
        targetTop -= getCourtPanelHeight(currentOpenCourtElement);
      }
    }

    if (targetTop != null) {
      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      });
    }

    setOpenCourtId(nextOpenCourtId);
  };

  const handleSlotClick = (slot, isSelected) => {
    setSuccess("");
    setError("");
    setShowAuthHelp(false);
    setShowVerificationHelp(false);
    setReservationSummary(null);

    setSelectedSlot(isSelected ? null : slot);
  };

  const getCourtClosingTime = (courtSlots) => {
    return courtSlots[courtSlots.length - 1]?.hora_fi || "";
  };

  const getSelectedSlotUnavailableMessage = (
    slot,
    courtSlots,
    slotIndex,
    isPastSlot
  ) => {
    if (slotIndex === -1) {
      return "Aquesta franja ja no està disponible amb els filtres actuals.";
    }

    if (isPastSlot) {
      return "No es pot reservar aquesta hora perquè la franja ja ha passat.";
    }

    if (!slot.disponible) {
      if (slot.motiu_no_disponible === "manteniment") {
        return "No es pot reservar aquesta hora perquè la pista està en manteniment.";
      }

      if (slot.motiu_no_disponible === "reserva") {
        return "No es pot reservar aquesta hora perquè la franja ja està reservada.";
      }

      return slot.detall_no_disponible || "Aquesta franja no està disponible.";
    }

    const slotsNeeded = Number(selectedDuration);
    const closingTime = formatTimeShort(getCourtClosingTime(courtSlots));

    for (let i = 0; i < slotsNeeded; i += 1) {
      const currentSlot = courtSlots[slotIndex + i];

      if (!currentSlot) {
        return `No es pot reservar ${formatDurationLabel(
          selectedDuration
        )} a les ${formatTimeShort(
          slot.hora_inici
        )} perquè les pistes tanquen a les ${closingTime}.`;
      }

      if (isPastTimeSlot(currentSlot)) {
        return "No es pot reservar aquesta hora perquè la franja ja ha passat.";
      }

      if (!currentSlot.disponible) {
        return `No es pot reservar ${formatDurationLabel(
          selectedDuration
        )} a les ${formatTimeShort(
          slot.hora_inici
        )} perquè una de les franges del tram ja no està disponible.`;
      }
    }

    return "Aquesta franja no es pot reservar amb la duració seleccionada.";
  };

  const selectedCourtSlots = selectedSlot ? getSelectedCourtSlots() : [];
  const selectedSlotIndex = selectedSlot
    ? selectedCourtSlots.findIndex(
        (courtSlot) => courtSlot.time_slot_id === selectedSlot.time_slot_id
      )
    : -1;
  const selectedSlotIsPast = selectedSlot ? isPastTimeSlot(selectedSlot) : false;
  const selectedSlotCanReserve =
    selectedSlot &&
    selectedSlotIndex !== -1 &&
    isSlotValidForDuration(selectedSlot, selectedCourtSlots, selectedSlotIndex);
  const selectedSlotUnavailableMessage =
    selectedSlot && !selectedSlotCanReserve
      ? getSelectedSlotUnavailableMessage(
          selectedSlot,
          selectedCourtSlots,
          selectedSlotIndex,
          selectedSlotIsPast
        )
      : "";
  const selectedReservationEndTime = selectedSlot
    ? getReservationEndTime(selectedSlot, selectedDuration, selectedCourtSlots)
    : "";

  return (
    <div
      className={`ap-wrapper ${
        selectedSlot && !success ? "has-bottom-bar" : ""
      }`}
    >
      <div
        className={`ap-container ${
          selectedSlot && !success ? "ap-container--with-bottom-bar" : ""
        }`}
      >
        <header className="fade-in-up ap-hero-card">
          <div className="ap-hero-card__grid">
            <div className="ap-hero-card__main">
              <span className="pb-kicker">Disponibilitat en temps real</span>
              <h1 className="ap-hero-card__title">Reserva de pistes</h1>
              <p className="ap-hero-card__subtitle">
                Selecciona el dia, explora les pistes disponibles i confirma la teva
                reserva d’una manera molt més clara i agradable.
              </p>
            </div>

            {!loading && !error && (
              <div className="ap-hero-card__stats">
                <div className="ap-hero-card__stat">
                  <span className="ap-hero-card__stat-number">
                    {availabilityStats.totalCourts}
                  </span>
                  <span className="ap-hero-card__stat-label">Pistes</span>
                </div>

                <div className="ap-hero-card__stat">
                  <span className="ap-hero-card__stat-number">
                    {availabilityStats.availableSlots}
                  </span>
                  <span className="ap-hero-card__stat-label">Lliures</span>
                </div>

                <div className="ap-hero-card__stat">
                  <span className="ap-hero-card__stat-number">
                    {availabilityStats.occupiedSlots}
                  </span>
                  <span className="ap-hero-card__stat-label">Ocupades</span>
                </div>
              </div>
            )}
          </div>
        </header>
        <section className="ap-dates-card fade-in-up">
          <div className="ap-dates-card__top">
            <div>
              <h2 className="ap-section-title">Tria la data que t’interessa</h2>
              <p className="ap-section-text">
                Pots reservar ràpidament des dels propers dies o obrir el calendari
                per escollir una altra data.
              </p>
            </div>

            <div className="ap-stats-chips">
              <span className="ap-stats-chip">
                {availabilityStats.totalCourts} pistes
              </span>
              <span className="ap-stats-chip ap-stats-chip--green">
                {availabilityStats.availableSlots} lliures
              </span>
              <span className="ap-stats-chip ap-stats-chip--red">
                {availabilityStats.occupiedSlots} ocupades
              </span>
            </div>
          </div>

          <div className="ap-dates-scroll">
            {quickDays.map((day) => (
              <button
                key={day.iso}
                onClick={() => handleManualDateChange(day.iso)}
                className={`ap-day-btn ${date === day.iso ? "is-active" : ""}`}
              >
                <span className="ap-day-name">{day.weekday}</span>
                <span className="ap-day-num">{day.dayNumber}</span>
                {day.isToday && <span className="ap-day-today">Avui</span>}
              </button>
            ))}

            <div className="ap-date-picker">
              <button
                type="button"
                onClick={handleOpenDatePicker}
                className="ap-day-btn ap-day-btn--cal"
              >
                <span className="ap-day-name">Més</span>
                <span className="ap-day-num">📅</span>
                <span className="ap-day-today">Calendari</span>
              </button>

              <input
                ref={hiddenDateInputRef}
                type="date"
                value={date}
                min={getToday()}
                onChange={(e) => handleManualDateChange(e.target.value)}
                className="ap-hidden-date"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="ap-legend">
            <span className="ap-legend__item">
              <span className="ap-legend__dot ap-legend__dot--available"></span>
              Disponible
            </span>
            <span className="ap-legend__item">
              <span className="ap-legend__dot ap-legend__dot--reserved"></span>
              Reservada
            </span>
            <span className="ap-legend__item">
              <span className="ap-legend__dot ap-legend__dot--maintenance"></span>
              Manteniment
            </span>
            <span className="ap-legend__item">
              <span className="ap-legend__dot ap-legend__dot--past"></span>
              Hora passada
            </span>
          </div>

          <div className="ap-date-filters">
            <div className="ap-selected-date-block">
              <span className="ap-selected-date-label">Data seleccionada</span>
              <span className="ap-selected-date-text">{formatDisplayDate(date)}</span>
            </div>

            <div className="ap-filters-inline">
              <div className="ap-type-filter">
                <label htmlFor="courtTypeFilter" className="ap-type-filter__label">
                  Tipus de pista
                </label>

                <select
                  id="courtTypeFilter"
                  className="ap-type-filter__select"
                  value={courtTypeFilter}
                  onChange={(e) => setCourtTypeFilter(e.target.value)}
                >
                  <option value="tots">Totes</option>
                  <option value="dobles">Dobles</option>
                  <option value="individual">Individuals</option>
                </select>
              </div>

              <div className="ap-type-filter">
                <label
                  htmlFor="courtEnvironmentFilter"
                  className="ap-type-filter__label"
                >
                  Entorn
                </label>

                <select
                  id="courtEnvironmentFilter"
                  className="ap-type-filter__select"
                  value={courtEnvironmentFilter}
                  onChange={(e) => setCourtEnvironmentFilter(e.target.value)}
                >
                  <option value="totes">Totes</option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                </select>
              </div>

              <label className="ap-filter-label">
                <input
                  type="checkbox"
                  checked={showOnlyAvailable}
                  onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                />
                Només disponibles
              </label>
            </div>
          </div>
        </section>

        <div ref={topFeedbackRef}></div>

        {error && (
          <div className="pb-feedback pb-feedback--error fade-in">
            <p className="pb-feedback__text">{error}</p>
          </div>
        )}

        {showAuthHelp && (
          <div className="pb-feedback pb-feedback--info fade-in">
            <p>Necessites iniciar sessió per reservar pistes.</p>
            <div className="ap-alert-actions">
              <Link to="/login" className="btn btn-primary btn-sm">
                Iniciar sessió
              </Link>
              <Link to="/register" className="btn btn-light btn-sm">
                Crear compte
              </Link>
            </div>
          </div>
        )}

        {showVerificationHelp && (
          <div className="pb-feedback pb-feedback--info fade-in">
            <p>
              El teu compte encara no té el correu verificat. Verifica'l o
              reenvia el correu des del teu perfil abans de reservar.
            </p>
            <div className="ap-alert-actions">
              <Link to="/my-account" className="btn btn-primary btn-sm">
                Anar al meu perfil
              </Link>
              <Link to="/login" className="btn btn-light btn-sm">
                Tornar a login
              </Link>
            </div>
          </div>
        )}

        {success && reservationSummary && (
          <div className="pb-feedback pb-feedback--success ap-success-feedback fade-in fade-in-up">
            <div className="ap-success-header">
              <h3>🎉 Reserva Confirmada</h3>
              <span className="ap-success-code">{reservationSummary.codi_reserva}</span>
            </div>

            <div className="ap-success-details">
              <div>
                <span>Pista:</span>
                <strong>{reservationSummary.nom_pista}</strong>
              </div>
              <div>
                <span>Data:</span>
                <strong>{formatDisplayDate(reservationSummary.data_reserva)}</strong>
              </div>
              <div>
                <span>Hora:</span>
                <strong>
                  {formatTimeShort(reservationSummary.hora_inici)} -{" "}
                  {formatTimeShort(reservationSummary.hora_fi)}
                </strong>
              </div>
              <div>
                <span>Duració:</span>
                <strong>{formatDurationLabel(reservationSummary.duration)}</strong>
              </div>
              <div>
                <span>Pagament:</span>
                <strong>
                  {reservationSummary.metode_pagament === "online_simulat"
                    ? "Pagament online"
                    : "Pagament al club"}
                </strong>
              </div>
              <div>
                <span>Total reserva:</span>
                <strong>{formatPrice(reservationSummary.preu_total)}</strong>
              </div>
            </div>

            <div className="ap-success-actions">
              <Link to="/my-reservations" className="btn btn-success">
                Veure les meves reserves
              </Link>
              <button onClick={clearMessages} className="btn btn-outline-success">
                Nova reserva
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="ap-loading">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="ap-court-help">
              <span className="ap-court-help__icon">▾</span>
              <span>Desplega una pista per veure les hores disponibles.</span>
            </div>

            <div className="ap-courts-grid">
            {courtsData.length === 0 && !error && !success ? (
              <div className="ap-empty-state">
                <span>🎾</span>

                {availability.length > 0 && filteredAvailability.length === 0 ? (
                  <>
                    <p>No hi ha resultats amb els filtres seleccionats.</p>
                    <small>
                      Prova de llevar filtres o desactivar “Només disponibles”.
                    </small>
                  </>
                ) : availability.length > 0 && availabilityStats.occupiedSlots > 0 ? (
                  <>
                    <p>No hi ha cap franja reservable per aquest dia.</p>
                    <small>
                      Totes les franges estan ocupades o bloquejades.
                    </small>
                  </>
                ) : (
                  <>
                    <p>No hi ha dades de disponibilitat per aquest dia.</p>
                    <small>
                      Prova una altra data o torna-ho a intentar més tard.
                    </small>
                  </>
                )}
              </div>
            ) : (
              courtsData
                .filter((court) => court.slots.length > 0)
                .map((court, courtIndex) => {
                const availableCount = court.slots.filter((s) => s.disponible).length;
                const reservedCount = court.slots.filter(
                  (s) => !s.disponible && s.motiu_no_disponible === "reserva"
                ).length;
                const maintenanceCount = court.slots.filter(
                  (s) => !s.disponible && s.motiu_no_disponible === "manteniment"
                ).length;

                return (
                  <div
                    key={court.court_id}
                    ref={(element) => {
                      courtRefs.current[court.court_id] = element;
                    }}
                    className={`ap-court-card fade-in-up ap-delay-${(courtIndex % 3) + 1} ${
                      openCourtId === court.court_id ? "is-open" : ""
                    }`}
                  >
                    <div className="ap-court-header">
                      <div>
                        <span className="ap-court-eyebrow">Pista</span>
                        <h3 className="ap-court-name">{court.nom_pista}</h3>
                        <p className="ap-court-summary">
                          {availableCount} lliures · {reservedCount} reservades · {maintenanceCount} manteniment
                        </p>
                      </div>

                      <div className="ap-court-badges">
                        <span
                          className={`ap-court-meta ${
                            formatCourtType(court.slots[0]?.tipus) === "Individuals"
                              ? "ap-court-meta--individual"
                              : "ap-court-meta--dobles"
                          }`}
                        >
                          {formatCourtType(court.slots[0]?.tipus)}
                        </span>

                        <span
                          className={`ap-court-meta ${
                            formatCourtEnvironment(court.slots[0]?.coberta) === "Indoor"
                              ? "ap-court-meta--indoor"
                              : "ap-court-meta--outdoor"
                          }`}
                        >
                          {formatCourtEnvironment(court.slots[0]?.coberta)}
                        </span>

                        <button
                          onClick={() => handleCourtToggle(court.court_id)}
                          className={`ap-court-toggle-btn ${openCourtId === court.court_id ? "is-open" : ""}`}
                          aria-label={openCourtId === court.court_id ? "Amagar horaris" : "Veure horaris"}
                        >
                          <span className="ap-court-help__icon">▾</span>
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const allCourtSlots =
                        allCourtsData.find((c) => c.court_id === court.court_id)?.slots || [];

                      return (
                        <div
                          className={`ap-slots-panel ${
                            openCourtId === court.court_id ? "is-open" : ""
                          }`}
                        >
                          <div className="ap-slots-grid">
                          {court.slots.map((slot) => {
                            const isSelected =
                              selectedSlot?.time_slot_id === slot.time_slot_id &&
                              selectedSlot?.court_id === slot.court_id;

                            const isPastSlot = isPastTimeSlot(slot);

                            const slotIndex = allCourtSlots.findIndex(
                              (courtSlot) => courtSlot.time_slot_id === slot.time_slot_id
                            );

                        const isValid = isSlotValidForDuration(
                          slot,
                          allCourtSlots,
                          slotIndex
                        );

                        const isSoftAvailable =
                          !isPastSlot &&
                          slot.disponible &&
                          !isSelected &&
                          !isValid;

                        return (
                          <div
                            key={slot.time_slot_id}
                            className="ap-slot-item"
                          >
                            <button
                              onClick={() => handleSlotClick(slot, isSelected)}
                              title={getSlotTitle(slot, isPastSlot)}
                              className={`ap-slot-pill ${
                                isPastSlot
                                  ? "is-past"
                                  : slot.disponible
                                  ? isSelected
                                    ? "is-selected"
                                    : isSoftAvailable
                                    ? "is-available-soft"
                                    : "is-available"
                                  : slot.motiu_no_disponible === "manteniment"
                                  ? "is-maintenance"
                                  : "is-booked"
                              }`}
                            >
                              <span className="ap-slot-time">
                                {formatTimeShort(slot.hora_inici)}
                              </span>

                              <span className="ap-slot-status">
                                {getSlotStatusLabel(slot, isPastSlot, isValid)}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
            </div>
          </>
        )}
      </div>

      {selectedSlot && !success && (
        <div
          className={`ap-floating-action slide-up ${
            selectedSlotCanReserve ? "" : "ap-floating-action--disabled"
          }`}
        >
          <div className="ap-floating-inner">
            <button
              type="button"
              className="ap-floating-close"
              onClick={() => {
                setSelectedSlot(null);
                setReservationSummary(null);
              }}
              aria-label="Tancar selecció"
            >
              ×
            </button>
            <div className="ap-floating-info">
              <span className="ap-floating-court">{selectedSlot.nom_pista}</span>

              <strong className="ap-floating-time">
                {formatDisplayDate(date)} • {formatTimeShort(selectedSlot.hora_inici)}
                {selectedReservationEndTime ? (
                  <> a {formatTimeShort(selectedReservationEndTime)}</>
                ) : (
                  <> · {formatDurationLabel(selectedDuration)}</>
                )}
              </strong>

              <div className="ap-floating-price-group">
                <span className="ap-floating-price">
                  {formatPrice(getPerPersonPrice(selectedSlot, selectedDuration))} / persona
                </span>
                <span className="ap-floating-total">
                  Total reserva: {formatPrice(
                    getReservationTotalPrice(selectedSlot, selectedDuration)
                  )}
                </span>
              </div>

              <p
                className={`ap-floating-feedback ${
                  selectedSlotCanReserve ? "is-empty" : ""
                }`}
                aria-live="polite"
              >
                {selectedSlotCanReserve ? "\u00a0" : selectedSlotUnavailableMessage}
              </p>
            </div>

            <div className="ap-floating-controls">
              <div className="ap-payment-field">
                <span className="ap-payment-label">Duració</span>

                <div className="ap-payment-toggle">
                  <button
                    type="button"
                    className={`ap-payment-option ${
                      selectedDuration === 2 ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedDuration(2)}
                    disabled={reserving}
                  >
                    1h
                  </button>

                  <button
                    type="button"
                    className={`ap-payment-option ${
                      selectedDuration === 3 ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedDuration(3)}
                    disabled={reserving}
                  >
                    1h30
                  </button>
                </div>
              </div>

              <div className="ap-payment-field">
                <span className="ap-payment-label">Mètode de pagament</span>

                <div className="ap-payment-toggle">
                  <button
                    type="button"
                    className={`ap-payment-option ${
                      paymentMethod === "online_simulat" ? "is-active" : ""
                    }`}
                    onClick={() => setPaymentMethod("online_simulat")}
                    disabled={reserving || !selectedSlotCanReserve}
                  >
                    Pagament online
                  </button>

                  <button
                    type="button"
                    className={`ap-payment-option ${
                      paymentMethod === "al_club" ? "is-active" : ""
                    }`}
                    onClick={() => setPaymentMethod("al_club")}
                    disabled={reserving || !selectedSlotCanReserve}
                  >
                    Pagament al club
                  </button>
                </div>
              </div>

              <button
                onClick={handleReserve}
                disabled={reserving || !selectedSlotCanReserve}
                className={`btn btn-primary ap-reserve-btn ${
                  reserving ? "ap-reserve-btn--loading" : ""
                }`}
                aria-busy={reserving}
              >
                {reserving ? "Reservant..." : "Confirmar reserva"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AvailabilityPage;
