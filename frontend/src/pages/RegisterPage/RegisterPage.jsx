import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { normalizeSpaces } from "../../utils/helpers";
import "./RegisterPage.css";
import { getErrorMessage } from "../../utils/errorHandler";

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

function RegisterPage() {
  const navigate = useNavigate();
  const feedbackRef = useRef(null);

  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);

  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 900);

  const [nom, setNom] = useState("");
  const [llinatges, setLlinatges] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 900);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!error || !feedbackRef.current) return;

    const top =
      feedbackRef.current.getBoundingClientRect().top + window.scrollY - 120;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  }, [error]);

  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
      match: !!confirmPassword && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  const completedPasswordChecks = Object.values(passwordChecks).filter(Boolean).length;
  const passwordStrengthText =
    completedPasswordChecks <= 2
      ? "Baixa"
      : completedPasswordChecks <= 4
      ? "Mitjana"
      : "Alta";

  const resetTurnstile = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.turnstile &&
      turnstileWidgetIdRef.current !== null
    ) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }

    setTurnstileToken("");
  }, []);

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    if (!siteKey || !turnstileContainerRef.current) return;

    let attempts = 0;
    let intervalId = null;

    const renderWidget = () => {
      if (
        typeof window === "undefined" ||
        !window.turnstile ||
        turnstileWidgetIdRef.current !== null
      ) {
        return;
      }

      turnstileWidgetIdRef.current = window.turnstile.render(
        turnstileContainerRef.current,
        {
          sitekey: siteKey,
          theme: "light",
          callback: (token) => {
            setTurnstileToken(token || "");
            setError("");
          },
          "expired-callback": () => {
            setTurnstileToken("");
          },
          "error-callback": () => {
            setTurnstileToken("");
            setError("No s'ha pogut validar el captcha. Torna-ho a provar.");
          },
        }
      );

      setTurnstileReady(true);
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    intervalId = window.setInterval(() => {
      attempts += 1;

      if (window.turnstile) {
        renderWidget();
        window.clearInterval(intervalId);
      }

      if (attempts > 50) {
        window.clearInterval(intervalId);
      }
    }, 200);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      if (
        typeof window !== "undefined" &&
        window.turnstile &&
        turnstileWidgetIdRef.current !== null
      ) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  const validateForm = () => {
    const cleanNom = normalizeSpaces(nom);
    const cleanLlinatges = normalizeSpaces(llinatges);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanNom || !cleanLlinatges || !cleanEmail || !password.trim() || !confirmPassword.trim()) {
      return "Has d'omplir tots els camps.";
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

    if (password.length < 8) {
      return "La contrasenya ha de tenir almenys 8 caràcters.";
    }

    if (!/[a-z]/.test(password)) {
      return "La contrasenya ha d'incloure almenys una lletra minúscula.";
    }

    if (!/[A-Z]/.test(password)) {
      return "La contrasenya ha d'incloure almenys una lletra majúscula.";
    }

    if (!/[0-9]/.test(password)) {
      return "La contrasenya ha d'incloure almenys un número.";
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return "La contrasenya ha d'incloure almenys un símbol.";
    }

    if (password !== confirmPassword) {
      return "Les contrasenyes no coincideixen.";
    }

    if (!turnstileToken) {
      return "Has de completar la verificació de seguretat.";
    }

    return "";
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError("");
      setLoading(true);

      const cleanNom = normalizeSpaces(nom);
      const cleanLlinatges = normalizeSpaces(llinatges);
      const cleanEmail = email.trim().toLowerCase();

      await api.post("/auth/register", {
        nom: cleanNom,
        llinatges: cleanLlinatges,
        email: cleanEmail,
        password,
        turnstileToken,
      });

      setSuccess("Compte creat correctament. Redirigint al login...");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      console.error(err);

      const backendError = getErrorMessage(err, "");

      const normalizedError = backendError.toString().toLowerCase();

      if (
        normalizedError.includes("email") ||
        normalizedError.includes("correu") ||
        normalizedError.includes("duplicate") ||
        normalizedError.includes("duplicat") ||
        normalizedError.includes("exists") ||
        normalizedError.includes("exist") ||
        normalizedError.includes("already") ||
        normalizedError.includes("registrat") ||
        normalizedError.includes("usuari ja existeix")
      ) {
        setError("Aquest correu electrònic ja està registrat.");
      } else if (
        normalizedError.includes("captcha") ||
        normalizedError.includes("turnstile") ||
        normalizedError.includes("token")
      ) {
        setError("La verificació de seguretat no és vàlida o ha caducat. Torna-ho a provar.");
      } else {
        setError("No s'ha pogut crear el compte. Revisa les dades o prova amb un altre correu.");
      }

      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  const handleCapsLock = (e) => {
    setCapsLock(e.getModifierState("CapsLock"));
  };

  return (
    <div className="register__page">
      <div
        className={`register__wrapper ${isMobileView ? "register__wrapper--mobile" : ""}`}
      >
        <section
          className={`fade-in-up register__visual-panel ${
            isMobileView ? "register__visual-panel--mobile" : ""
          }`}
        >
          <div className="register__visual-glow-one" />
          <div className="register__visual-glow-two" />

          <div className="register__visual-content">
            <span className="register__badge">Nou compte</span>

            <h1
              className={`register__title ${isMobileView ? "register__title--mobile" : ""}`}
            >
              Crea el teu compte i comença a explorar PadelBook
            </h1>

            <p className="register__text">
              Registra’t per reservar pistes, consultar disponibilitat i gestionar
              les teves reserves dins una experiència més moderna i agradable.
            </p>

            <div className="register__benefit-grid">
              <div className="register__benefit-card">
                <span className="register__benefit-icon">⚡</span>
                <div className="register__benefit-copy">
                  <strong className="register__benefit-title">Accés ràpid</strong>
                  <p className="register__benefit-text">
                    Entra i comença a utilitzar la plataforma en pocs segons.
                  </p>
                </div>
              </div>

              <div className="register__benefit-card">
                <span className="register__benefit-icon">🎾</span>
                <div className="register__benefit-copy">
                  <strong className="register__benefit-title">Reserva fàcil</strong>
                  <p className="register__benefit-text">
                    Consulta pistes i gestiona el teu historial sense complicacions.
                  </p>
                </div>
              </div>

              <div className="register__benefit-card">
                <span className="register__benefit-icon">🔒</span>
                <div className="register__benefit-copy">
                  <strong className="register__benefit-title">Compte segur</strong>
                  <p className="register__benefit-text">
                    Crea una contrasenya robusta amb ajuda visual en temps real.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className={`scale-in delay-1 register__form-card ${
            isMobileView ? "register__form-card--mobile" : ""
          }`}
        >
          <div className="register__form-top">
            <span className="register__form-kicker">Registre</span>
            <h2 className="register__form-title">Crear compte</h2>
            <p className="register__form-text">
              Omple el formulari i comença a utilitzar la plataforma.
            </p>
          </div>

          <div ref={feedbackRef} />

          {error && (
            <div className="scale-in register__error-box">
              <p className="register__error-text">{error}</p>
            </div>
          )}

          {success && (
            <div className="scale-in register__error-box" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p className="register__error-text" style={{ color: "#166534" }}>
                {success}
              </p>
            </div>
          )}

          <form onSubmit={handleRegister} className="register__form">
            <div className="register__field-group">
              <div className="register__field">
                <label htmlFor="nom" className="register__label">
                  Nom
                </label>

                <input
                  id="nom"
                  type="text"
                  placeholder="Ex: Pere"
                  value={nom}
                  onChange={(e) => {
                    setNom(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="register__input"
                  required
                />
              </div>

              <div className="register__field">
                <label htmlFor="llinatges" className="register__label">
                  Llinatges
                </label>

                <input
                  id="llinatges"
                  type="text"
                  placeholder="Ex: Serra Tugores"
                  value={llinatges}
                  onChange={(e) => {
                    setLlinatges(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="register__input"
                  required
                />
              </div>
            </div>

            <div className="register__field">
              <label htmlFor="email" className="register__label">
                Correu electrònic
              </label>

              <input
                id="email"
                type="email"
                placeholder="exemple@correu.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="register__input"
                required
              />
            </div>

            <div className="register__field">
              <label htmlFor="password" className="register__label">
                Contrasenya
              </label>

              <div
                className={`register__password-wrapper ${
                  isMobileView ? "register__password-wrapper--mobile" : ""
                }`}
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínim 8 caràcters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  onKeyUp={handleCapsLock}
                  onKeyDown={handleCapsLock}
                  className="register__input register__input--password"
                  required
                />

                <button
                  type="button"
                  className={`register__show-button ${
                    isMobileView ? "register__show-button--mobile" : ""
                  }`}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar contrasenya" : "Mostrar contrasenya"}
                >
                  {renderPasswordToggleIcon(showPassword)}
                </button>
              </div>

              {capsLock && (
                <span className="register__caps-warning">
                  ⚠️ Tens el bloqueig de majúscules activat
                </span>
              )}
            </div>

            <div className="register__field">
              <label htmlFor="confirmPassword" className="register__label">
                Confirmar contrasenya
              </label>

              <div
                className={`register__password-wrapper ${
                  isMobileView ? "register__password-wrapper--mobile" : ""
                }`}
              >
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeteix la contrasenya"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="register__input register__input--password"
                  required
                />

                <button
                  type="button"
                  className={`register__show-button ${
                    isMobileView ? "register__show-button--mobile" : ""
                  }`}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar contrasenya" : "Mostrar contrasenya"}
                >
                  {renderPasswordToggleIcon(showPassword)}
                </button>
              </div>
            </div>

            <div className="register__password-panel">
              <div className="register__password-panel-header">
                <span className="register__password-panel-title">Requisits de la contrasenya</span>

                <span
                  className={`register__password-strength-badge ${
                    completedPasswordChecks >= 5
                      ? "register__password-strength-badge--good"
                      : completedPasswordChecks >= 3
                      ? "register__password-strength-badge--medium"
                      : "register__password-strength-badge--low"
                  }`}
                >
                  Seguretat: {passwordStrengthText}
                </span>
              </div>

              <div className="register__password-checklist">
                <div className="register__password-checklist-item">
                  <span className={passwordChecks.minLength ? "register__check-ok" : "register__check-pending"}>
                    {passwordChecks.minLength ? "✓" : "•"}
                  </span>
                  <span>Almenys 8 caràcters</span>
                </div>

                <div className="register__password-checklist-item">
                  <span className={passwordChecks.lowercase ? "register__check-ok" : "register__check-pending"}>
                    {passwordChecks.lowercase ? "✓" : "•"}
                  </span>
                  <span>Inclou una minúscula</span>
                </div>

                <div className="register__password-checklist-item">
                  <span className={passwordChecks.uppercase ? "register__check-ok" : "register__check-pending"}>
                    {passwordChecks.uppercase ? "✓" : "•"}
                  </span>
                  <span>Inclou una majúscula</span>
                </div>

                <div className="register__password-checklist-item">
                  <span className={passwordChecks.number ? "register__check-ok" : "register__check-pending"}>
                    {passwordChecks.number ? "✓" : "•"}
                  </span>
                  <span>Inclou un número</span>
                </div>

                <div className="register__password-checklist-item">
                  <span className={passwordChecks.symbol ? "register__check-ok" : "register__check-pending"}>
                    {passwordChecks.symbol ? "✓" : "•"}
                  </span>
                  <span>Inclou un símbol</span>
                </div>

                <div className="register__password-checklist-item">
                  <span className={passwordChecks.match ? "register__check-ok" : "register__check-pending"}>
                    {passwordChecks.match ? "✓" : "•"}
                  </span>
                  <span>Les dues contrasenyes coincideixen</span>
                </div>
              </div>
            </div>

            <div className="register__field">
              <label className="register__label">Verificació de seguretat</label>

              <div className="register__turnstile-box">
                <div ref={turnstileContainerRef} />
              </div>

              {!turnstileReady && (
                <span className="register__turnstile-help">
                  Carregant verificació...
                </span>
              )}
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-full register__submit-button ${
                loading || !turnstileToken ? "register__submit-button--disabled" : ""
              } ${loading ? "register__submit-button--loading" : ""}`}
              disabled={loading || !turnstileToken}
              aria-busy={loading}
            >
              {loading ? "Creant compte..." : "Crear compte"}
            </button>
          </form>

          <div className="register__separator">
            <span className="register__separator-line" />
            <span className="register__separator-text">o</span>
            <span className="register__separator-line" />
          </div>

          <div className="register__footer-box">
            <p className="register__footer-text">Ja tens compte?</p>

            <Link to="/login" className="btn btn-light btn-full">
              Iniciar sessió
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RegisterPage;
