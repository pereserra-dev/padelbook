const nodemailer = require("nodemailer");

// Configuració del transportador de correu
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: process.env.MAIL_USER && process.env.MAIL_PASS
    ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      }
    : undefined,
});
// Funció per enviar un correu electrònic
const sendEmail = async ({ to, subject, html }) => {
  if (!to) return;

  if (
    !process.env.MAIL_HOST ||
    !process.env.MAIL_USER ||
    !process.env.MAIL_PASS
  ) {
    console.warn("Emails desactivats: falten variables MAIL_*");
    return;
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    html,
  });
};

const buildVerificationEmail = ({ nom, verifyUrl }) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #0f172a, #2563eb); border-radius: 20px; padding: 24px; color: white; margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 700; opacity: 0.9; margin-bottom: 10px;">
          PadelBook · Verificació de compte
        </div>
        <h1 style="margin: 0; font-size: 30px; line-height: 1.1;">
          Verifica el teu correu electrònic
        </h1>
        <p style="margin: 14px 0 0; font-size: 16px; color: rgba(255,255,255,0.88);">
          Necessitam confirmar la teva adreça de correu abans que puguis iniciar sessió.
        </p>
      </div>

      <p style="margin: 0 0 16px; font-size: 16px;">
        Hola <strong>${nom}</strong>,
      </p>

      <p style="margin: 0 0 16px; font-size: 16px;">
        Prem el botó següent per verificar el teu compte i activar l’accés a PadelBook.
      </p>

      <div style="margin: 28px 0;">
        <a
          href="${verifyUrl}"
          target="_blank"
          style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 22px; border-radius: 14px;"
        >
          Verificar el meu compte
        </a>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-top: 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #0f172a; font-weight: 700;">
          Important
        </p>
        <p style="margin: 0; font-size: 14px; color: #475569;">
          Aquest enllaç caduca en 24 hores. Si no has creat aquest compte, pots ignorar aquest missatge.
        </p>
      </div>
    </div>
  `;
};

const capitalizeFirstLetter = (value) => {
  if (!value) return "";

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatEmailTime = (hora) => {
  if (!hora) return "";

  const timeText = String(hora);
  const [hours = "", minutes = ""] = timeText.split(":");

  return hours && minutes
    ? `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`
    : timeText;
};

const formatEmailDate = (data) => {
  if (!data) return "";

  let date;
  const dateText = String(data);
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const [, year, month, day] = match;
    date = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    date = data instanceof Date ? data : new Date(data);
  }

  if (Number.isNaN(date.getTime())) return dateText;

  const formattedDate = new Intl.DateTimeFormat("ca-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date).replace(/\sdel\s(?=\d{4})/, " de ");

  return capitalizeFirstLetter(formattedDate);
};

const formatPaymentMethod = (metode_pagament) => {
  const methods = {
    online_simulat: "Pagament online",
    al_club: "Pagament al club",
  };

  return methods[metode_pagament] || metode_pagament || "";
};

const formatPaymentStatus = (estat_pagament) => {
  const statuses = {
    pendent: "Pendent",
    pagat: "Pagat",
  };

  return statuses[estat_pagament] || estat_pagament || "";
};

const formatEmailPrice = (preu_total) => {
  if (preu_total === undefined || preu_total === null || preu_total === "") return "";

  const price = Number(preu_total);

  if (Number.isNaN(price)) return "";

  return `${price.toFixed(2)} €`;
};

const buildDetailRow = (label, value) => {
  if (!value) return "";

  return `
    <tr>
      <td style="padding: 13px 16px; border-bottom: 1px solid #e5e7eb; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0; width: 42%;">
        ${escapeHtml(label)}
      </td>
      <td style="padding: 13px 16px; border-bottom: 1px solid #e5e7eb; color: #0f172a; font-size: 15px; font-weight: 700; text-align: right;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
};

const buildReservationEmailLayout = ({
  title,
  eyebrow,
  message,
  badgeText,
  badgeBackground,
  badgeColor,
  gradient,
  details,
  footerText,
}) => {
  return `
    <div style="margin: 0; padding: 32px 16px; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto;">
        <div style="background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);">
          <div style="background: ${gradient}; color: #ffffff; padding: 28px 30px;">
            <div style="font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.82); margin-bottom: 14px;">
              PadelBook · ${escapeHtml(eyebrow)}
            </div>
            <div style="display: inline-block; background: ${badgeBackground}; color: ${badgeColor}; border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 800; margin-bottom: 14px;">
              ${escapeHtml(badgeText)}
            </div>
            <h1 style="margin: 0; font-size: 28px; line-height: 1.18; font-weight: 800;">
              ${escapeHtml(title)}
            </h1>
            <p style="margin: 12px 0 0; color: rgba(255,255,255,0.88); font-size: 15px; line-height: 1.6;">
              ${escapeHtml(message)}
            </p>
          </div>

          <div style="padding: 28px 30px 30px;">
            <p style="margin: 0 0 18px; color: #334155; font-size: 16px; line-height: 1.6;">
              Hola <strong style="color: #0f172a;">${escapeHtml(details.nom)}</strong>,
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff;">
              ${details.rows}
            </table>

            <div style="margin-top: 22px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
              <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                ${escapeHtml(footerText)}
              </p>
            </div>
          </div>
        </div>

        <p style="margin: 18px 0 0; color: #64748b; font-size: 13px; text-align: center;">
          PadelBook
        </p>
      </div>
    </div>
  `;
};

