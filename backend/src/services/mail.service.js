const logger = require('../utils/logger');

const FROM = process.env.MAIL_FROM || 'VitaLink <noreply@vitalink.local>';
const APP_URL = (process.env.APP_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

async function sendMail({ to, subject, html, text }) {
  if (!isConfigured()) {
    logger.info('E-mail (dev, SMTP não configurado)', { to, subject, text });
    return { delivered: false, mocked: true };
  }

  // Carrega sob demanda para não exigir nodemailer sem SMTP
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    logger.warn('nodemailer não instalado — e-mail apenas registrado no log');
    return { delivered: false, mocked: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({ from: FROM, to, subject, html, text });
  return { delivered: true, mocked: false };
}

function confirmUrl(token) {
  return `${APP_URL}/confirmar-email?token=${encodeURIComponent(token)}`;
}

function resetUrl(token) {
  return `${APP_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

async function sendConfirmacaoEmail({ to, nome, token }) {
  const url = confirmUrl(token);
  const text = `Olá, ${nome}.\n\nConfirme seu cadastro VitaLink:\n${url}\n\nO link expira em 24 horas.`;
  const result = await sendMail({
    to,
    subject: 'Confirme seu cadastro VitaLink',
    text,
    html: `<p>Olá, <strong>${nome}</strong>.</p><p>Confirme seu cadastro:</p><p><a href="${url}">${url}</a></p><p>O link expira em 24 horas.</p>`,
  });
  return { ...result, url };
}

async function sendResetSenha({ to, nome, token }) {
  const url = resetUrl(token);
  const text = `Olá, ${nome}.\n\nRedefina sua senha VitaLink:\n${url}\n\nO link expira em 30 minutos.`;
  const result = await sendMail({
    to,
    subject: 'Redefinição de senha VitaLink',
    text,
    html: `<p>Olá, <strong>${nome}</strong>.</p><p>Redefina sua senha:</p><p><a href="${url}">${url}</a></p><p>O link expira em 30 minutos.</p>`,
  });
  return { ...result, url };
}

module.exports = {
  isConfigured,
  sendMail,
  sendConfirmacaoEmail,
  sendResetSenha,
  confirmUrl,
  resetUrl,
};
