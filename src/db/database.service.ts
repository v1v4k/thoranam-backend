import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Environment } from '../config/env';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  readonly db;

  constructor(config: ConfigService<Environment, true>) {
    this.pool = new Pool({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      ssl: config.get('DATABASE_SSL', { infer: true })
        ? { rejectUnauthorized: true }
        : false,
      max: 5,
      connectionTimeoutMillis: 1000,
      idleTimeoutMillis: 10000,
      query_timeout: 1500,
      statement_timeout: 1500,
    });
    this.pool.on('error', () => {
      // An idle connection failure must not crash the process or leak its DSN.
      this.logger.error('Idle database connection failed');
    });
    this.db = drizzle(this.pool);
  }

  async isReady(): Promise<boolean> {
    try {
      await this.db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
