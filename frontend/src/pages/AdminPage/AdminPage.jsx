import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import CreateCourtForm from "../../components/CreateCourtForm/CreateCourtForm";
import CourtCard from "../../components/CourtCard/CourtCard";
import AdminReservationsTable from "../../components/AdminReservationsTable/AdminReservationsTable";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner";
import {
  scrollToElementWithOffset,
  normalizeCollectionResponse,
} from "../../utils/helpers";
import "./AdminPage.css";

function AdminPage() {

  const emptyCourt = {
    nom_pista: "",
    tipus: "dobles",
    coberta: 1,
    estat: "disponible",
    descripcio: "",
    preu_persona_1h: "",
    preu_persona_1h30: "",
  };

  const editSectionRef = useRef(null);
  const maintenanceEditorRef = useRef(null);
  const dashboardSectionRef = useRef(null);
  const reservationsSectionRef = useRef(null);
  const usersSectionRef = useRef(null);
  const courtsSectionRef = useRef(null);
  const feedbackRef = useRef(null);
  const userDetailCardRef = useRef(null);
  const userRowRefs = useRef({});
  const hasLoadedInitialDataRef = useRef(false);
  const refreshAllAdminDataRef = useRef(null);

  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [courts, setCourts] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState(null);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    court_id: "",
    time_slot_id: "",
    data_bloqueig: "",
    motiu: "",
  });

  const [overviewStats, setOverviewStats] = useState({});
  const [statsByCourt, setStatsByCourt] = useState([]);
  const [statsByTimeslot, setStatsByTimeslot] = useState([]);
  const [statsByDate, setStatsByDate] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState("");

  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("success");
  const [feedbackAction, setFeedbackAction] = useState(null);

  const [confirmingCourtId, setConfirmingCourtId] = useState(null);
  const [confirmingMaintenanceId, setConfirmingMaintenanceId] = useState(null);
  const [deletingCourtId, setDeletingCourtId] = useState(null);
  const [creatingCourt, setCreatingCourt] = useState(false);
  const [editingCourtId, setEditingCourtId] = useState(null);
  const [highlightedCourtId, setHighlightedCourtId] = useState(null);
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState(null);
  const [confirmingUserRoleId, setConfirmingUserRoleId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [newCourt, setNewCourt] = useState(emptyCourt);

  const storedUser = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  }, []);

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("tots");

  const [courtSearch, setCourtSearch] = useState("");
  const [courtStatusFilter, setCourtStatusFilter] = useState("totes");
  const [courtTypeFilter, setCourtTypeFilter] = useState("tots");
  const [showAllCourtCards, setShowAllCourtCards] = useState(false);

  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [showCreateMaintenanceForm, setShowCreateMaintenanceForm] = useState(false);
  const [maintenancePeriodFilter, setMaintenancePeriodFilter] = useState("tots");
  const [showAllMaintenanceBlocks, setShowAllMaintenanceBlocks] = useState(false);

  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllCourtStats, setShowAllCourtStats] = useState(false);
  const [showAllTimeslotStats, setShowAllTimeslotStats] = useState(false);
  const [showAllDateStats, setShowAllDateStats] = useState(false);

  const [logActionFilter, setLogActionFilter] = useState("totes");
  const [logAdminFilter, setLogAdminFilter] = useState("tots");
  const [logSearch, setLogSearch] = useState("");

  const handleViewUserDetail = async (userId) => {
    if (selectedUser?.id === userId) {
      window.setTimeout(() => {
        scrollToUserRow(userId);
      }, 40);

      window.setTimeout(() => {
        setSelectedUser(null);
      }, 140);

      return;
    }

    try {
      setLoadingUserDetail(true);

      const res = await api.get(`/admin/users/${userId}`);

      setSelectedUser(res.data.data);

      window.setTimeout(() => {
        scrollToUserDetailCard();
      }, 140);
    } catch (err) {
      console.error(err);

      const errorMsg =
        err.response?.data?.error || "Error carregant detall d'usuari";

      showFeedbackMessage(errorMsg, "error");
    } finally {
      setLoadingUserDetail(false);
    }
  };

  const handleDeleteMaintenance = async (id) => {
    try {
      await api.delete(`/admin/maintenance/${id}`);

      setConfirmingMaintenanceId(null);
      showFeedbackMessage("Manteniment eliminat correctament");
      await refreshAllAdminData();
    } catch (err) {
      console.error(err);

      const errorMsg =
        err.response?.data?.error || "Error eliminant manteniment";

      showFeedbackMessage(errorMsg, "error");
    }
  };
  // Detectar canvis en la mida de la finestra per adaptar la vista
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Funció per desplaçar-se a una targeta de pista específica i destacar-la temporalment
  const scrollToUserRow = (userId) => {
    const row = userRowRefs.current[userId];
    if (!row) return;

    scrollToElementWithOffset(row, 180);
  };

  const scrollToUserDetailCard = () => {
    if (!userDetailCardRef.current) return;

    scrollToElementWithOffset(userDetailCardRef.current, 190);
  };

  const scrollToCourtCard = (courtId) => {
    if (!courtId) return;

    setActiveTab("courts");
    setHighlightedCourtId(courtId);

    window.setTimeout(() => {
      const courtCard = document.getElementById(`admin-court-card-${courtId}`);

      if (courtCard) {
        scrollToElementWithOffset(courtCard, 170);
      }
    }, 140);

    window.setTimeout(() => {
      setHighlightedCourtId((currentCourtId) =>
        currentCourtId === courtId ? null : currentCourtId
      );
    }, 2200);
  };

  // Funció per normalitzar les dades de visió general del dashboard, amb suport per diferents formats de resposta
  const normalizeOverview = (data, reservationsSource = [], courtsSource = []) => {
    return {
      totalReservations:
        data?.totalReservations ??
        data?.total_reservations ??
        data?.reservesTotals ??
        data?.reservations ??
        reservationsSource.length ??
        0,

      activeReservations:
        data?.activeReservations ??
        data?.active_reservations ??
        data?.reservesActives ??
        reservationsSource.filter((reservation) => {
          const status = (reservation.estat || "").toLowerCase();
          return status === "activa" || status === "active";
        }).length,

      cancelledReservations:
        data?.cancelledReservations ??
        data?.cancelled_reservations ??
        data?.canceledReservations ??
        data?.canceled_reservations ??
        data?.reservesCancelades ??
        reservationsSource.filter((reservation) => {
          const status = (reservation.estat || "").toLowerCase();
          return status !== "activa" && status !== "active";
        }).length,

      totalCourts:
        data?.totalCourts ??
        data?.total_courts ??
        data?.pistesTotals ??
        courtsSource.length ??
        0,

      availableCourts:
        data?.availableCourts ??
        data?.available_courts ??
        data?.pistesDisponibles ??
        courtsSource.filter((court) => court.estat === "disponible").length,

      coveredCourts:
        data?.coveredCourts ??
        data?.covered_courts ??
        data?.pistesCobertes ??
        courtsSource.filter((court) => Number(court.coberta) === 1).length,
    };
  };

  // Funcions per normalitzar les dades de les estadístiques per pista, franja i data, amb suport per diferents formats de resposta
  const normalizeCourtStat = (item, index) => ({
    id: item?.id ?? item?.court_id ?? item?.pista_id ?? `court-${index}`,
    label:
      item?.nom_pista ??
      item?.court_name ??
      item?.court ??
      item?.name ??
      item?.pista ??
      `Pista ${index + 1}`,
    value:
      Number(
        item?.totalReservations ??
          item?.activeReservations ??
          item?.total ??
          item?.count ??
          item?.reservations ??
          item?.total_reserves ??
          item?.value ??
          0
      ) || 0,
    activeReservations: Number(item?.activeReservations ?? 0) || 0,
    cancelledReservations: Number(item?.cancelledReservations ?? 0) || 0,
  });

  // Normalització de les estadístiques per franja horària, amb suport per diferents formats de resposta
  const normalizeTimeslotStat = (item, index) => ({
    id:
      item?.id ??
      item?.time_slot_id ??
      item?.slot_id ??
      item?.franja_id ??
      `slot-${index}`,
    label:
      item?.label ??
      (item?.hora_inici && item?.hora_fi
        ? `${formatTimeOnly(item.hora_inici)} - ${formatTimeOnly(item.hora_fi)}`
        : item?.hora ??
          item?.time_slot ??
          item?.slot ??
          item?.franja ??
          `Franja ${index + 1}`),
    value:
      Number(
        item?.totalReservations ??
          item?.activeReservations ??
          item?.total ??
          item?.count ??
          item?.reservations ??
          item?.total_reserves ??
          item?.value ??
          0
      ) || 0,
    activeReservations: Number(item?.activeReservations ?? 0) || 0,
    cancelledReservations: Number(item?.cancelledReservations ?? 0) || 0,
  });

  // Normalització de les estadístiques per data, amb suport per diferents formats de resposta
  const normalizeDateStat = (item, index) => {
    const rawDate =
      item?.data_reserva ??
      item?.data ??
      item?.date ??
      item?.label ??
      null;

    return {
      id: item?.id ?? rawDate ?? `date-${index}`,
      rawDate,
      label: rawDate ? formatDateOnly(rawDate) : `Data ${index + 1}`,
      value:
        Number(
          item?.totalReservations ??
            item?.activeReservations ??
            item?.total ??
            item?.count ??
            item?.reservations ??
            item?.total_reserves ??
            item?.value ??
            0
        ) || 0,
      activeReservations: Number(item?.activeReservations ?? 0) || 0,
      cancelledReservations: Number(item?.cancelledReservations ?? 0) || 0,
    };
  };

  // Funció per normalitzar les entrades del registre d'activitat recent, amb suport per diferents formats de resposta i estructures de dades
  const normalizeLogItem = (log, index) => ({
    id: log?.id ?? `log-${index}`,
    action:
      log?.accio ??
      log?.action ??
      log?.tipus ??
      log?.type ??
      "ACCIO_DESCONEGUDA",

    adminName:
      log?.admin_nom ??
      log?.adminName ??
      log?.admin ??
      log?.nom_admin ??
      log?.user_name ??
      "Administrador",

    adminId: log?.admin_id ?? log?.adminId ?? log?.user_id ?? null,

    details:
      log?.detalls ??
      log?.details ??
      log?.descripcio ??
      log?.description ??
      "",

    entity:
      log?.entitat ??
      log?.entity ??
      null,

    entityId:
      log?.entitat_id ??
      log?.entityId ??
      null,

    createdAt:
      log?.created_at ??
      log?.createdAt ??
      log?.data ??
      log?.date ??
      null,
  });

  const _formatLogDescription = (log) => {
    const action = log?.accio || log?.action;

    switch (action) {
      case "CREATE_COURT":
        return `Ha creat una nova pista`;

      case "UPDATE_COURT":
        return `Ha editat una pista`;

      case "DELETE_COURT":
        return `Ha eliminat una pista`;

      case "CREATE_MAINTENANCE":
        return `Ha creat un bloqueig de manteniment`;

      default:
        return log?.detalls || "Acció administrativa";
    }
  };

  const normalizeMaintenanceBlock = (item, index) => ({
    id: item?.id ?? `maintenance-${index}`,
    courtId: item?.court_id ?? item?.courtId ?? null,
    timeSlotId: item?.time_slot_id ?? item?.timeSlotId ?? null,
    date: item?.data_bloqueig ?? item?.date ?? "",
    reason: item?.motiu ?? item?.reason ?? "",
    createdAt: item?.created_at ?? item?.createdAt ?? null,
    courtName: item?.nom_pista ?? item?.court_name ?? item?.courtName ?? "Pista",
    courtType: item?.tipus ?? item?.court_type ?? item?.courtType ?? "",
    covered: Number(item?.coberta ?? item?.covered ?? 0) === 1,
    courtStatus: item?.estat_pista ?? item?.court_status ?? item?.courtStatus ?? "",
    startTime: item?.hora_inici ?? item?.start_time ?? item?.startTime ?? "",
    endTime: item?.hora_fi ?? item?.end_time ?? item?.endTime ?? "",
  });

  // Funció per mostrar missatges de feedback a l'usuari, amb opcions de tipus i accions associades, i desplaçament automàtic al missatge
  const showFeedbackMessage = (message, type = "success", action = null) => {
    setFeedback(message);
    setFeedbackType(type);
    setFeedbackAction(action);

    setTimeout(() => {
      setFeedback("");
      setFeedbackAction(null);
    }, 5000);

    setTimeout(() => {
      scrollToElementWithOffset(feedbackRef.current, 120);
    }, 60);
  };

  const isSessionExpiredError = (err) => err?.response?.status === 401;

  // Funció per carregar les dades del dashboard administratiu, incloent estadístiques i registre d'activitat recent, amb suport per diferents formats de resposta i opcions de dades personalitzades
  const fetchDashboardData = async (
    reservationsSource = reservations,
    courtsSource = courts
  ) => {
    try {
      setLoadingDashboard(true);

      const [overviewRes, byCourtRes, byTimeslotRes, byDateRes, logsRes] =
        await Promise.all([
          api.get("/admin/stats/overview"),
          api.get("/admin/stats/by-court"),
          api.get("/admin/stats/by-timeslot"),
          api.get("/admin/stats/by-date"),
          api.get("/admin/logs?page=1&limit=8"),
        ]);

      setOverviewStats(
        normalizeOverview(
          overviewRes.data?.data || {},
          reservationsSource,
          courtsSource
        )
      );
      setStatsByCourt(
        normalizeCollectionResponse(byCourtRes.data).map(normalizeCourtStat)
      );
      setStatsByTimeslot(
        normalizeCollectionResponse(byTimeslotRes.data).map(normalizeTimeslotStat)
      );
      setStatsByDate(
        normalizeCollectionResponse(byDateRes.data).map(normalizeDateStat)
      );
      setAdminLogs(
        normalizeCollectionResponse(logsRes.data).map(normalizeLogItem)
      );
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      showFeedbackMessage(
        "No s'han pogut carregar algunes dades del dashboard administratiu.",
        "error"
      );
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Funció per carregar les dades d'administració inicials, incloent reserves i pistes, amb suport per diferents formats de resposta i normalització de dades
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError("");

      const [usersRes, reservationsRes, courtsRes, timeSlotsRes, maintenanceRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/reservations"),
        api.get("/courts"),
        api.get("/time-slots"),
        api.get("/admin/maintenance"),
      ]);

      const normalizedUsers = normalizeCollectionResponse(usersRes.data);
      const normalizedReservations = normalizeCollectionResponse(
        reservationsRes.data
      );
      const normalizedCourts = normalizeCollectionResponse(courtsRes.data);
      const normalizedTimeSlots = normalizeCollectionResponse(timeSlotsRes.data);
      const normalizedMaintenance = normalizeCollectionResponse(
        maintenanceRes.data
      ).map(normalizeMaintenanceBlock);

      setUsers(normalizedUsers);
      setReservations(normalizedReservations);
      setCourts(normalizedCourts);
      setTimeSlots(normalizedTimeSlots);
      setMaintenanceBlocks(normalizedMaintenance);

      return {
        users: normalizedUsers,
        reservations: normalizedReservations,
        courts: normalizedCourts,
        timeSlots: normalizedTimeSlots,
        maintenanceBlocks: normalizedMaintenance,
      };
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return { users: [], reservations: [], courts: [], maintenanceBlocks: [] };
      }

      setError("Error carregant dades d'administració");
      return { users: [], reservations: [], courts: [], maintenanceBlocks: [] };
    } finally {
      setLoading(false);
    }
  };

  // Funció per refrescar totes les dades d'administració i actualitzar el dashboard, utilitzada després de canvis en pistes o reserves per garantir que les dades mostrades estiguin actualitzades i consistents
  const refreshAllAdminData = async () => {
    const baseData = await fetchAdminData();

    const safeReservations = Array.isArray(baseData?.reservations)
      ? baseData.reservations
      : [];
    const safeCourts = Array.isArray(baseData?.courts) ? baseData.courts : [];

    setOverviewStats(normalizeOverview({}, safeReservations, safeCourts));
    await fetchDashboardData(safeReservations, safeCourts);
  };

  refreshAllAdminDataRef.current = refreshAllAdminData;

  // Funció per reiniciar el formulari de creació/edició de pista a l'estat inicial, netejant les dades i sortint del mode d'edició si s'estava editant una pista
  const resetCourtForm = () => {
    setNewCourt(emptyCourt);
    setEditingCourtId(null);
  };

  // Funció per reiniciar els filtres de cerca i filtrat de pistes a l'estat inicial, mostrant totes les pistes sense cap filtre aplicat
  const resetCourtFilters = () => {
    setCourtSearch("");
    setCourtStatusFilter("totes");
    setCourtTypeFilter("tots");
  };

  const resetMaintenanceFilters = () => {
    setMaintenanceSearch("");
    setMaintenancePeriodFilter("tots");
  };

  const resetMaintenanceEditor = () => {
    setEditingMaintenanceId(null);
    setSavingMaintenance(false);
    setMaintenanceForm({
      court_id: "",
      hora_inici: "",
      hora_fi: "",
      data_bloqueig: "",
      motiu: "",
    });
  };

  const handleStartEditMaintenance = (block) => {
    setEditingMaintenanceId(block.id);
    setConfirmingMaintenanceId(null);
    setMaintenanceForm({
      court_id: String(block.courtId ?? ""),
      hora_inici: block.startTime ? String(block.startTime).slice(0, 5) : "",
      hora_fi: block.endTime ? String(block.endTime).slice(0, 5) : "",
      data_bloqueig: block.date ? String(block.date).slice(0, 10) : "",
      motiu: block.reason || "",
    });

    setTimeout(() => {
      scrollToElementWithOffset(maintenanceEditorRef.current, 120);
    }, 80);
  };

  const handleMaintenanceFormChange = (field, value) => {
    setMaintenanceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveMaintenance = async () => {
    try {
      if (!editingMaintenanceId) return;

      if (!maintenanceForm.data_bloqueig || maintenanceForm.data_bloqueig < todayString) {
        showFeedbackMessage("No pots seleccionar una data anterior a avui.", "error");
        return;
      }

      if (!maintenanceForm.hora_inici || !maintenanceForm.hora_fi) {
        showFeedbackMessage("Has de seleccionar una hora d'inici i una hora final.", "error");
        return;
      }

      if (maintenanceForm.hora_inici >= maintenanceForm.hora_fi) {
        showFeedbackMessage("L'hora final ha de ser posterior a l'hora d'inici.", "error");
        return;
      }

      setSavingMaintenance(true);

      await api.put(`/admin/maintenance/${editingMaintenanceId}`, {
        court_id: Number(maintenanceForm.court_id),
        hora_inici: maintenanceForm.hora_inici,
        hora_fi: maintenanceForm.hora_fi,
        data_bloqueig: maintenanceForm.data_bloqueig,
        motiu: maintenanceForm.motiu,
      });

      showFeedbackMessage("Manteniment actualitzat correctament");
      resetMaintenanceEditor();
      await refreshAllAdminData();
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      const errorMsg =
        err.response?.data?.error ||
        "Error actualitzant manteniment";

      showFeedbackMessage(errorMsg, "error");
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleCreateMaintenance = async () => {
    try {
      if (!maintenanceForm.court_id) {
        showFeedbackMessage("Has de seleccionar una pista.", "error");
        return;
      }

      if (!maintenanceForm.hora_inici || !maintenanceForm.hora_fi) {
        showFeedbackMessage("Has de seleccionar una hora d'inici i una hora final.", "error");
        return;
      }

      if (maintenanceForm.hora_inici >= maintenanceForm.hora_fi) {
        showFeedbackMessage("L'hora final ha de ser posterior a l'hora d'inici.", "error");
        return;
      }

      if (!maintenanceForm.data_bloqueig) {
        showFeedbackMessage("Has de seleccionar una data.", "error");
        return;
      }

      if (maintenanceForm.data_bloqueig < todayString) {
        showFeedbackMessage("No pots seleccionar una data anterior a avui.", "error");
        return;
      }

      if (!maintenanceForm.motiu.trim()) {
        showFeedbackMessage("Has d'indicar el motiu del manteniment.", "error");
        return;
      }

      setSavingMaintenance(true);

      await api.post("/admin/maintenance", {
        court_id: Number(maintenanceForm.court_id),
        hora_inici: maintenanceForm.hora_inici,
        hora_fi: maintenanceForm.hora_fi,
        data_bloqueig: maintenanceForm.data_bloqueig,
        motiu: maintenanceForm.motiu,
      });

      showFeedbackMessage("Manteniment creat correctament");
      resetMaintenanceEditor();
      await refreshAllAdminData();
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      const errorMsg =
        err.response?.data?.error ||
        "Error creant manteniment";

      showFeedbackMessage(errorMsg, "error");
    } finally {
      setSavingMaintenance(false);
    }
  };

  // Funció per gestionar la creació o actualització d'una pista, enviant les dades al backend i actualitzant la vista en conseqüència, amb suport per diferents formats de resposta i missatges de feedback contextuals
  const handleCreateOrUpdateCourt = async (e) => {
    e.preventDefault();

    try {
      setCreatingCourt(true);

      const payload = {
        ...newCourt,
        coberta: Number(newCourt.coberta),
      };

      if (editingCourtId) {
        await api.put(`/admin/courts/${editingCourtId}`, payload);
        await refreshAllAdminData();

        showFeedbackMessage("La pista s'ha actualitzat correctament.", "success", {
          label: "Veure pista editada",
          onClick: () => scrollToCourtCard(editingCourtId),
        });

        resetCourtForm();
      } else {
        const createResponse = await api.post("/admin/courts", payload);
        const createdCourtId = createResponse?.data?.data?.id || null;

        const refreshedData = await fetchAdminData();
        await fetchDashboardData(refreshedData.reservations, refreshedData.courts);

        if (createdCourtId) {
          showFeedbackMessage("La pista s'ha creat correctament.", "success", {
            label: "Veure pista creada",
            onClick: () => scrollToCourtCard(createdCourtId),
          });
        } else {
          const createdMatches = refreshedData.courts.filter(
            (court) => court.nom_pista === payload.nom_pista
          );

          const createdCourt =
            createdMatches.length > 0
              ? createdMatches[createdMatches.length - 1]
              : null;

          if (createdCourt) {
            showFeedbackMessage("La pista s'ha creat correctament.", "success", {
              label: "Veure pista creada",
              onClick: () => scrollToCourtCard(createdCourt.id),
            });
          } else {
            showFeedbackMessage("La pista s'ha creat correctament.", "success");
          }
        }

        resetCourtForm();
      }
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      const backendError =
        err.response?.data?.error ||
        (editingCourtId
          ? "No s'han pogut guardar els canvis de la pista."
          : "No s'ha pogut crear la pista. Revisa les dades i torna-ho a provar.");

      showFeedbackMessage(backendError, "error");
    } finally {
      setCreatingCourt(false);
    }
  };

  // Funció per iniciar el procés d'edició d'una pista, carregant les dades de la pista al formulari i desplaçant-se a la secció d'edició per facilitar la modificació, amb suport per diferents formats de dades de pista
  const handleStartEditCourt = (court) => {
    setActiveTab("courts");
    setEditingCourtId(court.id);
    setNewCourt({
      nom_pista: court.nom_pista || "",
      tipus: court.tipus || "dobles",
      coberta: Number(court.coberta) || 0,
      estat: court.estat || "disponible",
      descripcio: court.descripcio || "",
      preu_persona_1h: court.preu_persona_1h || "",
      preu_persona_1h30: court.preu_persona_1h30 || "",
    });
    setConfirmingCourtId(null);

    setTimeout(() => {
      scrollToElementWithOffset(editSectionRef.current, 90);
    }, 80);
  };

  const handleStartUserRoleChange = (userId) => {
    setConfirmingUserRoleId((current) => (current === userId ? null : userId));
  };

  const handleCancelUserRoleChange = () => {
    setConfirmingUserRoleId(null);
  };

  const handleToggleUserRole = async (user) => {
    try {
      setUpdatingUserRoleId(user.id);

      const currentRole = (user.rol || "").toLowerCase();
      const nextRole = currentRole === "admin" ? "usuari" : "admin";

      await api.put(`/admin/users/${user.id}/role`, {
        rol: nextRole,
      });

      setConfirmingUserRoleId(null);

      showFeedbackMessage(
        `El rol de ${user.nom} s'ha actualitzat correctament a "${nextRole}".`,
        "success"
      );

      await refreshAllAdminData();
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      const backendError =
        err.response?.data?.error ||
        "No s'ha pogut actualitzar el rol de l'usuari.";

      showFeedbackMessage(backendError, "error");
    } finally {
      setUpdatingUserRoleId(null);
    }
  };

  // Funció per gestionar l'eliminació d'una pista, enviant la sol·licitud al backend i actualitzant la vista en conseqüència, amb suport per diferents formats de resposta i missatges de feedback contextuals
  const handleDeleteCourt = async (courtId) => {
    try {
      setDeletingCourtId(courtId);

      await api.delete(`/admin/courts/${courtId}`);

      setConfirmingCourtId(null);

      if (editingCourtId === courtId) {
        resetCourtForm();
      }

      showFeedbackMessage("La pista s'ha eliminat correctament.", "success");
      await refreshAllAdminData();
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      const backendError =
        err.response?.data?.error ||
        "No s'ha pogut eliminar la pista. Torna-ho a provar.";

      showFeedbackMessage(backendError, "error");
    } finally {
      setDeletingCourtId(null);
    }
  };

  const handleLogActionClick = (log) => {
    if (!log) return;

    if (log.entity === "court" && log.entityId) {
      setActiveTab("courts");

      setTimeout(() => {
        scrollToCourtCard(log.entityId);
      }, 120);

      return;
    }

    if (log.entity === "user" && log.entityId) {
      setActiveTab("users");

      setTimeout(() => {
        handleViewUserDetail(log.entityId);
      }, 120);

      return;
    }

    if (log.entity === "maintenance_block") {
      setActiveTab("courts");
    }
  };

  // Carregar les dades d'administració inicials en muntar el component i configurar el dashboard, assegurant que les dades mostrades estiguin actualitzades i consistents des del principi
  useEffect(() => {
    if (hasLoadedInitialDataRef.current) return;

    hasLoadedInitialDataRef.current = true;
    refreshAllAdminDataRef.current?.();
  }, []);

  // Memoritzar les pistes disponibles i cobertes per optimitzar el rendiment en la renderització i càlculs relacionats, evitant càlculs innecessaris en cada renderitzat
  const availableCourts = useMemo(() => {
    return courts.filter((court) => court.estat === "disponible");
  }, [courts]);

  // Memoritzar les pistes cobertes per optimitzar el rendiment en la renderització i càlculs relacionats, evitant càlculs innecessaris en cada renderitzat
  const coveredCourts = useMemo(() => {
    return courts.filter((court) => Number(court.coberta) === 1);
  }, [courts]);

  // Memoritzar el nombre de reserves actives i cancel·lades per optimitzar el rendiment en la renderització i càlculs relacionats, evitant càlculs innecessaris en cada renderitzat i assegurant que els valors estiguin actualitzats quan les dades de reserves canviïn
  const activeReservationsCount = useMemo(() => {
    return reservations.filter((reservation) => {
      const status = (reservation.estat || "").toLowerCase();
      return status === "activa" || status === "active";
    }).length;
  }, [reservations]);

  // Memoritzar el nombre de reserves cancel·lades per optimitzar el rendiment en la renderització i càlculs relacionats, evitant càlculs innecessaris en cada renderitzat i assegurant que els valors estiguin actualitzats quan les dades de reserves canviïn
  const cancelledReservationsCount = useMemo(() => {
    return reservations.filter((reservation) => {
      const status = (reservation.estat || "").toLowerCase();
      return status !== "activa" && status !== "active";
    }).length;
  }, [reservations]);

  // Memoritzar el valor màxim de les estadístiques per pista, franja i data per optimitzar la renderització dels gràfics i assegurar que els valors estiguin actualitzats quan les dades de les estadístiques canviïn, evitant càlculs innecessaris en cada renderitzat
  const topCourtValue = useMemo(() => {
    if (!statsByCourt.length) return 0;
    return Math.max(...statsByCourt.map((item) => item.value), 0);
  }, [statsByCourt]);

  // Memoritzar el valor màxim de les estadístiques per franja horària per optimitzar la renderització dels gràfics i assegurar que els valors estiguin actualitzats quan les dades de les estadístiques canviïn, evitant càlculs innecessaris en cada renderitzat
  const topTimeslotValue = useMemo(() => {
    if (!statsByTimeslot.length) return 0;
    return Math.max(...statsByTimeslot.map((item) => item.value), 0);
  }, [statsByTimeslot]);

  // Memoritzar el valor màxim de les estadístiques per data per optimitzar la renderització dels gràfics i assegurar que els valors estiguin actualitzats quan les dades de les estadístiques canviïn, evitant càlculs innecessaris en cada renderitzat
  const topDateValue = useMemo(() => {
    if (!statsByDate.length) return 0;
    return Math.max(...statsByDate.map((item) => item.value), 0);
  }, [statsByDate]);

  // Memoritzar només les estadístiques que realment tenen activitat per millorar la lectura del dashboard
  const activeCourtStats = useMemo(() => {
    return statsByCourt.filter((item) => item.value > 0);
  }, [statsByCourt]);

  // Memoritzar només les estadístiques de franja horària que realment tenen activitat per millorar la lectura del dashboard
  const activeTimeslotStats = useMemo(() => {
    return statsByTimeslot.filter((item) => item.value > 0);
  }, [statsByTimeslot]);

  // Memoritzar només les estadístiques de data que realment tenen activitat per millorar la lectura del dashboard
  const activeDateStats = useMemo(() => {
    return statsByDate.filter((item) => item.value > 0);
  }, [statsByDate]);

  // Memoritzar les últimes 5 estadístiques de data amb activitat per mostrar les més recents al dashboard, assegurant que els valors estiguin actualitzats quan les dades de les estadístiques canviïn, evitant càlculs innecessaris en cada renderitzat i millorant la lectura del dashboard
  const recentDateStats = useMemo(() => {
    return activeDateStats.slice(-5).reverse();
  }, [activeDateStats]);

  // Memoritzar la pista, franja horària i data més populars segons les estadístiques d'activitat, per destacar-les al dashboard i assegurar que els valors estiguin actualitzats quan les dades de les estadístiques canviïn, evitant càlculs innecessaris en cada renderitzat
  const topCourt = useMemo(() => {
    if (!activeCourtStats.length) return null;
    return [...activeCourtStats].sort((a, b) => b.value - a.value)[0];
  }, [activeCourtStats]);

  // Memoritzar la franja horària més popular segons les estadístiques d'activitat, per destacar-la al dashboard i assegurar que els valors estiguin actualitzats quan les dades de les estadístiques canviïn, evitant càlculs innecessaris en cada renderitzat
  const topTimeslot = useMemo(() => {
    if (!activeTimeslotStats.length) return null;
    return [...activeTimeslotStats].sort((a, b) => b.value - a.value)[0];
  }, [activeTimeslotStats]);

  // Memoritzar la data més popular segons les estadístiques d'activitat, per destacar-la al dashboard i assegurar que els valors estiguin actualitzats quan les dades de les estadístiques canviïn, evitant càlculs innecessaris en cada renderitzat
  const busiestDate = useMemo(() => {
    if (!activeDateStats.length) return null;
    return [...activeDateStats].sort((a, b) => b.value - a.value)[0];
  }, [activeDateStats]);

  const activeReservationsTotal =
    overviewStats.activeReservations ?? activeReservationsCount ?? 0;
  const totalReservationsCount =
    overviewStats.totalReservations ?? reservations.length ?? 0;

  const occupancyRate =
    totalReservationsCount > 0
      ? Math.round((activeReservationsTotal / totalReservationsCount) * 100)
      : 0;

  const visibleCourtStats = useMemo(() => {
    return showAllCourtStats ? activeCourtStats : activeCourtStats.slice(0, 5);
  }, [activeCourtStats, showAllCourtStats]);

  const visibleTimeslotStats = useMemo(() => {
    return showAllTimeslotStats
      ? activeTimeslotStats
      : activeTimeslotStats.slice(0, 5);
  }, [activeTimeslotStats, showAllTimeslotStats]);

  const visibleDateStats = useMemo(() => {
    return showAllDateStats ? recentDateStats : recentDateStats.slice(0, 5);
  }, [recentDateStats, showAllDateStats]);

  // Memoritzar les entrades del registre d'activitat recent que seran visibles al dashboard segons si s'ha seleccionat mostrar totes les dades o només les més recents, assegurant que els valors estiguin actualitzats quan les dades del registre o les opcions de visualització canviïn i evitant càlculs innecessaris en cada renderitzat
  const filteredAdminLogs = useMemo(() => {
    const query = logSearch.trim().toLowerCase();

    return adminLogs.filter((log) => {
      const action = (log.action || "").toLowerCase();
      const adminName = (log.adminName || "").toLowerCase();
      const details = (log.details || "").toLowerCase();
      const entity = (log.entity || "").toLowerCase();
      const entityId = String(log.entityId || "").toLowerCase();

      const matchesAction =
        logActionFilter === "totes" || log.action === logActionFilter;

      const matchesAdmin =
        logAdminFilter === "tots" ||
        String(log.adminId) === String(logAdminFilter);

      const matchesSearch =
        !query ||
        action.includes(query) ||
        adminName.includes(query) ||
        details.includes(query) ||
        entity.includes(query) ||
        entityId.includes(query);

      return matchesAction && matchesAdmin && matchesSearch;
    });
  }, [adminLogs, logActionFilter, logAdminFilter, logSearch]);

  const visibleAdminLogs = useMemo(() => {
    return showAllActivity ? filteredAdminLogs : filteredAdminLogs.slice(0, 3);
  }, [filteredAdminLogs, showAllActivity]);

  const availableLogAdmins = useMemo(() => {
    const uniqueAdmins = new Map();

    adminLogs.forEach((log) => {
      if (!log.adminId) return;

      if (!uniqueAdmins.has(log.adminId)) {
        uniqueAdmins.set(log.adminId, {
          id: log.adminId,
          name: log.adminName || `Admin ${log.adminId}`,
        });
      }
    });

    return Array.from(uniqueAdmins.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [adminLogs]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const name = (user.nom || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const role = (user.rol || "").toLowerCase();

      const matchesQuery = !query || name.includes(query) || email.includes(query);
      const matchesRole = userRoleFilter === "tots" || role === userRoleFilter;

      return matchesQuery && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // Memoritzar les pistes filtrades segons els criteris de cerca i filtrat seleccionats, assegurant que els valors estiguin actualitzats quan les dades de les pistes o els criteris de filtrat canviïn i evitant càlculs innecessaris en cada renderitzat
  const filteredCourts = useMemo(() => {
    const query = courtSearch.trim().toLowerCase();

    return courts.filter((court) => {
      const name = (court.nom_pista || "").toLowerCase();
      const description = (court.descripcio || "").toLowerCase();
      const status = (court.estat || "").toLowerCase();
      const type = (court.tipus || "").toLowerCase();

      const matchesQuery =
        !query || name.includes(query) || description.includes(query);

      const matchesStatus =
        courtStatusFilter === "totes" || status === courtStatusFilter;

      const matchesType = courtTypeFilter === "tots" || type === courtTypeFilter;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [courts, courtSearch, courtStatusFilter, courtTypeFilter]);

  const visibleCourtCards = useMemo(() => {
    return showAllCourtCards ? filteredCourts : filteredCourts.slice(0, 4);
  }, [filteredCourts, showAllCourtCards]);

  // Memoritzar el nombre de pistes disponibles després d'aplicar els filtres de cerca i filtrat, assegurant que els valors estiguin actualitzats quan les dades de les pistes o els criteris de filtrat canviïn i evitant càlculs innecessaris en cada renderitzat
  const filteredAvailableCourtsCount = useMemo(() => {
    return filteredCourts.filter((court) => court.estat === "disponible").length;
  }, [filteredCourts]);

  // Memoritzar el nombre de pistes cobertes després d'aplicar els filtres de cerca i filtrat, assegurant que els valors estiguin actualitzats quan les dades de les pistes o els criteris de filtrat canviïn i evitant càlculs innecessaris en cada renderitzat
  const filteredMaintenanceCourtsCount = useMemo(() => {
    return filteredCourts.filter((court) => court.estat === "manteniment").length;
  }, [filteredCourts]);

  const todayString = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const filteredMaintenanceBlocks = useMemo(() => {
    const query = maintenanceSearch.trim().toLowerCase();

    return maintenanceBlocks.filter((block) => {
      const courtName = (block.courtName || "").toLowerCase();
      const reason = (block.reason || "").toLowerCase();
      const date = block.date || "";

      const matchesQuery =
        !query || courtName.includes(query) || reason.includes(query);

      const matchesPeriod =
        maintenancePeriodFilter === "tots" ||
        (maintenancePeriodFilter === "futurs" && date >= todayString) ||
        (maintenancePeriodFilter === "passats" && date < todayString) ||
        (maintenancePeriodFilter === "avui" && date === todayString);

      return matchesQuery && matchesPeriod;
    });
  }, [maintenanceBlocks, maintenanceSearch, maintenancePeriodFilter, todayString]);

  const visibleMaintenanceBlocks = useMemo(() => {
    return showAllMaintenanceBlocks
      ? filteredMaintenanceBlocks
      : filteredMaintenanceBlocks.slice(0, 4);
  }, [filteredMaintenanceBlocks, showAllMaintenanceBlocks]);

  const maintenanceTodayCount = useMemo(() => {
    return maintenanceBlocks.filter((block) => block.date === todayString).length;
  }, [maintenanceBlocks, todayString]);

  const maintenanceFutureCount = useMemo(() => {
    return maintenanceBlocks.filter((block) => block.date >= todayString).length;
  }, [maintenanceBlocks, todayString]);

  const maintenanceAvailableCourts = useMemo(() => {
    return courts.map((court) => ({
      id: court.id,
      nom_pista: court.nom_pista,
    }));
  }, [courts]);

  const maintenanceAvailableTimeSlots = useMemo(() => {
    const normalizeTime = (value) => {
      if (!value) return "";
      return String(value).slice(0, 5);
    };

    const allSlots = timeSlots
      .map((slot) => ({
        id: slot.id,
        label: `${normalizeTime(slot.hora_inici)} - ${normalizeTime(slot.hora_fi)}`,
        startTime: normalizeTime(slot.hora_inici),
        endTime: normalizeTime(slot.hora_fi),
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (maintenanceForm.data_bloqueig !== todayString) {
      return allSlots;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return allSlots.filter((slot) => {
      const [hours, minutes] = String(slot.startTime).split(":").map(Number);
      const slotMinutes = hours * 60 + minutes;

      return slotMinutes >= currentMinutes;
    });
  }, [timeSlots, maintenanceForm.data_bloqueig, todayString]);

  const maintenanceStartSlots = useMemo(() => {
    return maintenanceAvailableTimeSlots
      .map((slot) => slot.startTime)
      .filter((time) => time && time !== "21:00");
  }, [maintenanceAvailableTimeSlots]);

  const maintenanceEndSlots = useMemo(() => {
    return maintenanceAvailableTimeSlots
      .map((slot) => slot.endTime)
      .filter((time) => time && time !== "08:00");
  }, [maintenanceAvailableTimeSlots]);

  const filteredMaintenanceEndSlots = useMemo(() => {
    if (!maintenanceForm.hora_inici) {
      return maintenanceEndSlots;
    }

    return maintenanceEndSlots.filter(
      (time) => time > maintenanceForm.hora_inici
    );
  }, [maintenanceEndSlots, maintenanceForm.hora_inici]);

  const editingMaintenanceCourtName = useMemo(() => {
    const selectedCourt = courts.find(
      (court) => String(court.id) === String(maintenanceForm.court_id)
    );

    return selectedCourt?.nom_pista || "Manteniment seleccionat";
  }, [courts, maintenanceForm.court_id]);

  const resetUserFilters = () => {
    setUserSearch("");
    setUserRoleFilter("tots");
  };

  const resetLogFilters = () => {
    setLogActionFilter("totes");
    setLogAdminFilter("tots");
    setLogSearch("");
  };

  // Funció per formatar les dates i hores de manera llegible al dashboard, amb suport per diferents formats d'entrada i gestió de valors no vàlids o absents
  const formatDateTime = (value) => {
    if (!value) return "Data no disponible";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString("ca-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatDateOnly = (value) => {
    if (!value) return "Data no disponible";

    const rawValue = String(value).trim();

    const parsed = rawValue.includes("T")
      ? new Date(rawValue)
      : new Date(`${rawValue}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return rawValue;

    return parsed.toLocaleDateString("ca-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeOnly = (value) => {
    if (!value) return "";

    return String(value).slice(0, 5);
  };

  // Funció per formatar les accions del registre d'activitat recent de manera més amigable i llegible al dashboard, amb suport per diferents formats d'entrada i gestió de valors no reconeguts
  const formatActionLabel = (action) => {
    const actionMap = {
      CREATE_COURT: "Crear pista",
      UPDATE_COURT: "Editar pista",
      DELETE_COURT: "Eliminar pista",
      CREATE_MAINTENANCE: "Crear manteniment",
      UPDATE_MAINTENANCE: "Editar manteniment",
      DELETE_MAINTENANCE: "Eliminar manteniment",
      UPDATE_USER_ROLE: "Canviar rol usuari",
    };

    return actionMap[action] || action?.replaceAll("_", " ") || "Acció";
  };

  const getLogActionType = (action) => {
    const normalizedAction = (action || "").toUpperCase();

    if (normalizedAction.startsWith("CREATE")) return "create";
    if (normalizedAction.startsWith("UPDATE")) return "update";
    if (normalizedAction.startsWith("DELETE")) return "delete";

    return "";
  };

  const formatLogEntityLabel = (entity) => {
    const entityMap = {
      court: "Pista",
      maintenance_block: "Manteniment",
      user: "Usuari",
    };

    return entityMap[entity] || entity || "Element";
  };

  const getLogSummary = (log) => {
    const action = (log?.action || "").toUpperCase();

    switch (action) {
      case "CREATE_COURT":
        return "Nova pista creada";

      case "UPDATE_COURT":
        return "Pista actualitzada";

      case "DELETE_COURT":
        return "Pista eliminada";

      case "CREATE_MAINTENANCE":
        return "Bloqueig de manteniment creat";

      case "UPDATE_MAINTENANCE":
        return "Bloqueig de manteniment actualitzat";

      case "DELETE_MAINTENANCE":
        return "Bloqueig de manteniment eliminat";

      case "UPDATE_USER_ROLE":
        return "Rol d'usuari actualitzat";

      default:
        return formatActionLabel(log?.action);
    }
  };

  // Definir les targetes de resum del dashboard amb les dades normalitzades i calculades, assegurant que els valors mostrats estiguin actualitzats i siguin consistents amb les dades carregades, i proporcionant icones i classes d'estil per a una millor presentació visual
  const dashboardCards = [
    {
      label: "Reserves totals",
      value: overviewStats.totalReservations ?? reservations.length ?? 0,
      icon: "📅",
      accentClass: "admin__accent-blue",
    },
    {
      label: "Reserves actives",
      value: overviewStats.activeReservations ?? activeReservationsCount,
      icon: "✅",
      accentClass: "admin__accent-green",
    },
    {
      label: "Reserves cancel·lades",
      value: overviewStats.cancelledReservations ?? cancelledReservationsCount,
      icon: "🧾",
      accentClass: "admin__accent-rose",
    },
    {
      label: "Pistes totals",
      value: overviewStats.totalCourts ?? courts.length ?? 0,
      icon: "🎾",
      accentClass: "admin__accent-indigo",
    },
    {
      label: "Pistes disponibles",
      value: overviewStats.availableCourts ?? availableCourts.length,
      icon: "🟢",
      accentClass: "admin__accent-emerald",
    },
    {
      label: "Pistes cobertes",
      value: overviewStats.coveredCourts ?? coveredCourts.length,
      icon: "🏟️",
      accentClass: "admin__accent-amber",
    },
  ];

  const quickInsights = [
    {
      label: "Pista líder",
      value: topCourt ? topCourt.label : "Sense dades",
      detail: topCourt
        ? `${topCourt.value} reserves registrades`
        : "Encara no hi ha activitat suficient",
    },
    {
      label: "Franja més activa",
      value: topTimeslot ? topTimeslot.label : "Sense dades",
      detail: topTimeslot
        ? `${topTimeslot.value} reserves en aquesta franja`
        : "Encara no hi ha activitat suficient",
    },
    {
      label: "Dia amb més moviment",
      value: busiestDate ? busiestDate.label : "Sense dades",
      detail: busiestDate
        ? `${busiestDate.value} reserves aquell dia`
        : "No hi ha dades de dies amb activitat",
    },
    {
      label: "Ocupació activa",
      value: `${occupancyRate}%`,
      detail: `${activeReservationsTotal} de ${totalReservationsCount} reserves estan actives`,
    },
  ];

  // Mostrar un spinner de càrrega mentre es carreguen les dades d'administració inicials, assegurant que l'usuari tingui feedback visual sobre l'estat de càrrega i evitant mostrar una pantalla buida o incompleta
  if (loading && !feedback) {
    return (
      <LoadingSpinner
        text="Carregant dades d'administració..."
        minHeight="260px"
      />
    );
  }

  return (
    <div className="admin__page">
      <div
        className={`admin__container ${
          isMobileView ? "admin__container--mobile" : ""
        }`}
      >
        <section
          className={`fade-in-up admin__hero ${
            isMobileView ? "admin__hero--mobile" : ""
          }`}
        >
          <div
            className={`admin__hero-grid ${
              isMobileView ? "admin__hero-grid--mobile" : ""
            }`}
          >
            <div className="admin__hero-content">
              <span className="pb-kicker">Administració</span>

              <h1
                className={`admin__title ${
                  isMobileView ? "admin__title--mobile" : ""
                }`}
              >
                Panell d’administració
              </h1>

              <p className="admin__subtitle">
                Controla pistes, reserves, estadístiques i activitat recent des
                d’un espai més complet, més ordenat i amb millor lectura visual.
              </p>

              <div
                className={`admin__hero-tabs ${
                  isMobileView ? "admin__hero-tabs--mobile" : ""
                }`}
              >
                <button
                  type="button"
                  className={`admin__hero-tab ${
                    activeTab === "dashboard" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  <span className="admin__hero-tab-label">Dashboard</span>
                </button>

                <button
                  type="button"
                  className={`admin__hero-tab ${
                    activeTab === "courts" ? "is-active" : ""
                  }`}
                  onClick={() => {
                    setActiveTab("courts");
                    setEditingCourtId(null);
                  }}
                >
                  <span className="admin__hero-tab-label">Gestió de pistes</span>
                </button>

                <button
                  type="button"
                  className={`admin__hero-tab ${
                    activeTab === "reservations" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveTab("reservations")}
                >
                  <span className="admin__hero-tab-label">Reserves</span>
                </button>

                <button
                  type="button"
                  className={`admin__hero-tab ${
                    activeTab === "users" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveTab("users")}
                >
                  <span className="admin__hero-tab-label">Usuaris</span>
                </button>
              </div>
            </div>

            {!error && (
              <div className="admin__hero-panel">
                <span className="admin__hero-panel-label">Resum executiu</span>

                <div className="admin__hero-panel-grid">
                  <div className="admin__hero-panel-card">
                    <span className="admin__hero-panel-card-label">
                      Pistes totals
                    </span>
                    <span className="admin__hero-panel-card-value">
                      {courts.length}
                    </span>
                  </div>

                  <div className="admin__hero-panel-card">
                    <span className="admin__hero-panel-card-label">
                      Disponibles
                    </span>
                    <span className="admin__hero-panel-card-value">
                      {availableCourts.length}
                    </span>
                  </div>

                  <div className="admin__hero-panel-card">
                    <span className="admin__hero-panel-card-label">
                      Reserves
                    </span>
                    <span className="admin__hero-panel-card-value">
                      {reservations.length}
                    </span>
                  </div>

                  <div className="admin__hero-panel-card">
                    <span className="admin__hero-panel-card-label">
                      Cobertes
                    </span>
                    <span className="admin__hero-panel-card-value">
                      {coveredCourts.length}
                    </span>
                  </div>

                  <div className="admin__hero-panel-card">
                    <span className="admin__hero-panel-card-label">
                      Usuaris
                    </span>
                    <span className="admin__hero-panel-card-value">
                      {users.length}
                    </span>
                  </div>

                  <div className="admin__hero-panel-card">
                    <span className="admin__hero-panel-card-label">
                      Manteniments
                    </span>
                    <span className="admin__hero-panel-card-value">
                      {maintenanceBlocks.length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div ref={feedbackRef} />

        {feedback && (
          <section className="scale-in admin__feedback-section">
            <div
              className={`pb-feedback ${
                feedbackType === "success"
                  ? "pb-feedback--success"
                  : "pb-feedback--error"
              }`}
            >
              <div
                className={`admin__feedback-row ${
                  isMobileView ? "admin__feedback-row--mobile" : ""
                }`}
              >
                <p className="pb-feedback__text">{feedback}</p>

                {feedbackAction && (
                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={feedbackAction.onClick}
                  >
                    {feedbackAction.label}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {loadingDashboard && (
          <section className="scale-in admin__feedback-section">
            <div className="pb-feedback pb-feedback--info">
              <p className="pb-feedback__text">
                Actualitzant dashboard administratiu...
              </p>
            </div>
          </section>
        )}

        {error && (
          <section className="scale-in admin__feedback-section">
            <div className="pb-feedback pb-feedback--error admin__error-wrapper">
              <p className="admin__error-title">
                No s'han pogut carregar les dades d'administració
              </p>
              <p className="admin__error-text">{error}</p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={refreshAllAdminData}
              >
                Tornar-ho a intentar
              </button>
            </div>
          </section>
        )}

        {!error && (
          <>
            {activeTab === "dashboard" && (
              <>
                <section
                  ref={dashboardSectionRef}
                  className="fade-in-up delay-1 admin__section admin__section--dashboard-overview"
                >
                  <div
                    className={`admin__section-header ${
                      isMobileView ? "admin__section-header--mobile" : ""
                    }`}
                  >
                    <div>
                      <span className="pb-kicker">Visió general</span>
                      <h2
                        className={`pb-panel-title ${
                          isMobileView ? "admin__section-title--mobile" : ""
                        }`}
                      >
                        Dashboard administratiu
                      </h2>
                      <p className="pb-panel-text">
                        Visió ràpida de l’estat del sistema, volum de reserves i
                        pistes.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => fetchDashboardData()}
                    >
                      Actualitzar dashboard
                    </button>
                  </div>

                  <div
                    className={`admin__dashboard-stats-grid ${
                      isMobileView ? "admin__dashboard-stats-grid--mobile" : ""
                    }`}
                  >
                    {dashboardCards.map((card) => (
                      <article
                        key={card.label}
                        className={`pb-surface-card admin__dashboard-stat-card ${card.accentClass}`}
                      >
                        <div className="admin__dashboard-stat-top">
                          <span className="admin__dashboard-stat-icon">
                            {card.icon}
                          </span>
                          <span className="admin__dashboard-stat-label">
                            {card.label}
                          </span>
                        </div>

                        <span
                          className={`admin__dashboard-stat-value ${
                            isMobileView
                              ? "admin__dashboard-stat-value--mobile"
                              : ""
                          }`}
                        >
                          {card.value}
                        </span>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="fade-in-up delay-2 admin__section admin__section--compact-top">
                  <div className="pb-surface-card admin__section-card admin__section-card--executive">
                    <div
                      className={`admin__analytics-header ${
                        isMobileView ? "admin__analytics-header--mobile" : ""
                      }`}
                    >
                      <div>
                        <span className="pb-kicker">Resum ràpid</span>
                        <h3 className="admin__analytics-title">Insights clau</h3>
                      </div>
                      <span className="pb-badge-pill pb-badge-pill--blue">
                        Executiu
                      </span>
                    </div>

                    <div
                      className={`admin__insights-grid ${
                        isMobileView ? "admin__insights-grid--mobile" : ""
                      }`}
                    >
                      {quickInsights.map((insight) => (
                        <article
                          className="pb-surface-card admin__insight-card"
                          key={insight.label}
                        >
                          <span className="admin__insight-label">
                            {insight.label}
                          </span>
                          <span className="admin__insight-value">
                            {insight.value}
                          </span>
                          <span className="admin__insight-detail">
                            {insight.detail}
                          </span>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="fade-in-up delay-2 admin__section admin__section--dashboard-main admin__section--dashboard-feature">
                  <div
                    className={`admin__analytics-grid admin__analytics-grid--dashboard-main ${
                      isMobileView ? "admin__analytics-grid--mobile" : ""
                    }`}
                  >
                    <div
                      className={`pb-surface-card admin__section-card admin__dashboard-card admin__dashboard-card--courts ${
                        activeCourtStats.length <= 2
                          ? "admin__section-card--compact-metrics"
                          : ""
                      }`}
                    >
                      <div
                        className={`admin__analytics-header ${
                          isMobileView ? "admin__analytics-header--mobile" : ""
                        }`}
                      >
                        <div>
                          <span className="pb-kicker">Anàlisi</span>
                          <h3 className="admin__analytics-title">
                            Reserves per pista
                          </h3>
                        </div>
                        <span className="pb-badge-pill pb-badge-pill--blue">
                          {activeCourtStats.length} amb activitat
                        </span>
                      </div>

                      {activeCourtStats.length > 0 ? (
                        <>
                          <div
                            className={`admin__metric-list ${
                              activeCourtStats.length <= 2
                                ? "admin__metric-list--compact-courts"
                                : ""
                            }`}
                          >
                            {visibleCourtStats.map((item) => {
                              const width =
                                topCourtValue > 0 ? `${(item.value / topCourtValue) * 100}%` : "0%";

                              return (
                                <div
                                  key={item.id}
                                  className={`admin__metric-item ${
                                    activeCourtStats.length <= 2
                                      ? "admin__metric-item--compact-court"
                                      : ""
                                  }`}
                                >
                                  <div
                                    className={`admin__metric-top-row ${
                                      isMobileView ? "admin__metric-top-row--mobile" : ""
                                    }`}
                                  >
                                    <span className="admin__metric-label">{item.label}</span>
                                    <span className="admin__metric-value">{item.value}</span>
                                  </div>

                                  <div className="admin__metric-bar-track">
                                    <div className="admin__metric-bar-fill" style={{ width }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {activeCourtStats.length <= 2 && (
                            <p className="admin__compact-support-text">
                              {activeCourtStats.length === 1
                                ? "Només una pista registra activitat en el període actual."
                                : "Només dues pistes registren activitat en el període actual."}
                            </p>
                          )}

                          {activeCourtStats.length > 5 && (
                            <div className="admin__metrics-toggle">
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() => setShowAllCourtStats((prev) => !prev)}
                              >
                                {showAllCourtStats ? "Mostrar menys" : "Veure més pistes"}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="admin__empty-analytics-text">
                          Encara no hi ha reserves registrades per pista.
                        </p>
                      )}
                    </div>

                    <div className="pb-surface-card admin__section-card admin__dashboard-card admin__dashboard-card--timeslots">
                      <div
                        className={`admin__analytics-header ${
                          isMobileView ? "admin__analytics-header--mobile" : ""
                        }`}
                      >
                        <div>
                          <span className="pb-kicker">Demanda</span>
                          <h3 className="admin__analytics-title">
                            Franges més reservades
                          </h3>
                        </div>
                        <span className="pb-badge-pill pb-badge-pill--green">
                          {activeTimeslotStats.length} amb activitat
                        </span>
                      </div>

                      {activeTimeslotStats.length > 0 ? (
                        <>
                          <div className="admin__metric-list">
                            {visibleTimeslotStats.map((item) => {
                              const width =
                                topTimeslotValue > 0
                                  ? `${(item.value / topTimeslotValue) * 100}%`
                                  : "0%";

                              return (
                                <div key={item.id} className="admin__metric-item">
                                  <div
                                    className={`admin__metric-top-row ${
                                      isMobileView ? "admin__metric-top-row--mobile" : ""
                                    }`}
                                  >
                                    <span className="admin__metric-label">{item.label}</span>
                                    <span className="admin__metric-value">{item.value}</span>
                                  </div>

                                  <div className="admin__metric-bar-track">
                                    <div
                                      className="admin__metric-bar-fill--secondary"
                                      style={{ width }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {activeTimeslotStats.length > 5 && (
                            <div className="admin__metrics-toggle">
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() => setShowAllTimeslotStats((prev) => !prev)}
                              >
                                {showAllTimeslotStats ? "Mostrar menys" : "Veure més franges"}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="admin__empty-analytics-text">
                          Encara no hi ha franges amb reserves registrades.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="fade-in-up delay-3 admin__section admin__section--dashboard-bottom">
                  <div
                    className={`admin__analytics-grid admin__analytics-grid--dashboard-bottom ${
                      isMobileView ? "admin__analytics-grid--mobile" : ""
                    }`}
                  >
                    <div
                      className={`pb-surface-card admin__section-card admin__dashboard-card admin__dashboard-card--dates ${
                        activeDateStats.length <= 3
                          ? "admin__section-card--compact-metrics"
                          : ""
                      }`}
                    >
                      <div
                        className={`admin__analytics-header ${
                          isMobileView ? "admin__analytics-header--mobile" : ""
                        }`}
                      >
                        <div>
                          <span className="pb-kicker">Tendència</span>
                          <h3 className="admin__analytics-title">
                            Activitat per dates
                          </h3>
                        </div>
                        <span className="pb-badge-pill pb-badge-pill--amber">
                          {activeDateStats.length} dies actius
                        </span>
                      </div>

                      {recentDateStats.length > 0 ? (
                        <>
                          <div
                            className={`admin__metric-list ${
                              activeDateStats.length <= 3
                                ? "admin__metric-list--compact-dates"
                                : ""
                            }`}
                          >
                            {visibleDateStats.map((item) => {
                              const width =
                                topDateValue > 0 ? `${(item.value / topDateValue) * 100}%` : "0%";

                              return (
                                <div
                                  key={item.id}
                                  className={`admin__metric-item ${
                                    activeDateStats.length <= 3
                                      ? "admin__metric-item--compact-date"
                                      : ""
                                  }`}
                                >
                                  <div
                                    className={`admin__metric-top-row ${
                                      isMobileView ? "admin__metric-top-row--mobile" : ""
                                    }`}
                                  >
                                    <span className="admin__metric-label">{item.label}</span>
                                    <span className="admin__metric-value">{item.value}</span>
                                  </div>

                                  <div className="admin__metric-bar-track">
                                    <div
                                      className="admin__metric-bar-fill--tertiary"
                                      style={{ width }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {activeDateStats.length <= 3 && (
                            <p className="admin__compact-support-text">
                              {activeDateStats.length === 1
                                ? "Només hi ha un dia amb activitat en el període actual."
                                : activeDateStats.length === 2
                                  ? "Només hi ha dos dies amb activitat en el període actual."
                                  : "Només hi ha tres dies amb activitat en el període actual."}
                            </p>
                          )}

                          {recentDateStats.length > 5 && (
                            <div className="admin__metrics-toggle">
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() => setShowAllDateStats((prev) => !prev)}
                              >
                                {showAllDateStats ? "Mostrar menys" : "Veure més dates"}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="admin__empty-analytics-text">
                          Encara no hi ha dies amb activitat de reserves.
                        </p>
                      )}
                    </div>

                    <div className="pb-surface-card admin__section-card admin__dashboard-card admin__dashboard-card--logs">
                      <div
                        className={`admin__analytics-header ${
                          isMobileView ? "admin__analytics-header--mobile" : ""
                        }`}
                      >
                        <div>
                          <span className="pb-kicker">Traçabilitat</span>
                          <h3 className="admin__analytics-title">
                            Activitat recent admin
                          </h3>
                        </div>

                        <span className="pb-badge-pill pb-badge-pill--rose">
                          {filteredAdminLogs.length} accions
                        </span>
                      </div>

                      <div
                        className={`admin__logs-filters-grid ${
                          isMobileView ? "admin__logs-filters-grid--mobile" : ""
                        }`}
                      >
                        <div className="admin__court-filter-field">
                          <label
                            htmlFor="logSearch"
                            className="admin__filter-label"
                          >
                            Cercar al log
                          </label>
                          <input
                            id="logSearch"
                            type="text"
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            placeholder="Acció, admin o detall..."
                            className="pb-input"
                          />
                        </div>

                        <div className="admin__court-filter-field">
                          <label
                            htmlFor="logActionFilter"
                            className="admin__filter-label"
                          >
                            Acció
                          </label>
                          <select
                            id="logActionFilter"
                            value={logActionFilter}
                            onChange={(e) => setLogActionFilter(e.target.value)}
                            className="pb-input"
                          >
                            <option value="totes">Totes</option>
                            <option value="CREATE_COURT">Crear pista</option>
                            <option value="UPDATE_COURT">Editar pista</option>
                            <option value="DELETE_COURT">Eliminar pista</option>
                            <option value="CREATE_MAINTENANCE">Crear manteniment</option>
                            <option value="UPDATE_MAINTENANCE">Editar manteniment</option>
                            <option value="DELETE_MAINTENANCE">Eliminar manteniment</option>
                            <option value="UPDATE_USER_ROLE">Canviar rol usuari</option>
                          </select>
                        </div>

                        <div className="admin__court-filter-field">
                          <label
                            htmlFor="logAdminFilter"
                            className="admin__filter-label"
                          >
                            Administrador
                          </label>
                          <select
                            id="logAdminFilter"
                            value={logAdminFilter}
                            onChange={(e) => setLogAdminFilter(e.target.value)}
                            className="pb-input"
                          >
                            <option value="tots">Tots</option>
                            {availableLogAdmins.map((admin) => (
                              <option key={admin.id} value={admin.id}>
                                {admin.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="admin__court-filter-actions">
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={resetLogFilters}
                          >
                            Netejar filtres
                          </button>
                        </div>
                      </div>

                      {filteredAdminLogs.length > 0 ? (
                        <>
                          <div className="admin__logs-list admin__logs-list--compact">
                            {visibleAdminLogs.map((log) => (
                              <article
                                key={log.id}
                                className="admin__log-item admin__log-item--compact"
                              >
                                <div
                                  className={`admin__log-top-row ${
                                    isMobileView
                                      ? "admin__log-top-row--mobile"
                                      : ""
                                  }`}
                                >
                                  <span
                                    className={`activity-type ${getLogActionType(
                                      log.action
                                    )}`}
                                  >
                                    {formatActionLabel(log.action)}
                                  </span>

                                  <span className="admin__log-date">
                                    {formatDateTime(log.createdAt)}
                                  </span>
                                </div>

                                <div className="admin__log-summary-row">
                                  <p className="admin__log-summary">
                                    {getLogSummary(log)}
                                  </p>

                                  {log.entity && (
                                    <span className="admin__log-entity-pill">
                                      {formatLogEntityLabel(log.entity)}
                                      {log.entityId ? ` · ID ${log.entityId}` : ""}
                                    </span>
                                  )}
                                </div>

                                <p className="admin__log-admin">
                                  {log.adminName}
                                  {log.adminId ? ` · Admin ID ${log.adminId}` : ""}
                                </p>

                                <p className="admin__log-details">
                                  {log.details || "Sense detalls addicionals."}
                                </p>

                                {(log.entity === "court" || log.entity === "user" || log.entity === "maintenance_block") && (
                                  <div className="admin__log-actions">
                                    <button
                                      type="button"
                                      className="btn btn-light btn-sm"
                                      onClick={() => handleLogActionClick(log)}
                                    >
                                      {log.entity === "court"
                                        ? "Anar a la pista"
                                        : log.entity === "user"
                                          ? "Veure usuari"
                                          : "Obrir gestió de pistes"}
                                    </button>
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>

                          {filteredAdminLogs.length > 3 && (
                            <div className="admin__logs-toggle">
                              <button
                                type="button"
                                className="btn btn-light"
                                onClick={() =>
                                  setShowAllActivity((prev) => !prev)
                                }
                              >
                                {showAllActivity
                                  ? "Mostrar menys"
                                  : "Veure més activitat"}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="admin__empty-filtered-state admin__logs-empty-state">
                          <p className="admin__empty-filtered-title">
                            No hi ha logs que coincideixin
                          </p>
                          <p className="admin__empty-filtered-text">
                            Revisa els filtres aplicats o neteja la cerca per tornar
                            a veure tota l'activitat administrativa.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeTab === "reservations" && (
              <section
                ref={reservationsSectionRef}
                className="fade-in-up delay-2 admin__section admin__section--reservations"
              >
                <div
                  className={`admin__section-header ${
                    isMobileView ? "admin__section-header--mobile" : ""
                  }`}
                >
                  <div>
                    <span className="pb-kicker">Control operatiu</span>
                    <h2
                      className={`pb-panel-title ${
                        isMobileView ? "admin__section-title--mobile" : ""
                      }`}
                    >
                      Reserves del sistema
                    </h2>
                    <p className="pb-panel-text">
                      Consulta, filtra i revisa totes les reserves registrades.
                    </p>
                  </div>

                  <span className="pb-badge-pill pb-badge-pill--blue">
                    {reservations.length} reserves
                  </span>
                </div>

                <div
                  className={`pb-surface-card admin__section-card admin__section-card--reservations ${
                    isMobileView ? "admin__section-card--mobile" : ""
                  }`}
                >
                  <AdminReservationsTable reservations={reservations} />
                </div>
              </section>
            )}

            {activeTab === "users" && (
              <section
                ref={usersSectionRef}
                className="fade-in-up delay-2 admin__section admin__section--users"
              >
                <div
                  className={`admin__section-header ${
                    isMobileView ? "admin__section-header--mobile" : ""
                  }`}
                >
                  <div>
                    <span className="pb-kicker">Gestió d'usuaris</span>
                    <h2
                      className={`pb-panel-title ${
                        isMobileView ? "admin__section-title--mobile" : ""
                      }`}
                    >
                      Usuaris registrats
                    </h2>
                    <p className="pb-panel-text">
                      Consulta els usuaris registrats actualment al sistema.
                    </p>
                  </div>

                  <span className="pb-badge-pill pb-badge-pill--blue">
                    {filteredUsers.length === users.length
                      ? `${filteredUsers.length} usuaris`
                      : `${filteredUsers.length} de ${users.length} usuaris`}
                  </span>
                </div>

                <div
                  className={`pb-surface-card admin__section-card admin__section-card--users ${
                    isMobileView ? "admin__section-card--mobile" : ""
                  }`}
                >
                  <div
                    className={`admin__summary-inline-grid admin__summary-inline-grid--users ${
                      isMobileView ? "admin__summary-inline-grid--mobile" : ""
                    }`}
                  >
                    <div className="admin__summary-inline-card">
                      <span className="admin__summary-inline-label">Totals</span>
                      <span className="admin__summary-inline-value">{users.length}</span>
                    </div>

                    <div className="admin__summary-inline-card">
                      <span className="admin__summary-inline-label">Admins</span>
                      <span className="admin__summary-inline-value">
                        {users.filter((user) => (user.rol || "").toLowerCase() === "admin").length}
                      </span>
                    </div>

                    <div className="admin__summary-inline-card">
                      <span className="admin__summary-inline-label">Usuaris</span>
                      <span className="admin__summary-inline-value">
                        {users.filter((user) => (user.rol || "").toLowerCase() !== "admin").length}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`admin__users-tools-grid ${
                      isMobileView ? "admin__users-tools-grid--mobile" : ""
                    }`}
                  >
                    <div className="admin__court-filter-field">
                      <label
                        htmlFor="userSearch"
                        className="admin__filter-label"
                      >
                        Cercar usuari
                      </label>
                      <input
                        id="userSearch"
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Nom o correu electrònic..."
                        className="pb-input"
                      />
                    </div>

                    <div className="admin__court-filter-field">
                      <label
                        htmlFor="userRoleFilter"
                        className="admin__filter-label"
                      >
                        Rol
                      </label>
                      <select
                        id="userRoleFilter"
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="pb-input"
                      >
                        <option value="tots">Tots</option>
                        <option value="usuari">Usuari</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="admin__court-filter-actions">
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={resetUserFilters}
                      >
                        Netejar filtres
                      </button>
                    </div>
                  </div>

                  {(userSearch || userRoleFilter !== "tots") && (
                    <p className="admin__filters-active-text">
                      🔎 Filtres actius
                    </p>
                  )}

                  {filteredUsers.length > 0 ? (
                    <>
                      <div className="admin__table-wrapper admin__table-wrapper--users">
                        <table className="admin__table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Nom</th>
                              <th>Email</th>
                              <th>Rol</th>
                              <th>Data de registre</th>
                              <th>Accions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((user) => {
                              const isCurrentUser =
                                Number(user.id) === Number(storedUser?.id);
                              const isSelectedUser =
                                Number(selectedUser?.id) === Number(user.id);
                              const isConfirmingRoleChange =
                                Number(confirmingUserRoleId) === Number(user.id);

                              return (
                                <Fragment key={user.id}>
                                  <tr
                                    className={`admin__user-table-row ${
                                      isSelectedUser ? "admin__user-table-row--selected" : ""
                                    }`}
                                    ref={(node) => {
                                      if (node) {
                                        userRowRefs.current[user.id] = node;
                                      } else {
                                        delete userRowRefs.current[user.id];
                                      }
                                    }}
                                  >
                                    <td data-label="ID">{user.id}</td>
                                    <td data-label="Nom">{user.nom}</td>
                                    <td data-label="Email">{user.email}</td>
                                    <td data-label="Rol">
                                      <span
                                        className={`admin__role-badge ${
                                          (user.rol || "").toLowerCase() === "admin"
                                            ? "admin__role-badge--admin"
                                            : "admin__role-badge--user"
                                        }`}
                                      >
                                        {user.rol}
                                      </span>
                                    </td>
                                    <td data-label="Registre">{formatDateTime(user.created_at)}</td>
                                    <td data-label="Accions">
                                      <div className="admin__table-actions">
                                        <button
                                          type="button"
                                          className={`btn btn-light btn-sm admin__user-view-button ${
                                            isSelectedUser ? "admin__user-view-button--active" : ""
                                          }`}
                                          onClick={() => handleViewUserDetail(user.id)}
                                        >
                                          {isSelectedUser ? "Amagar detall" : "Veure detall"}
                                        </button>

                                        <div className="admin__role-action-wrap">
                                          <button
                                            type="button"
                                            className={`btn btn-light btn-sm admin__user-role-button ${
                                              isConfirmingRoleChange
                                                ? "admin__user-role-button--pending"
                                                : ""
                                            }`}
                                            onClick={() =>
                                              isConfirmingRoleChange
                                                ? handleCancelUserRoleChange()
                                                : handleStartUserRoleChange(user.id)
                                            }
                                            disabled={
                                              updatingUserRoleId === user.id ||
                                              isCurrentUser
                                            }
                                          >
                                            {isConfirmingRoleChange
                                              ? "Canvi de rol"
                                              : "Canviar rol"}
                                          </button>

                                          {isConfirmingRoleChange && (
                                            <div className="admin__role-confirm-popover">
                                              <button
                                                type="button"
                                                className="btn btn-primary btn-sm admin__user-role-button"
                                                onClick={() => handleToggleUserRole(user)}
                                                disabled={
                                                  updatingUserRoleId === user.id ||
                                                  isCurrentUser
                                                }
                                              >
                                                {updatingUserRoleId === user.id
                                                  ? "Canviant..."
                                                  : "Confirmar"}
                                              </button>

                                              <button
                                                type="button"
                                                className="btn btn-light btn-sm"
                                                onClick={handleCancelUserRoleChange}
                                                disabled={updatingUserRoleId === user.id}
                                              >
                                                Cancel·lar
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>

                                  {isSelectedUser && (
                                    <tr className="admin__user-detail-row">
                                      <td colSpan="6">
                                        <div
                                          ref={userDetailCardRef}
                                          className="admin__user-detail-card"
                                        >
                                          <div className="admin__user-detail-header">
                                            <div className="admin__user-detail-heading">
                                              <span className="pb-kicker">Detall d'usuari</span>
                                              <h3 className="admin__analytics-title">
                                                {selectedUser.nom}
                                              </h3>

                                              <div className="admin__user-detail-summary">
                                                <span
                                                  className={`admin__role-badge ${
                                                    (selectedUser.rol || "").toLowerCase() === "admin"
                                                      ? "admin__role-badge--admin"
                                                      : "admin__role-badge--user"
                                                  }`}
                                                >
                                                  {selectedUser.rol}
                                                </span>

                                                <span className="admin__user-detail-summary-pill">
                                                  {selectedUser.total_reserves} reserves
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {loadingUserDetail ? (
                                            <p className="admin__user-detail-loading">
                                              Carregant detall d'usuari...
                                            </p>
                                          ) : (
                                            <div className="admin__user-detail-grid">
                                              <div className="admin__user-detail-item">
                                                <span className="admin__user-detail-label">ID</span>
                                                <strong className="admin__user-detail-value">
                                                  {selectedUser.id}
                                                </strong>
                                              </div>

                                              <div className="admin__user-detail-item">
                                                <span className="admin__user-detail-label">Nom</span>
                                                <strong className="admin__user-detail-value">
                                                  {selectedUser.nom}
                                                </strong>
                                              </div>

                                              <div className="admin__user-detail-item">
                                                <span className="admin__user-detail-label">Email</span>
                                                <strong className="admin__user-detail-value">
                                                  {selectedUser.email}
                                                </strong>
                                              </div>

                                              <div className="admin__user-detail-item">
                                                <span className="admin__user-detail-label">Telèfon</span>
                                                <strong className="admin__user-detail-value">
                                                  {selectedUser.telefon || "—"}
                                                </strong>
                                              </div>

                                              <div className="admin__user-detail-item">
                                                <span className="admin__user-detail-label">Registre</span>
                                                <strong className="admin__user-detail-value">
                                                  {formatDateTime(selectedUser.created_at)}
                                                </strong>
                                              </div>

                                              <div className="admin__user-detail-item">
                                                <span className="admin__user-detail-label">Total reserves</span>
                                                <strong className="admin__user-detail-value">
                                                  {selectedUser.total_reserves}
                                                </strong>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="pb-surface-card admin__empty-filtered-state">
                      <p className="admin__empty-filtered-title">
                        No hi ha usuaris que coincideixin
                      </p>
                      <p className="admin__empty-filtered-text">
                        Revisa els filtres aplicats o neteja la cerca per tornar
                        a veure tots els usuaris registrats.
                      </p>

                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={resetUserFilters}
                      >
                        Mostrar tots els usuaris
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "courts" && (
              <>
                <section
                  ref={editSectionRef}
                  className="fade-in-up delay-1 admin__section admin__section--court-form"
                >
                  <div
                    className={`admin__section-header ${
                      isMobileView ? "admin__section-header--mobile" : ""
                    }`}
                  >
                    <div>
                      <span className="pb-kicker">
                        {editingCourtId ? "Edició" : "Creació"}
                      </span>
                      <h2
                        className={`pb-panel-title ${
                          isMobileView ? "admin__section-title--mobile" : ""
                        }`}
                      >
                        {editingCourtId ? "Editar pista" : "Crear nova pista"}
                      </h2>
                      <p className="pb-panel-text">
                        {editingCourtId
                          ? "Modifica les dades de la pista seleccionada i guarda els canvis."
                          : "Afegeix una pista nova al sistema i defineix-ne les dades principals."}
                      </p>
                    </div>

                    {editingCourtId && (
                      <span className="pb-badge-pill pb-badge-pill--amber">
                        Mode edició
                      </span>
                    )}
                  </div>

                  <div className="pb-surface-card admin__section-card admin__section-card--court-form">
                    <CreateCourtForm
                      newCourt={newCourt}
                      setNewCourt={setNewCourt}
                      onSubmit={handleCreateOrUpdateCourt}
                      creatingCourt={creatingCourt}
                      isEditing={!!editingCourtId}
                      onCancelEdit={resetCourtForm}
                    />
                  </div>
                </section>

                <section
                  ref={courtsSectionRef}
                  className="fade-in-up delay-3 admin__section admin__section--courts-list"
                >
                  <div
                    className={`admin__section-header ${
                      isMobileView ? "admin__section-header--mobile" : ""
                    }`}
                  >
                    <div>
                      <span className="pb-kicker">Gestió d’espais</span>
                      <h2
                        className={`pb-panel-title ${
                          isMobileView ? "admin__section-title--mobile" : ""
                        }`}
                      >
                        Pistes
                      </h2>
                      <p className="pb-panel-text">
                        Cerca, filtra i gestiona les pistes existents amb més
                        rapidesa.
                      </p>
                    </div>

                    <span className="pb-badge-pill pb-badge-pill--green">
                      {filteredCourts.length} visibles
                    </span>
                  </div>

                  <div className="pb-surface-card admin__section-card admin__section-card--courts-tools">
                    <div
                      className={`admin__court-tools-grid ${
                        isMobileView ? "admin__court-tools-grid--mobile" : ""
                      }`}
                    >
                      <div className="admin__court-filter-field">
                        <label
                          htmlFor="courtSearch"
                          className="admin__filter-label"
                        >
                          Cercar pista
                        </label>
                        <input
                          id="courtSearch"
                          type="text"
                          value={courtSearch}
                          onChange={(e) => setCourtSearch(e.target.value)}
                          placeholder="Nom o descripció..."
                          className="pb-input"
                        />
                      </div>

                      <div className="admin__court-filter-field">
                        <label
                          htmlFor="courtStatusFilter"
                          className="admin__filter-label"
                        >
                          Estat
                        </label>
                        <select
                          id="courtStatusFilter"
                          value={courtStatusFilter}
                          onChange={(e) => setCourtStatusFilter(e.target.value)}
                          className="pb-input"
                        >
                          <option value="totes">Totes</option>
                          <option value="disponible">Disponibles</option>
                          <option value="manteniment">Manteniment</option>
                        </select>
                      </div>

                      <div className="admin__court-filter-field">
                        <label
                          htmlFor="courtTypeFilter"
                          className="admin__filter-label"
                        >
                          Tipus
                        </label>
                        <select
                          id="courtTypeFilter"
                          value={courtTypeFilter}
                          onChange={(e) => setCourtTypeFilter(e.target.value)}
                          className="pb-input"
                        >
                          <option value="tots">Tots</option>
                          <option value="dobles">Dobles</option>
                          <option value="individual">Individual</option>
                        </select>
                      </div>

                      <div className="admin__court-filter-actions">
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={resetCourtFilters}
                        >
                          Netejar filtres
                        </button>
                      </div>
                    </div>

                    <div
                      className={`admin__court-quick-stats ${
                        isMobileView
                          ? "admin__court-quick-stats--mobile"
                          : ""
                      }`}
                    >
                      <div className="admin__court-quick-stat">
                        <span className="admin__court-quick-stat-label">
                          Mostrades
                        </span>
                        <span className="admin__court-quick-stat-value">
                          {filteredCourts.length}
                        </span>
                      </div>

                      <div className="admin__court-quick-stat">
                        <span className="admin__court-quick-stat-label">
                          Disponibles
                        </span>
                        <span className="admin__court-quick-stat-value">
                          {filteredAvailableCourtsCount}
                        </span>
                      </div>

                      <div className="admin__court-quick-stat">
                        <span className="admin__court-quick-stat-label">
                          Manteniment
                        </span>
                        <span className="admin__court-quick-stat-value">
                          {filteredMaintenanceCourtsCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {filteredCourts.length > 0 ? (
                    <div
                      className={`admin__cards admin__cards--courts ${
                        isMobileView ? "admin__cards--mobile" : ""
                      }`}
                    >
                      {visibleCourtCards.map((court) => (
                        <div
                          key={court.id}
                          id={`admin-court-card-${court.id}`}
                          className="admin__court-card-shell"
                        >
                          <CourtCard
                            court={court}
                            onEdit={() => handleStartEditCourt(court)}
                            onStartDelete={() => {
                              setConfirmingCourtId(court.id);

                              setTimeout(() => {
                                scrollToCourtCard(court.id);
                              }, 150);
                            }}
                            onAbortDelete={() => setConfirmingCourtId(null)}
                            onDelete={() => handleDeleteCourt(court.id)}
                            confirmingDelete={confirmingCourtId === court.id}
                            isDeleting={deletingCourtId === court.id}
                            isHighlighted={highlightedCourtId === court.id}
                          />
                        </div>
                      ))}

                      {filteredCourts.length > 4 && (
                        <div className="admin__courts-toggle">
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={() =>
                              setShowAllCourtCards((currentValue) => !currentValue)
                            }
                          >
                            {showAllCourtCards
                              ? "Veure menys pistes"
                              : `Veure totes les pistes (${filteredCourts.length})`}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pb-surface-card admin__empty-filtered-state admin__empty-filtered-state--courts">
                      <p className="admin__empty-filtered-title">
                        No hi ha pistes que coincideixin
                      </p>
                      <p className="admin__empty-filtered-text">
                        Revisa els filtres aplicats o neteja la cerca per tornar
                        a veure totes les pistes.
                      </p>

                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={resetCourtFilters}
                      >
                        Mostrar totes les pistes
                      </button>
                    </div>
                  )}

                  <div className="pb-surface-card admin__section-card admin__maintenance-editor">
                    <div
                      className={`admin__section-header ${
                        isMobileView ? "admin__section-header--mobile" : ""
                      }`}
                    >
                      <div>
                        <span className="pb-kicker">Nou bloqueig</span>
                        <h3 className="pb-panel-title admin__maintenance-title">
                          Crear manteniment
                        </h3>
                        <p className="pb-panel-text">
                          Bloqueja una pista en una franja i data concreta per manteniment.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() =>
                          setShowCreateMaintenanceForm((currentValue) => !currentValue)
                        }
                      >
                        {showCreateMaintenanceForm
                          ? "Amagar formulari"
                          : "Crear manteniment"}
                      </button>
                    </div>

                    {showCreateMaintenanceForm && (
                      <>
                        <div
                          className={`admin__maintenance-edit-grid ${
                            isMobileView ? "admin__maintenance-edit-grid--mobile" : ""
                          }`}
                        >
                          <div className="admin__court-filter-field">
                        <label className="admin__filter-label" htmlFor="maintenanceCreateCourt">
                          Pista
                        </label>
                        <select
                          id="maintenanceCreateCourt"
                          className="pb-input"
                          value={maintenanceForm.court_id}
                          onChange={(e) =>
                            handleMaintenanceFormChange("court_id", e.target.value)
                          }
                        >
                          <option value="">Selecciona pista</option>
                          {maintenanceAvailableCourts.map((court) => (
                            <option key={court.id} value={court.id}>
                              {court.nom_pista}
                            </option>
                          ))}
                        </select>
                      </div>

                          <div className="admin__court-filter-field">
                            <label className="admin__filter-label" htmlFor="maintenanceCreateStartTime">
                              Hora inici
                            </label>
                            <select
                              id="maintenanceCreateStartTime"
                              className="pb-input"
                              value={maintenanceForm.hora_inici}
                              onChange={(e) =>
                                handleMaintenanceFormChange("hora_inici", e.target.value)
                              }
                            >
                              <option value="">Selecciona hora inici</option>
                              {maintenanceStartSlots.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="admin__court-filter-field">
                            <label className="admin__filter-label" htmlFor="maintenanceCreateEndTime">
                              Hora final
                            </label>
                            <select
                              id="maintenanceCreateEndTime"
                              className="pb-input"
                              value={maintenanceForm.hora_fi}
                              onChange={(e) =>
                                handleMaintenanceFormChange("hora_fi", e.target.value)
                              }
                            >
                              <option value="">Selecciona hora final</option>
                              {filteredMaintenanceEndSlots.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="admin__court-filter-field">
                            <label className="admin__filter-label" htmlFor="maintenanceCreateDate">
                              Data
                            </label>
                            <input
                              id="maintenanceCreateDate"
                              type="date"
                              className="pb-input"
                              min={todayString}
                              value={maintenanceForm.data_bloqueig}
                              onChange={(e) =>
                                handleMaintenanceFormChange("data_bloqueig", e.target.value)
                              }
                            />
                          </div>

                          <div className="admin__court-filter-field admin__maintenance-edit-field-full">
                            <label className="admin__filter-label" htmlFor="maintenanceCreateReason">
                              Motiu
                            </label>
                            <textarea
                              id="maintenanceCreateReason"
                              className="pb-input admin__maintenance-textarea"
                              rows="4"
                              value={maintenanceForm.motiu}
                              onChange={(e) =>
                                handleMaintenanceFormChange("motiu", e.target.value)
                              }
                              placeholder="Explica el motiu del manteniment..."
                            />
                          </div>
                        </div>

                        <div className="admin__maintenance-edit-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreateMaintenance}
                            disabled={savingMaintenance}
                          >
                            {savingMaintenance ? "Creant..." : "Crear manteniment"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={resetMaintenanceEditor}
                            disabled={savingMaintenance}
                          >
                            Netejar camps
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {editingMaintenanceId && (
                    <div
                      ref={maintenanceEditorRef}
                      className="pb-surface-card admin__section-card admin__maintenance-editor"
                    >
                      <div
                        className={`admin__section-header ${
                          isMobileView ? "admin__section-header--mobile" : ""
                        }`}
                      >
                        <div>
                          <span className="pb-kicker">Edició</span>
                          <h3 className="pb-panel-title admin__maintenance-title">
                            Editar manteniment
                          </h3>
                          <p className="pb-panel-text">
                            Modifica la pista, franja, data i motiu del bloqueig seleccionat.
                          </p>
                        </div>

                        <span className="pb-badge-pill pb-badge-pill--blue">
                          {editingMaintenanceCourtName}
                        </span>
                      </div>

                      <div
                        className={`admin__maintenance-edit-grid ${
                          isMobileView ? "admin__maintenance-edit-grid--mobile" : ""
                        }`}
                      >
                        <div className="admin__court-filter-field">
                          <label className="admin__filter-label" htmlFor="maintenanceEditCourt">
                            Pista
                          </label>
                          <select
                            id="maintenanceEditCourt"
                            className="pb-input"
                            value={maintenanceForm.court_id}
                            onChange={(e) =>
                              handleMaintenanceFormChange("court_id", e.target.value)
                            }
                          >
                            <option value="">Selecciona pista</option>
                            {maintenanceAvailableCourts.map((court) => (
                              <option key={court.id} value={court.id}>
                                {court.nom_pista}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="admin__court-filter-field">
                          <label className="admin__filter-label" htmlFor="maintenanceEditStartTime">
                            Hora inici
                          </label>
                          <select
                            id="maintenanceEditStartTime"
                            className="pb-input"
                            value={maintenanceForm.hora_inici}
                            onChange={(e) =>
                              handleMaintenanceFormChange("hora_inici", e.target.value)
                            }
                          >
                            <option value="">Selecciona hora inici</option>
                            {maintenanceStartSlots.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="admin__court-filter-field">
                          <label className="admin__filter-label" htmlFor="maintenanceEditEndTime">
                            Hora final
                          </label>
                          <select
                            id="maintenanceEditEndTime"
                            className="pb-input"
                            value={maintenanceForm.hora_fi}
                            onChange={(e) =>
                              handleMaintenanceFormChange("hora_fi", e.target.value)
                            }
                          >
                            <option value="">Selecciona hora final</option>
                            {filteredMaintenanceEndSlots.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="admin__court-filter-field">
                          <label className="admin__filter-label" htmlFor="maintenanceEditDate">
                            Data
                          </label>
                          <input
                            id="maintenanceEditDate"
                            type="date"
                            className="pb-input"
                            min={todayString}
                            value={maintenanceForm.data_bloqueig}
                            onChange={(e) =>
                              handleMaintenanceFormChange("data_bloqueig", e.target.value)
                            }
                          />
                        </div>

                        <div className="admin__court-filter-field admin__maintenance-edit-field-full">
                          <label className="admin__filter-label" htmlFor="maintenanceEditReason">
                            Motiu
                          </label>
                          <textarea
                            id="maintenanceEditReason"
                            className="pb-input admin__maintenance-textarea"
                            rows="4"
                            value={maintenanceForm.motiu}
                            onChange={(e) =>
                              handleMaintenanceFormChange("motiu", e.target.value)
                            }
                            placeholder="Explica el motiu del manteniment..."
                          />
                        </div>
                      </div>

                      <div className="admin__maintenance-edit-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleSaveMaintenance}
                          disabled={savingMaintenance}
                        >
                          {savingMaintenance ? "Guardant..." : "Guardar canvis"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={resetMaintenanceEditor}
                          disabled={savingMaintenance}
                        >
                          Cancel·lar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pb-surface-card admin__section-card admin__maintenance-panel admin__section-card--subtle">
                    <div
                      className={`admin__section-header ${
                        isMobileView ? "admin__section-header--mobile" : ""
                      }`}
                    >
                      <div>
                        <span className="pb-kicker">Control existent</span>
                        <h3 className="pb-panel-title admin__maintenance-title">
                          Manteniments creats
                        </h3>
                        <p className="pb-panel-text">
                          Consulta els bloquejos registrats i localitza ràpidament
                          la pista afectada.
                        </p>
                      </div>

                      <span className="pb-badge-pill pb-badge-pill--amber">
                        {filteredMaintenanceBlocks.length} visibles
                      </span>
                    </div>

                    <div
                      className={`admin__court-tools-grid ${
                        isMobileView ? "admin__court-tools-grid--mobile" : ""
                      }`}
                    >
                      <div className="admin__court-filter-field">
                        <label
                          htmlFor="maintenanceSearch"
                          className="admin__filter-label"
                        >
                          Cercar manteniment
                        </label>
                        <input
                          id="maintenanceSearch"
                          type="text"
                          value={maintenanceSearch}
                          onChange={(e) => setMaintenanceSearch(e.target.value)}
                          placeholder="Pista o motiu..."
                          className="pb-input"
                        />
                      </div>

                      <div className="admin__court-filter-field">
                        <label
                          htmlFor="maintenancePeriodFilter"
                          className="admin__filter-label"
                        >
                          Període
                        </label>
                        <select
                          id="maintenancePeriodFilter"
                          value={maintenancePeriodFilter}
                          onChange={(e) =>
                            setMaintenancePeriodFilter(e.target.value)
                          }
                          className="pb-input"
                        >
                          <option value="tots">Tots</option>
                          <option value="futurs">Avui i futurs</option>
                          <option value="avui">Només avui</option>
                          <option value="passats">Passats</option>
                        </select>
                      </div>

                      <div className="admin__court-filter-actions">
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={resetMaintenanceFilters}
                        >
                          Netejar filtres
                        </button>
                      </div>
                    </div>

                    <div
                      className={`admin__maintenance-stats ${
                        isMobileView ? "admin__maintenance-stats--mobile" : ""
                      }`}
                    >
                      <div className="admin__maintenance-stat">
                        <span className="admin__maintenance-stat-label">
                          Totals
                        </span>
                        <span className="admin__maintenance-stat-value">
                          {maintenanceBlocks.length}
                        </span>
                      </div>

                      <div className="admin__maintenance-stat">
                        <span className="admin__maintenance-stat-label">
                          Avui
                        </span>
                        <span className="admin__maintenance-stat-value">
                          {maintenanceTodayCount}
                        </span>
                      </div>

                      <div className="admin__maintenance-stat">
                        <span className="admin__maintenance-stat-label">
                          Pendents
                        </span>
                        <span className="admin__maintenance-stat-value">
                          {maintenanceFutureCount}
                        </span>
                      </div>
                    </div>

                    {filteredMaintenanceBlocks.length > 0 ? (
                      <div className="admin__maintenance-list">
                        {visibleMaintenanceBlocks.map((block) => (
                          <article
                            key={block.id}
                            className="admin__maintenance-card"
                          >
                            <div className="admin__maintenance-card-top">
                              <div>
                                <p className="admin__maintenance-card-kicker">
                                  {formatDateOnly(block.date)}
                                </p>
                                <h4 className="admin__maintenance-card-title">
                                  {block.courtName}
                                </h4>
                              </div>

                              <span className="admin__maintenance-slot">
                                {String(block.startTime).slice(0, 5)} - {String(block.endTime).slice(0, 5)}
                              </span>
                            </div>

                            <div className="admin__maintenance-meta">
                              <span className="admin__maintenance-meta-item">
                                Tipus: {block.courtType || "No definit"}
                              </span>
                              <span className="admin__maintenance-meta-item">
                                Coberta: {block.covered ? "Sí" : "No"}
                              </span>
                              <span className="admin__maintenance-meta-item">
                                Estat pista: {block.courtStatus || "No disponible"}
                              </span>
                            </div>

                            <p className="admin__maintenance-reason">
                              {block.reason}
                            </p>

                            <div className="admin__maintenance-footer">
                              <span className="admin__maintenance-created-at">
                                Creat: {formatDateTime(block.createdAt)}
                              </span>

                              <div
                                className={`admin__maintenance-actions ${
                                  isMobileView ? "admin__maintenance-actions--mobile" : ""
                                }`}
                              >
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() => scrollToCourtCard(block.courtId)}
                                >
                                  Veure pista
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() => handleStartEditMaintenance(block)}
                                >
                                  Editar
                                </button>

                                {confirmingMaintenanceId === block.id ? (
                                  <div className="admin__maintenance-confirm-actions">
                                    <button
                                      type="button"
                                      className="btn btn-danger admin__maintenance-confirm-button"
                                      onClick={() => handleDeleteMaintenance(block.id)}
                                    >
                                      Confirmar
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-light admin__maintenance-cancel-button"
                                      onClick={() => setConfirmingMaintenanceId(null)}
                                    >
                                      Cancel·lar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => setConfirmingMaintenanceId(block.id)}
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}

                        {filteredMaintenanceBlocks.length > 4 && (
                          <div className="admin__maintenance-toggle">
                            <button
                              type="button"
                              className="btn btn-light"
                              onClick={() =>
                                setShowAllMaintenanceBlocks((currentValue) => !currentValue)
                              }
                            >
                              {showAllMaintenanceBlocks
                                ? "Veure menys manteniments"
                                : `Veure tots els manteniments (${filteredMaintenanceBlocks.length})`}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="admin__empty-filtered-state admin__maintenance-empty-state">
                        <p className="admin__empty-filtered-title">
                          No hi ha manteniments que coincideixin
                        </p>
                        <p className="admin__empty-filtered-text">
                          Revisa els filtres aplicats o neteja la cerca per tornar
                          a veure tots els bloquejos disponibles.
                        </p>

                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={resetMaintenanceFilters}
                        >
                          Mostrar tots els manteniments
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
