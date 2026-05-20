import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner";
import { scrollToElementWithOffset, normalizeSpaces } from "../../utils/helpers";
import "./ProfilePage.css";

function renderPasswordToggleIcon(isVisible) {
  if (isVisible) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 3L21 21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10.58 10.58C10.22 10.94 10 11.44 10 12C10 13.1 10.9 14 12 14C12.56 14 13.06 13.78 13.42 13.42"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9.36 5.35C10.2 5.12 11.08 5 12 5C16.5 5 20.27 7.91 21.5 12C21.16 13.12 20.58 14.15 19.82 15.02"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6.62 6.62C4.69 7.82 3.22 9.7 2.5 12C3.73 16.09 7.5 19 12 19C13.78 19 15.42 18.55 16.83 17.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 12C3.73 7.91 7.5 5 12 5C16.5 5 20.27 7.91 21.5 12C20.27 16.09 16.5 19 12 19C7.5 19 3.73 16.09 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfilePage() {
  const topFeedbackRef = useRef(null);
  const profileFormRef = useRef(null);
  const passwordFormRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  const [isTabletOrMobile, setIsTabletOrMobile] = useState(window.innerWidth <= 980);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [formData, setFormData] = useState({
    nom: "",
    llinatges: "",
    email: "",
    telefon: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [capsLockCurrent, setCapsLockCurrent] = useState(false);
  const [capsLockNew, setCapsLockNew] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("success");
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsTabletOrMobile(window.innerWidth <= 980);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchProfile();

    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const showFeedbackMessage = (message, type = "success") => {
    setFeedback(message);
    setFeedbackType(type);

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback("");
    }, 4500);

    setTimeout(() => {
      scrollToElementWithOffset(topFeedbackRef.current, 130);
    }, 80);
  };

  const clearFeedback = () => {
    setFeedback("");
  };

  const isSessionExpiredError = (err) => err?.response?.status === 401;

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      setLoadError("");
      clearFeedback();

      const response = await api.get("/auth/me");
      const userData = response?.data?.data || null;

      if (!userData) {
        throw new Error("No s'han pogut carregar les dades del compte.");
      }

      setProfile(userData);
      setFormData({
        nom: userData.nom || "",
        llinatges: userData.llinatges || "",
        email: userData.email || "",
        telefon: userData.telefon || "",
      });

      localStorage.setItem("user", JSON.stringify(userData));
      } catch (err) {
        console.error(err);

        if (isSessionExpiredError(err)) {
          return;
        }

        const errorMessage =
          err.response?.data?.error ||
          "No s'han pogut carregar les dades del compte.";

        setLoadError(errorMessage);
        showFeedbackMessage(errorMessage, "error");
      } finally {
        setLoadingProfile(false);
      }
  };

  const roleLabel = useMemo(() => {
    if (!profile?.rol) return "Usuari";
    if (profile.rol === "admin") return "Administrador";
    if (profile.rol === "gestor") return "Gestor";
    return "Usuari";
  }, [profile]);

  const normalizedProfile = useMemo(() => {
    return {
      nom: normalizeSpaces(profile?.nom || ""),
      llinatges: normalizeSpaces(profile?.llinatges || ""),
      email: (profile?.email || "").trim().toLowerCase(),
      telefon: (profile?.telefon || "").trim(),
    };
  }, [profile]);

  const normalizedForm = useMemo(() => {
    return {
      nom: normalizeSpaces(formData.nom || ""),
      llinatges: normalizeSpaces(formData.llinatges || ""),
      email: (formData.email || "").trim().toLowerCase(),
      telefon: (formData.telefon || "").trim(),
    };
  }, [formData]);

  const hasProfileChanges = useMemo(() => {
    if (!profile) return false;

    return (
      normalizedProfile.nom !== normalizedForm.nom ||
      normalizedProfile.llinatges !== normalizedForm.llinatges ||
      normalizedProfile.email !== normalizedForm.email ||
      normalizedProfile.telefon !== normalizedForm.telefon
    );
  }, [profile, normalizedProfile, normalizedForm]);

  const normalizedPhone = useMemo(() => {
    return (formData.telefon || "").replace(/\s+/g, "").trim();
  }, [formData.telefon]);

  const isPhoneValid = useMemo(() => {
    if (!normalizedPhone) return true;
    return /^[0-9]{9}$/.test(normalizedPhone);
  }, [normalizedPhone]);

  const phoneValidationMessage = useMemo(() => {
    if (!normalizedPhone) return "";
    if (!/^[0-9]+$/.test(normalizedPhone)) {
      return "El número de telèfon només pot contenir números.";
    }
    if (!/^[0-9]{9}$/.test(normalizedPhone)) {
      return "El número de telèfon ha de tenir exactament 9 dígits.";
    }
    return "";
  }, [normalizedPhone]);

  const firstName = useMemo(() => {
    if (!profile?.nom) return "Usuari";
    return profile.nom;
  }, [profile]);

  const initials = useMemo(() => {
    const nom = profile?.nom?.trim() || "";
    const llinatges = profile?.llinatges?.trim() || "";

    const firstInitial = nom ? nom[0].toUpperCase() : "U";
    const secondInitial = llinatges ? llinatges[0].toUpperCase() : "";

    return `${firstInitial}${secondInitial}` || "U";
  }, [profile]);

  const passwordChecks = useMemo(() => {
    const newPassword = passwordData.newPassword;

    return {
      minLength: newPassword.length >= 8,
      lowercase: /[a-z]/.test(newPassword),
      uppercase: /[A-Z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      symbol: /[^A-Za-z0-9]/.test(newPassword),
      different:
        !!newPassword &&
        !!passwordData.currentPassword &&
        newPassword !== passwordData.currentPassword,
    };
  }, [passwordData]);

  const completedPasswordChecks = Object.values(passwordChecks).filter(Boolean).length;

  const hasPasswordDraft = passwordData.newPassword.trim().length > 0;

  const passwordDraftStrengthText = !hasPasswordDraft
    ? "Sense avaluar"
    : completedPasswordChecks === 6
    ? "Alta"
    : completedPasswordChecks >= 4
    ? "Mitjana"
    : "Baixa";

  const passwordDraftStrengthClass = !hasPasswordDraft
    ? "pb-badge-pill pb-badge-pill--blue"
    : completedPasswordChecks === 6
    ? "pb-badge-pill pb-badge-pill--green"
    : completedPasswordChecks >= 4
    ? "pb-badge-pill pb-badge-pill--amber"
    : "pb-badge-pill pb-badge-pill--rose";

  const [accountSecurityLevel, setAccountSecurityLevel] = useState(() => {
    return localStorage.getItem("padelbook-account-security-level") || "Mitjana";
  });

  useEffect(() => {
    localStorage.setItem("padelbook-account-security-level", accountSecurityLevel);
  }, [accountSecurityLevel]);

  const accountSecurityClass =
    accountSecurityLevel === "Alta"
      ? "pb-badge-pill pb-badge-pill--green"
      : accountSecurityLevel === "Mitjana"
      ? "pb-badge-pill pb-badge-pill--amber"
      : "pb-badge-pill pb-badge-pill--rose";

  const emailVerificationLabel = profile?.email_verificat === 1 ? "Verificat" : "Pendent";

  const emailVerificationBadgeClass =
    profile?.email_verificat === 1
      ? "pb-badge-pill pb-badge-pill--green"
      : "pb-badge-pill pb-badge-pill--amber";

  const accountSummaryCards = [
    {
      label: "Estat del perfil",
      value: hasProfileChanges ? "Amb canvis" : "Actualitzat",
      text: hasProfileChanges
        ? "Hi ha informació pendent de guardar."
        : "Les dades actuals estan sincronitzades.",
    },
    {
      label: "Rol del compte",
      value: roleLabel,
      text:
        profile?.rol === "admin"
          ? "Tens accés a eines de gestió i administració."
          : profile?.rol === "gestor"
          ? "Tens accés a eines de gestió del club."
          : "Tens accés a les funcionalitats habituals de reserva.",
    },
    {
      label: "Seguretat",
      value: `Nivell ${accountSecurityLevel.toLowerCase()}`,
      text: "Pots reforçar la sessió actualitzant la contrasenya quan vulguis.",
    },
  ];

  const accountDetailItems = [
    {
      label: "Nom",
      value: profile?.nom || "-",
    },
    {
      label: "Llinatges",
      value: profile?.llinatges || "-",
    },
    {
      label: "Correu",
      value: profile?.email || "-",
    },
    {
      label: "Telèfon",
      value: profile?.telefon || "No definit",
    },
    {
      label: "Verificació",
      value: emailVerificationLabel,
    },
    {
      label: "Rol",
      value: roleLabel,
    },
    {
      label: "Sessió",
      value: "Activa",
    },
  ];

  const handleProfileChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;

    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateProfileForm = () => {
    const cleanNom = normalizeSpaces(formData.nom);
    const cleanLlinatges = normalizeSpaces(formData.llinatges);
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanTelefon = (formData.telefon || "").replace(/\s+/g, "").trim();

    if (!cleanNom || !cleanLlinatges || !cleanEmail) {
      return "Has d'omplir el nom, els llinatges i el correu electrònic.";
    }

    if (cleanNom.length < 2) {
      return "El nom ha de tenir almenys 2 caràcters.";
    }

    if (cleanLlinatges.length < 2) {
      return "Els llinatges han de tenir almenys 2 caràcters.";
    }

    const emailRegex = /^[^\s@]{2,}@[^\s@]{2,}\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return "Introdueix un correu electrònic vàlid.";
    }

    if (cleanTelefon && !/^[0-9]{9}$/.test(cleanTelefon)) {
      return "Introdueix un número de telèfon vàlid de 9 dígits.";
    }

    return "";
  };

  const validatePasswordForm = () => {
    const { currentPassword, newPassword } = passwordData;

    if (!currentPassword.trim() || !newPassword.trim()) {
      return "Has d'omplir la contrasenya actual i la nova.";
    }

    if (newPassword.length < 8) {
      return "La nova contrasenya ha de tenir almenys 8 caràcters.";
    }

    if (!/[a-z]/.test(newPassword)) {
      return "La nova contrasenya ha d'incloure almenys una lletra minúscula.";
    }

    if (!/[A-Z]/.test(newPassword)) {
      return "La nova contrasenya ha d'incloure almenys una lletra majúscula.";
    }

    if (!/[0-9]/.test(newPassword)) {
      return "La nova contrasenya ha d'incloure almenys un número.";
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return "La nova contrasenya ha d'incloure almenys un símbol.";
    }

    if (currentPassword === newPassword) {
      return "La nova contrasenya ha de ser diferent de l'actual.";
    }

    return "";
  };

  const handleResetProfileChanges = () => {
    if (!profile) return;

    setFormData({
      nom: profile.nom || "",
      llinatges: profile.llinatges || "",
      email: profile.email || "",
      telefon: profile.telefon || "",
    });

    showFeedbackMessage("S'han restablert els canvis pendents del perfil.", "success");
  };

  const handleClearPasswordForm = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
    });

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setCapsLockCurrent(false);
    setCapsLockNew(false);

    showFeedbackMessage("S'han netejat els camps de la contrasenya.", "success");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const validationError = validateProfileForm();
    if (validationError) {
      showFeedbackMessage(validationError, "error");
      return;
    }

    if (!hasProfileChanges) {
      showFeedbackMessage("No hi ha canvis per guardar al perfil.", "error");
      return;
    }

    try {
      setSavingProfile(true);
      clearFeedback();

      const payload = {
        nom: normalizeSpaces(formData.nom),
        llinatges: normalizeSpaces(formData.llinatges),
        email: formData.email.trim().toLowerCase(),
        telefon: (formData.telefon || "").trim(),
      };

      const response = await api.put("/auth/me", payload);
      const updatedUser = response?.data?.data || {
        ...profile,
        ...payload,
      };

      setProfile(updatedUser);
      setFormData({
        nom: updatedUser.nom || payload.nom,
        llinatges: updatedUser.llinatges || payload.llinatges,
        email: updatedUser.email || payload.email,
        telefon: updatedUser.telefon || payload.telefon,
      });

      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("profile-updated"));

      showFeedbackMessage(
        updatedUser.email_verificat === 1
          ? "Perfil actualitzat correctament."
          : "Perfil actualitzat correctament. Revisa el teu correu per verificar la nova adreça electrònica.",
        "success"
      );
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      const backendError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "No s'ha pogut actualitzar el perfil.";

      showFeedbackMessage(backendError, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    const validationError = validatePasswordForm();
    if (validationError) {
      showFeedbackMessage(validationError, "error");
      return;
    }

    try {
      setChangingPassword(true);
      clearFeedback();

      await api.put("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setAccountSecurityLevel(
        completedPasswordChecks === 6
          ? "Alta"
          : completedPasswordChecks >= 4
          ? "Mitjana"
          : "Baixa"
      );

      setPasswordData({
        currentPassword: "",
        newPassword: "",
      });

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setCapsLockCurrent(false);
      setCapsLockNew(false);

      showFeedbackMessage("Contrasenya canviada correctament.", "success");
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      const backendError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "No s'ha pogut canviar la contrasenya.";

      showFeedbackMessage(backendError, "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCapsLockCurrent = (e) => {
    setCapsLockCurrent(e.getModifierState("CapsLock"));
  };

  const handleCapsLockNew = (e) => {
    setCapsLockNew(e.getModifierState("CapsLock"));
  };

  const handleResendVerification = async () => {
    try {
      setResendingVerification(true);
      clearFeedback();

      const response = await api.post("/auth/resend-verification", {
        email: (profile?.email || formData.email || "").trim().toLowerCase(),
      });
      const successMessage =
        response?.data?.message ||
        response?.data?.data?.message ||
        "T'hem reenviat el correu de verificació.";

      showFeedbackMessage(successMessage, "success");
    } catch (err) {
      console.error(err);

      const backendError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "No s'ha pogut reenviar el correu de verificació.";

      showFeedbackMessage(backendError, "error");
    } finally {
      setResendingVerification(false);
    }
  };

  if (loadingProfile) {
    return (
      <LoadingSpinner
        text="Carregant dades del teu compte..."
        minHeight="250px"
      />
    );
  }

  return (
    <div className="profile__page">
      <div
        className={`profile__container ${isTabletOrMobile ? "profile__container--mobile" : ""}`}
      >
        <section
          className={`fade-in-up profile__hero ${isTabletOrMobile ? "profile__hero--mobile" : ""}`}
        >
          <div
            className={`profile__hero-layout ${isTabletOrMobile ? "profile__hero-layout--mobile" : ""}`}
          >
            <div className="profile__hero-main">
              <span className="profile__hero-kicker">El meu compte</span>

              <div className="profile__hero-identity-row">
                <div className="profile__hero-avatar">{initials}</div>

                <div className="profile__hero-identity-text">
                  <h1
                    className={`profile__hero-title ${isTabletOrMobile ? "profile__hero-title--mobile" : ""}`}
                  >
                    Hola, {firstName}
                  </h1>

                  <p className="profile__hero-subtitle">
                    Revisa el perfil, mantén el correu actualitzat, controla l'estat
                    de verificació i reforça la seguretat del compte des d’un espai
                    molt més clar i ordenat.
                  </p>
                </div>
              </div>

              <div
                className={`profile__hero-actions ${isTabletOrMobile ? "profile__hero-actions--mobile" : ""}`}
              >
                <button
                  type="button"
                  className="profile__hero-btn profile__hero-btn--secondary"
                  onClick={() => scrollToElementWithOffset(profileFormRef.current, 110)}
                >
                  Editar perfil
                </button>

                <button
                  type="button"
                  className="profile__hero-btn profile__hero-btn--secondary"
                  onClick={() => scrollToElementWithOffset(passwordFormRef.current, 110)}
                >
                  Canviar contrasenya
                </button>
              </div>
            </div>

            <aside className="profile__hero-aside">
              <div className="profile__hero-aside-card">
                <div className="profile__hero-aside-top-row">
                  <div className="profile__hero-aside-identity">
                    <span className="profile__hero-aside-label">Compte actual</span>
                    <span className="profile__hero-aside-name">
                      {`${profile?.nom || ""} ${profile?.llinatges || ""}`.trim() || "Usuari"}
                    </span>
                    <p className="profile__hero-aside-email">{profile?.email || "-"}</p>
                  </div>

                  <span
                    className={`pb-badge-pill ${
                      profile?.rol === "admin"
                        ? "pb-badge-pill--blue"
                        : profile?.rol === "gestor"
                        ? "pb-badge-pill--amber"
                        : "pb-badge-pill--green"
                    } profile__hero-role-badge`}
                  >
                    {roleLabel}
                  </span>
                </div>

                <div className="profile__hero-aside-mini-stats">
                  <div className="profile__hero-aside-mini-stat">
                    <span className="profile__hero-aside-mini-label">Perfil</span>
                    <span className="profile__hero-aside-mini-value">
                      {hasProfileChanges ? "Pendent" : "Correcte"}
                    </span>
                  </div>

                  <div className="profile__hero-aside-mini-stat">
                    <span className="profile__hero-aside-mini-label">Verificació</span>
                    <span className="profile__hero-aside-mini-value">{emailVerificationLabel}</span>
                  </div>

                  <div className="profile__hero-aside-mini-stat">
                    <span className="profile__hero-aside-mini-label">Seguretat</span>
                    <span className="profile__hero-aside-mini-value">{accountSecurityLevel}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div ref={topFeedbackRef} />

        {feedback && (
          <section className="scale-in profile__feedback-section">
            <div
              className={`pb-feedback ${
                feedbackType === "success"
                  ? "pb-feedback--success"
                  : "pb-feedback--error"
              }`}
            >
              <p className="pb-feedback__text">{feedback}</p>
            </div>
          </section>
        )}

        {loadError ? (
          <section className="scale-in profile__feedback-section">
            <div className="pb-feedback pb-feedback--error profile__error-wrapper">
              <p className="profile__error-title">No s'han pogut carregar les dades</p>
              <p className="profile__error-text">{loadError}</p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={fetchProfile}
              >
                Tornar-ho a intentar
              </button>
            </div>
          </section>
        ) : (
          <>
            <section
              className={`fade-in-up delay-1 profile__summary-grid ${isTabletOrMobile ? "profile__summary-grid--mobile" : ""}`}
            >
              {accountSummaryCards.map((item) => (
                <article key={item.label} className="pb-surface-card profile__summary-card">
                  <span className="profile__summary-label">{item.label}</span>
                  <span className="profile__summary-value">{item.value}</span>
                  <p className="profile__summary-text">{item.text}</p>
                </article>
              ))}
            </section>

            <div
              className={`profile__content-layout ${isTabletOrMobile ? "profile__content-layout--mobile" : ""}`}
            >
              <main className="profile__main-column">
                <section
                  ref={profileFormRef}
                  className="fade-in-up delay-2 pb-surface-card profile__card"
                >
                  <div className="profile__card-header">
                    <div>
                      <span className="pb-kicker">Dades personals</span>
                      <h2 className="pb-panel-title">Informació del compte</h2>
                      <p className="pb-panel-text">
                        Modifica el teu nom, els llinatges i el correu electrònic associat
                        a la sessió.
                      </p>
                    </div>

                    <span
                      className={`pb-badge-pill ${
                        hasProfileChanges
                          ? "pb-badge-pill--blue"
                          : "pb-badge-pill--green"
                      }`}
                    >
                      {hasProfileChanges ? "Canvis pendents" : "Sense canvis"}
                    </span>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="profile__form">
                    <div
                      className={`profile__form-grid ${isTabletOrMobile ? "profile__form-grid--mobile" : ""}`}
                    >
                      <div className="pb-form-field">
                        <label htmlFor="nom" className="pb-form-label">
                          Nom
                        </label>
                        <input
                          id="nom"
                          name="nom"
                          type="text"
                          value={formData.nom}
                          onChange={handleProfileChange}
                          placeholder="Ex: Pere"
                          className="pb-input"
                          required
                        />
                      </div>

                      <div className="pb-form-field">
                        <label htmlFor="llinatges" className="pb-form-label">
                          Llinatges
                        </label>
                        <input
                          id="llinatges"
                          name="llinatges"
                          type="text"
                          value={formData.llinatges}
                          onChange={handleProfileChange}
                          placeholder="Ex: Serra Tugores"
                          className="pb-input"
                          required
                        />
                      </div>

                      <div className="pb-form-field">
                        <label htmlFor="email" className="pb-form-label">
                          Correu electrònic
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleProfileChange}
                          placeholder="exemple@correu.com"
                          className="pb-input"
                          required
                        />
                      </div>

                      <div className="pb-form-field">
                        <label htmlFor="telefon" className="pb-form-label">
                          Número de telèfon
                        </label>
                        <input
                          id="telefon"
                          name="telefon"
                          type="tel"
                          value={formData.telefon}
                          onChange={handleProfileChange}
                          placeholder="Ex: 600123456"
                          className={`pb-input ${!isPhoneValid ? "pb-input--error" : ""}`}
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={9}
                        />
                        {phoneValidationMessage && (
                          <span className="pb-form-help pb-form-help--error">
                            {phoneValidationMessage}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="profile__info-strip">
                      <div className="profile__info-strip-icon">
                        {profile?.email_verificat === 1 ? "✓" : "!"}
                      </div>
                      <div>
                        <p className="profile__info-strip-title">
                          {profile?.email_verificat === 1
                            ? "Correu verificat"
                            : "Correu pendent de verificació"}
                        </p>
                        <p className="profile__info-strip-text">
                          {profile?.email_verificat === 1
                            ? "Aquest compte ja té el correu verificat i està llest per utilitzar totes les funcionalitats disponibles."
                            : "Verifica el correu electrònic per reforçar la seguretat del compte i assegurar l'accés correcte a les funcionalitats restringides."}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`profile__actions ${isTabletOrMobile ? "profile__actions--mobile" : ""}`}
                    >
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingProfile || !hasProfileChanges || !isPhoneValid}
                      >
                        {savingProfile ? "Guardant canvis..." : "Guardar canvis"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={handleResetProfileChanges}
                        disabled={!hasProfileChanges || savingProfile}
                      >
                        Restablir
                      </button>

                      {profile?.email_verificat !== 1 && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleResendVerification}
                          disabled={resendingVerification}
                        >
                          {resendingVerification
                            ? "Reenviant correu..."
                            : "Reenviar verificació"}
                        </button>
                      )}
                    </div>
                  </form>
                </section>

                <section
                  ref={passwordFormRef}
                  className="fade-in-up delay-3 pb-surface-card profile__card"
                >
                  <div className="profile__card-header">
                    <div>
                      <span className="pb-kicker">Seguretat</span>
                      <h2 className="pb-panel-title">Canviar contrasenya</h2>
                      <p className="pb-panel-text">
                        Actualitza la contrasenya amb una validació clara i en temps
                        real.
                      </p>
                    </div>

                    <div className="profile__card-header-status">
                      <span className={passwordDraftStrengthClass}>
                        Nova contrasenya: {passwordDraftStrengthText}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="profile__form">
                    <div className="pb-form-field">
                      <label htmlFor="currentPassword" className="pb-form-label">
                        Contrasenya actual
                      </label>

                      <div
                        className={`profile__password-wrapper ${isTabletOrMobile ? "profile__password-wrapper--mobile" : ""}`}
                      >
                        <input
                          id="currentPassword"
                          name="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={handlePasswordInputChange}
                          onKeyDown={handleCapsLockCurrent}
                          onKeyUp={handleCapsLockCurrent}
                          placeholder="Introdueix la contrasenya actual"
                          className="pb-input"
                          required
                        />

                        <button
                          type="button"
                          className={`profile__show-button ${isTabletOrMobile ? "profile__show-button--mobile" : ""}`}
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          aria-label={
                            showCurrentPassword
                              ? "Ocultar contrasenya actual"
                              : "Mostrar contrasenya actual"
                          }
                        >
                          {renderPasswordToggleIcon(showCurrentPassword)}
                        </button>
                      </div>

                      {capsLockCurrent && (
                        <span className="profile__caps-warning">
                          ⚠️ Tens el bloqueig de majúscules activat
                        </span>
                      )}
                    </div>

                    <div className="pb-form-field">
                      <label htmlFor="newPassword" className="pb-form-label">
                        Nova contrasenya
                      </label>

                      <div
                        className={`profile__password-wrapper ${isTabletOrMobile ? "profile__password-wrapper--mobile" : ""}`}
                      >
                        <input
                          id="newPassword"
                          name="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={handlePasswordInputChange}
                          onKeyDown={handleCapsLockNew}
                          onKeyUp={handleCapsLockNew}
                          placeholder="Mínim 8 caràcters"
                          className="pb-input"
                          required
                        />

                        <button
                          type="button"
                          className={`profile__show-button ${isTabletOrMobile ? "profile__show-button--mobile" : ""}`}
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={
                            showNewPassword
                              ? "Ocultar nova contrasenya"
                              : "Mostrar nova contrasenya"
                          }
                        >
                          {renderPasswordToggleIcon(showNewPassword)}
                        </button>
                      </div>

                      {capsLockNew && (
                        <span className="profile__caps-warning">
                          ⚠️ Tens el bloqueig de majúscules activat
                        </span>
                      )}
                    </div>

                    <div className="profile__checklist-panel">
                      <div className="profile__checklist-header">
                        <span className="profile__checklist-title">
                          Requisits de la nova contrasenya
                        </span>
                        <span className="profile__checklist-counter">
                          {completedPasswordChecks}/6 complets
                        </span>
                      </div>

                      <div className="profile__progress-track">
                        <div
                          className="profile__progress-fill"
                          style={{
                            width: `${(completedPasswordChecks / 6) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="profile__checklist">
                        <div className="profile__check-item">
                          <span className={passwordChecks.minLength ? "profile__check-ok" : "profile__check-pending"}>
                            {passwordChecks.minLength ? "✓" : "•"}
                          </span>
                          <span>Almenys 8 caràcters</span>
                        </div>

                        <div className="profile__check-item">
                          <span className={passwordChecks.lowercase ? "profile__check-ok" : "profile__check-pending"}>
                            {passwordChecks.lowercase ? "✓" : "•"}
                          </span>
                          <span>Inclou una minúscula</span>
                        </div>

                        <div className="profile__check-item">
                          <span className={passwordChecks.uppercase ? "profile__check-ok" : "profile__check-pending"}>
                            {passwordChecks.uppercase ? "✓" : "•"}
                          </span>
                          <span>Inclou una majúscula</span>
                        </div>

                        <div className="profile__check-item">
                          <span className={passwordChecks.number ? "profile__check-ok" : "profile__check-pending"}>
                            {passwordChecks.number ? "✓" : "•"}
                          </span>
                          <span>Inclou un número</span>
                        </div>

                        <div className="profile__check-item">
                          <span className={passwordChecks.symbol ? "profile__check-ok" : "profile__check-pending"}>
                            {passwordChecks.symbol ? "✓" : "•"}
                          </span>
                          <span>Inclou un símbol</span>
                        </div>

                        <div className="profile__check-item">
                          <span className={passwordChecks.different ? "profile__check-ok" : "profile__check-pending"}>
                            {passwordChecks.different ? "✓" : "•"}
                          </span>
                          <span>Ha de ser diferent de l’actual</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`profile__actions ${isTabletOrMobile ? "profile__actions--mobile" : ""}`}
                    >
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={changingPassword}
                      >
                        {changingPassword
                          ? "Canviant contrasenya..."
                          : "Canviar contrasenya"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={handleClearPasswordForm}
                        disabled={
                          changingPassword ||
                          (!passwordData.currentPassword && !passwordData.newPassword)
                        }
                      >
                        Netejar camps
                      </button>
                    </div>
                  </form>
                </section>
              </main>

              <aside className="profile__sidebar-column">
                <div
                  className={`profile__sidebar-stack ${isTabletOrMobile ? "profile__sidebar-stack--mobile" : ""}`}
                >
                  <section
                    className="fade-in-up delay-3 pb-surface-card profile__sidebar-card"
                  >
                    <div className="profile__sidebar-card-header">
                      <span className="pb-kicker">Resum del compte</span>
                      <h3 className="profile__sidebar-title">Vista ràpida</h3>
                    </div>

                    <div className="profile__account-list">
                      {accountDetailItems.map((item) => (
                        <div key={item.label} className="profile__account-list-item">
                          <span className="profile__account-list-label">{item.label}</span>
                          <span className="profile__account-list-value">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section
                    className="fade-in-up delay-4 pb-surface-card profile__sidebar-card"
                  >
                    <div className="profile__sidebar-card-header">
                      <span className="pb-kicker">Estat actual</span>
                      <h3 className="profile__sidebar-title">Seguiment</h3>
                    </div>

                    <div className="profile__status-stack">
                      <div className="profile__status-row">
                        <span className="profile__status-label">Canvis al perfil</span>
                        <span
                          className={`pb-badge-pill ${
                            hasProfileChanges
                              ? "pb-badge-pill--blue"
                              : "pb-badge-pill--green"
                          }`}
                        >
                          {hasProfileChanges ? "Pendents" : "Al dia"}
                        </span>
                      </div>

                      <div className="profile__status-row">
                        <span className="profile__status-label">Verificació</span>
                        <span className={emailVerificationBadgeClass}>{emailVerificationLabel}</span>
                      </div>

                      <div className="profile__status-row">
                        <span className="profile__status-label">Contrasenya</span>
                        <span className={`profile__status-value ${accountSecurityClass}`}>
                          {accountSecurityLevel}
                        </span>
                      </div>

                      <div className="profile__status-row">
                        <span className="profile__status-label">Sessió</span>
                        <span className="pb-badge-pill pb-badge-pill--green">Activa</span>
                      </div>
                    </div>
                  </section>

                  <section
                    className="fade-in-up delay-4 pb-surface-card profile__sidebar-card"
                  >
                    <div className="profile__sidebar-card-header">
                      <span className="pb-kicker">Bones pràctiques</span>
                      <h3 className="profile__sidebar-title">Recomanacions</h3>
                    </div>

                    <div className="profile__tip-list">
                      <div className="profile__tip-item">
                        <span className="profile__tip-bullet">•</span>
                        <p className="profile__tip-text">
                          Revisa el correu si canvies l’adreça principal del compte.
                        </p>
                      </div>

                      <div className="profile__tip-item">
                        <span className="profile__tip-bullet">•</span>
                        <p className="profile__tip-text">
                          Evita reutilitzar la mateixa contrasenya en altres serveis.
                        </p>
                      </div>

                      <div className="profile__tip-item">
                        <span className="profile__tip-bullet">•</span>
                        <p className="profile__tip-text">
                          Guarda els canvis del perfil abans de sortir de la pàgina.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
