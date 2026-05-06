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
}) => {
  return `
    <h2>Reserva confirmada</h2>
    <p>Hola ${nom},</p>
    <p>La teva reserva s'ha creat correctament.</p>
    <ul>
      <li><strong>Codi de reserva:</strong> ${codi_reserva}</li>
      <li><strong>Pista:</strong> ${nom_pista}</li>
      <li><strong>Data:</strong> ${data_reserva}</li>
      <li><strong>Hora:</strong> ${hora_inici} - ${hora_fi}</li>
      <li><strong>Preu total:</strong> ${Number(preu_total).toFixed(2)} €</li>
      <li><strong>Estat del pagament:</strong> ${estat_pagament}</li>
    </ul>
    <p>Gràcies per confiar en PadelBook.</p>
  `;
};
// Funció per construir el contingut del correu electrònic de cancel·lació de reserva
const buildReservationCancelledEmail = ({
  nom,
  codi_reserva,
  nom_pista,
  data_reserva,
  hora_inici,
  hora_fi,
}) => {
  return `
    <h2>Reserva cancel·lada</h2>
    <p>Hola ${nom},</p>
    <p>La teva reserva ha estat cancel·lada correctament.</p>
    <ul>
      <li><strong>Codi de reserva:</strong> ${codi_reserva}</li>
      <li><strong>Pista:</strong> ${nom_pista}</li>
      <li><strong>Data:</strong> ${data_reserva}</li>
      <li><strong>Hora:</strong> ${hora_inici} - ${hora_fi}</li>
    </ul>
    <p>Si ha estat un error, pots tornar a fer la reserva des de la plataforma.</p>
  `;
};

module.exports = {
  sendEmail,
  buildVerificationEmail,
  buildReservationCreatedEmail,
  buildReservationCancelledEmail,
};