import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';

@Injectable()
export class QrService {
  async generateQRCode(data: Record<string, any>): Promise<{ qrCode: Buffer; qrDataUrl: string }> {
    const jsonData = JSON.stringify(data);
    
    try {
      const qrCode = await QRCode.toBuffer(jsonData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      const qrDataUrl = await QRCode.toDataURL(jsonData, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return { qrCode: qrCode as Buffer, qrDataUrl };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  async generateReservationQR(reservationId: string, deviceName: string, startDate: Date): Promise<{ qrCode: Buffer; qrDataUrl: string }> {
    const reservationData = {
      id: reservationId,
      device: deviceName,
      startDate: startDate.toISOString(),
      timestamp: new Date().toISOString(),
    };

    return this.generateQRCode(reservationData);
  }
}
