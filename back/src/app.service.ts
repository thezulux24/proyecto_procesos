import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'university-transport-api',
      timestamp: new Date().toISOString(),
    };
  }
}
