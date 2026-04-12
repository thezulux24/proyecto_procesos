import { Module } from '@nestjs/common';
import { QrService } from './utils/qr.service';
import { EmailService } from './utils/email.service';

@Module({
  providers: [QrService, EmailService],
  exports: [QrService, EmailService],
})
export class CommonModule {}
