import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { configureApp } from '../src/configure-app';
import { DatabaseService } from '../src/db/database.service';

test(
  'real PostgreSQL, Drizzle readiness and pool shutdown',
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.DATABASE_SSL = 'false';
    process.env.PORT = '3001';
    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = module.createNestApplication({ logger: false });
    configureApp(app);
    const database = app.get(DatabaseService);
    try {
      await app.init();
      const result = await database.db.execute(sql`select 1 as connected`);
      assert.equal(result.rows[0]?.connected, 1);
      await request(app.getHttpServer()).get('/api/v1/ready').expect(200);
    } finally {
      await app.close();
    }
    assert.equal(await database.isReady(), false);
  },
);
