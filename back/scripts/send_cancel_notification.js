const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = content.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[m[1]] = val;
    }
  }
  return env;
}

async function main() {
  const prisma = new PrismaClient();
  const env = loadEnv(path.resolve(__dirname, '..', '.env'));
  const smtpUrl = process.env.SMTP_URL || env.SMTP_URL || 'smtp://localhost:1025';
  const from = process.env.SMTP_FROM || env.SMTP_FROM || 'sistema@transporte.local';
  const id = Number(process.argv[2] || '8');

  try {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      console.error('Reservation not found:', id);
      process.exitCode = 2;
      return;
    }

    const now = new Date();
    const createdAt = new Date(reservation.createdAt);
    const msSinceCreated = now.getTime() - createdAt.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const penalize = msSinceCreated > twoHoursMs;

    const requesterEmail = reservation.email;
    if (!requesterEmail) {
      console.error('Reservation has no email to notify.');
      process.exitCode = 3;
      return;
    }

    const transporter = nodemailer.createTransport(smtpUrl);
    const subject = `Su reserva #${reservation.id} ha sido cancelada`;
    const reason = penalize
      ? 'Se le ha aplicado una penalidad por cancelar la reserva pasado el periodo permitido.'
      : 'Su reserva fue cancelada sin penalidad.';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h3>Reserva cancelada</h3>
        <p>La reserva <strong>#${reservation.id}</strong> programada para <strong>${new Date(
          reservation.startAt,
        ).toLocaleString('es-ES')}</strong> fue cancelada.</p>
        <p>${reason}</p>
      </div>
    `;

    const info = await transporter.sendMail({ from, to: requesterEmail, subject, html });
    console.log('send result:', info);
    console.log('Sent cancellation email to', requesterEmail, 'penalty:', penalize);
  } catch (err) {
    console.error('Error sending cancellation notification:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
