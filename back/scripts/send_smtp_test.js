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
      // strip optional quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[m[1]] = val;
    }
  }
  return env;
}

async function main() {
  const env = loadEnv(path.resolve(__dirname, '..', '.env'));
  const smtpUrl = process.env.SMTP_URL || env.SMTP_URL || 'smtp://localhost:1025';
  const from = process.env.SMTP_FROM || env.SMTP_FROM || 'test@local';
  const to = process.argv[2] || 'admin@universidad.edu';

  console.log('Using SMTP URL:', smtpUrl);
  console.log('Sending test email to:', to);

  try {
    const transporter = nodemailer.createTransport(smtpUrl);
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Test email desde proyecto_procesos',
      text: 'Este es un correo de prueba para verificar conexión SMTP (Mailpit).',
    });
    console.log('sendMail result:', info);
    console.log('Test email sent — check Mailpit UI at http://localhost:8025');
  } catch (err) {
    console.error('Failed to send test email:', err);
    process.exitCode = 1;
  }
}

main();
