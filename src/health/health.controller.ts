import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../db/database.service';

@Controller()
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('health')
  @Header('Cache-Control', 'no-store')
  health() {
    return {
      success: true,
      data: { status: 'ok' },
      meta: { requestId: randomUUID() },
    };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready() {
    const requestId = randomUUID();
    if (!(await this.database.isReady())) {
      throw new ServiceUnavailableException();
    }
    return { success: true, data: { status: 'ready' }, meta: { requestId } };
  }
}
