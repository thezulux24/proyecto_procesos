import { BadRequestException, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const smtpUrl = process.env.SMTP_URL;

    if (smtpUrl) {
      this.transporter = nodemailer.createTransport(smtpUrl);
      return;
    }

    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'sistema@transporte.local',
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments || [],
      });
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new BadRequestException('Failed to send email');
    }
  }

  async sendReservationConfirmation(
    email: string,
    reservationId: string,
    deviceName: string,
    startDate: Date,
    qrDataUrl: string,
  ): Promise<boolean> {
    const formattedDate = startDate.toLocaleString('es-ES');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Confirmación de Reserva - Sistema de Transporte Universitario</h2>
        <p>Se ha confirmado su reserva del dispositivo con los siguientes detalles:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>ID de Reserva:</strong> ${reservationId}</p>
          <p><strong>Dispositivo:</strong> ${deviceName}</p>
          <p><strong>Fecha de Inicio:</strong> ${formattedDate}</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <p><strong>Código QR de Acceso:</strong></p>
          <img src="${qrDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
        </div>

        <p style="color: #666; font-size: 12px;">
          Por favor, presente este código QR al momento de retirar el dispositivo.
          Si tiene alguna pregunta, contacte con el equipo de soporte.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Confirmación de Reserva - ${deviceName}`,
      html,
    });
  }

  async sendPasswordReset(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Restablecer Contraseña</h2>
        <p>Hemos recibido una solicitud para restablecer su contraseña. Haga clic en el enlace de abajo para cambiarla:</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}?token=${resetToken}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Restablecer Contraseña
          </a>
        </div>

        <p style="color: #666; font-size: 12px;">
          Este enlace expirará en 48 horas. Si no solicitó este cambio, ignore este correo.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Restablecer tu Contraseña',
      html,
    });
  }
}