// Funcions per construir el contingut dels correus electrònics de reserva
const buildReservationCreatedEmail = ({
  nom,
  codi_reserva,
  nom_pista,
  data_reserva,
  hora_inici,
  hora_fi,
  preu_total,
  estat_pagament,
  metode_pagament,
}) => {
  const rows = [
    buildDetailRow("Codi de reserva", codi_reserva),
    buildDetailRow("Pista", nom_pista),
    buildDetailRow("Data", formatEmailDate(data_reserva)),
    buildDetailRow("Hora", `${formatEmailTime(hora_inici)} - ${formatEmailTime(hora_fi)}`),
    buildDetailRow("Preu total", formatEmailPrice(preu_total)),
    buildDetailRow("Mètode de pagament", formatPaymentMethod(metode_pagament)),
    buildDetailRow("Estat del pagament", formatPaymentStatus(estat_pagament)),
  ].join("");

  return buildReservationEmailLayout({
    title: "Reserva confirmada",
    eyebrow: "Reserva confirmada",
    message: "La teva reserva s'ha creat correctament. Aquí tens tots els detalls.",
    badgeText: "Confirmada",
    badgeBackground: "rgba(219, 234, 254, 0.18)",
    badgeColor: "#dbeafe",
    gradient: "linear-gradient(135deg, #0f172a, #1d4ed8)",
    details: {
      nom,
      rows,
    },
    footerText: "Gràcies per confiar en PadelBook. T'esperam a la pista.",
  });
};
// Funció per construir el contingut del correu electrònic de cancel·lació de reserva
const buildReservationCancelledEmail = ({
  nom,
  codi_reserva,
  nom_pista,
  data_reserva,
  hora_inici,
  hora_fi,
  preu_total,
  estat_pagament,
  metode_pagament,
}) => {
  const rows = [
    buildDetailRow("Codi de reserva", codi_reserva),
    buildDetailRow("Pista", nom_pista),
    buildDetailRow("Data", formatEmailDate(data_reserva)),
    buildDetailRow("Hora", `${formatEmailTime(hora_inici)} - ${formatEmailTime(hora_fi)}`),
    buildDetailRow("Preu total", formatEmailPrice(preu_total)),
    buildDetailRow("Mètode de pagament", formatPaymentMethod(metode_pagament)),
    buildDetailRow("Estat del pagament", formatPaymentStatus(estat_pagament)),
  ].join("");

  return buildReservationEmailLayout({
    title: "Reserva cancel·lada",
    eyebrow: "Reserva cancel·lada",
    message: "La teva reserva ha estat cancel·lada correctament.",
    badgeText: "Cancel·lada",
    badgeBackground: "rgba(254, 226, 226, 0.18)",
    badgeColor: "#fee2e2",
    gradient: "linear-gradient(135deg, #1f2937, #991b1b)",
    details: {
      nom,
      rows,
    },
    footerText: "Si ha estat un error, pots tornar a fer la reserva des de la plataforma.",
  });
};

const buildWelcomeEmail = ({ nom }) => {
  return `
    <div style="margin: 0; padding: 32px 16px; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto;">
        <div style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);">
          <div style="background: linear-gradient(135deg, #0f172a, #2563eb); color: #ffffff; padding: 30px;">
            <div style="font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.82); margin-bottom: 14px;">
              PadelBook · Compte activat
            </div>

            <div style="display: inline-block; background: rgba(219, 234, 254, 0.18); color: #dbeafe; border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 800; margin-bottom: 14px;">
              Benvingut/da
            </div>

            <h1 style="margin: 0; font-size: 28px; line-height: 1.18; font-weight: 800;">
              Ja tens el compte verificat
            </h1>

            <p style="margin: 12px 0 0; color: rgba(255,255,255,0.88); font-size: 15px; line-height: 1.6;">
              El teu compte de PadelBook ja està activat i preparat per començar a reservar pistes.
            </p>
          </div>

          <div style="padding: 28px 30px 30px;">
            <p style="margin: 0 0 16px; color: #334155; font-size: 16px; line-height: 1.6;">
              Hola <strong style="color: #0f172a;">${escapeHtml(nom)}</strong>,
            </p>

            <p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">
              Gràcies per verificar el teu correu electrònic. A partir d’ara ja pots iniciar sessió, consultar disponibilitat i gestionar les teves reserves des de la plataforma.
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
              <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Et recomanam revisar la disponibilitat de pistes i fer la teva primera reserva quan vulguis.
              </p>
            </div>
          </div>
        </div>

        <p style="margin: 18px 0 0; color: #64748b; font-size: 13px; text-align: center;">
          PadelBook
        </p>
      </div>
    </div>
  `;
};

module.exports = {
  sendEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
  buildReservationCreatedEmail,
  buildReservationCancelledEmail,
  formatEmailTime,
  formatEmailDate,
  formatPaymentMethod,
  formatPaymentStatus,
};