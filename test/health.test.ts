import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { after, before, describe, test } from 'node:test';
import {
  Controller,
  Get,
  HttpException,
  type INestApplication,
} from '@nestjs/common';

@Controller('test-errors')
class ErrorController {
  @Get('unexpected')
  unexpected() {
    throw new Error('secret database credential');
  }
  @Get('http')
  http() {
    throw new HttpException({ message: 'secret token', stack: 'private' }, 413);
  }
}
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/configure-app';
import { DatabaseService } from '../src/db/database.service';

// ConfigModule validates at module load. These values never contact a real DB:
// the database provider is replaced through Nest's dependency injection.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://test:synthetic@127.0.0.1:1/thoranam_test';
process.env.DATABASE_SSL = 'false';
process.env.PORT = '3001';
process.env.CORS_ORIGINS = 'http://localhost:3000';

describe('contracted health endpoints', () => {
  let app: INestApplication;
  let ready = true;
  let checks = 0;
  let closed = false;

  before(async () => {
    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ErrorController],
    })
      .overrideProvider(DatabaseService)
      .useValue({
        isReady: async () => {
          checks += 1;
          return ready;
        },
        onApplicationShutdown: () => {
          closed = true;
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  after(async () => {
    await app?.close();
    assert.equal(closed, true);
  });

  test('liveness uses the shared /api/v1 prefix and never queries the DB', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    assert.equal(checks, 0);
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(result.body.success, true);
    assert.deepEqual(result.body.data, { status: 'ok' });
    assert.match(result.body.meta.requestId, /^[0-9a-f-]{36}$/);
  });

  test('readiness checks the database and includes no topology', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/v1/ready')
      .expect(200);
    assert.equal(checks, 1);
    assert.equal(result.body.success, true);
    assert.deepEqual(result.body.data, { status: 'ready' });
    assert.equal(result.headers['cache-control'], 'no-store');
  });

  test('DB outage returns a safe 503, preserves liveness and permits recovery', async () => {
    ready = false;
    const result = await request(app.getHttpServer())
      .get('/api/v1/ready')
      .expect(503);
    assert.equal(result.body.success, false);
    assert.deepEqual(result.body.error, {
      code: 'UPSTREAM_UNAVAILABLE',
      message: 'Service is not ready.',
    });
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.ok(!JSON.stringify(result.body).includes('postgresql'));
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    ready = true;
    await request(app.getHttpServer()).get('/api/v1/ready').expect(200);
  });

  test('no root greeting, unprefixed aliases or v2 paths are introduced', async () => {
    for (const path of ['/', '/health', '/ready', '/api/v2/health']) {
      const result = await request(app.getHttpServer()).get(path).expect(404);
      assert.equal(result.body.success, false);
      assert.equal(result.body.error.code, 'NOT_FOUND');
      assert.ok(result.body.meta.requestId);
    }
  });

  test('allows credentials for an exact trusted origin, including errors', async () => {
    for (const path of ['/api/v1/health', '/api/v1/missing']) {
      const result = await request(app.getHttpServer())
        .get(path)
        .set('Origin', 'http://localhost:3000');
      assert.equal(
        result.headers['access-control-allow-origin'],
        'http://localhost:3000',
      );
      assert.equal(result.headers['access-control-allow-credentials'], 'true');
      assert.match(result.headers.vary ?? '', /Origin/);
    }
  });

  test('untrusted, null and lookalike origins receive no origin permission', async () => {
    for (const origin of [
      'https://evil.example',
      'null',
      'http://localhost:3000.evil.example',
      'http://localhost:3002',
    ]) {
      const result = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', origin)
        .expect(200);
      assert.equal(result.headers['access-control-allow-origin'], undefined);
    }
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  test('preflight permits contract headers and methods only', async () => {
    const result = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set(
        'Access-Control-Request-Headers',
        'content-type,x-csrf-token,x-request-id',
      )
      .expect(204);
    assert.equal(result.text, '');
    assert.equal(result.headers['access-control-allow-credentials'], 'true');
    assert.equal(
      result.headers['access-control-allow-origin'],
      'http://localhost:3000',
    );
    assert.match(
      result.headers['access-control-allow-headers'] ?? '',
      /X-CSRF-Token/,
    );
    const rejected = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    assert.equal(rejected.headers['access-control-allow-origin'], undefined);
  });

  test('malformed JSON is sanitized and receives a fresh server request ID', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/v1/missing')
      .set('Content-Type', 'application/json')
      .set('X-Request-ID', 'untrusted-id')
      .send('{"secret":')
      .expect(400);
    assert.equal(result.body.error.code, 'BAD_REQUEST');
    assert.equal(result.body.success, false);
    assert.notEqual(result.body.meta.requestId, 'untrusted-id');
    assert.ok(!JSON.stringify(result.body).includes('secret'));
  });

  test('unexpected and explicit HTTP exceptions are sanitized', async () => {
    for (const [path, status, code] of [
      ['unexpected', 500, 'INTERNAL_ERROR'],
      ['http', 413, 'PAYLOAD_TOO_LARGE'],
    ] as const) {
      const result = await request(app.getHttpServer())
        .get(`/api/v1/test-errors/${path}`)
        .expect(status);
      assert.equal(result.body.success, false);
      assert.equal(result.body.error.code, code);
      assert.ok(result.body.meta.requestId);
      assert.equal(result.headers['cache-control'], 'no-store');
      assert.ok(!JSON.stringify(result.body).includes('secret'));
      assert.ok(!JSON.stringify(result.body).includes('stack'));
    }
  });

  test('body-parser size errors preserve 413 and use the envelope', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/v1/missing')
      .send({ value: 'x'.repeat(110 * 1024) })
      .expect(413);
    assert.equal(result.body.error.code, 'PAYLOAD_TOO_LARGE');
    assert.equal(result.body.success, false);
    assert.ok(result.body.meta.requestId);
  });
});
