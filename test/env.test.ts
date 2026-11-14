import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validateEnvironment } from '../src/config/env';

const databaseUrl = 'postgresql://local:synthetic@127.0.0.1:55432/thoranam';

test('validates local defaults and parses false as a boolean', () => {
  const env = validateEnvironment({ DATABASE_URL: databaseUrl });
  assert.equal(env.NODE_ENV, 'development');
  assert.equal(env.PORT, 3001);
  assert.equal(env.DATABASE_SSL, false);
  assert.equal(
    validateEnvironment({ DATABASE_URL: databaseUrl, PORT: '4100' }).PORT,
    4100,
  );
});

test('rejects missing, malformed and non-PostgreSQL database URLs without secrets', () => {
  for (const url of [
    undefined,
    'invalid',
    'https://example.com/db',
    'postgresql://localhost',
  ]) {
    assert.throws(
      () => validateEnvironment({ DATABASE_URL: url }),
      /DATABASE_URL/,
    );
  }
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: 'https://local:private-password@example.com/db',
      }),
    (error: unknown) =>
      error instanceof Error && !error.message.includes('private-password'),
  );
});

test('rejects invalid ports and ambiguous boolean values', () => {
  for (const port of ['bad', '0', '65536', '1.5', '']) {
    assert.throws(
      () => validateEnvironment({ DATABASE_URL: databaseUrl, PORT: port }),
      /PORT/,
    );
  }
  assert.throws(
    () =>
      validateEnvironment({ DATABASE_URL: databaseUrl, DATABASE_SSL: 'yes' }),
    /DATABASE_SSL/,
  );
});

test('production requires verified TLS; URL parameters cannot override it', () => {
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'production',
      }),
    /DATABASE_SSL/,
  );
  assert.equal(
    validateEnvironment({
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'production',
      DATABASE_SSL: 'true',
      CORS_ORIGINS: 'https://app.thoranam.com',
    }).DATABASE_SSL,
    true,
  );
  assert.throws(
    () =>
      validateEnvironment({ DATABASE_URL: `${databaseUrl}?sslmode=no-verify` }),
    /DATABASE_URL/,
  );
});

test('CORS origins are exact origins and production requires HTTPS', () => {
  for (const value of [
    '*',
    'null',
    '',
    'https://app.thoranam.com/path',
    'https://user:password@example.com',
    'https://example.com/',
    'https://example.com,',
  ]) {
    assert.throws(
      () =>
        validateEnvironment({ DATABASE_URL: databaseUrl, CORS_ORIGINS: value }),
      /CORS_ORIGINS/,
    );
  }
  assert.deepEqual(
    validateEnvironment({
      DATABASE_URL: databaseUrl,
      CORS_ORIGINS: 'https://app.thoranam.com, http://localhost:3000',
    }).CORS_ORIGINS,
    ['https://app.thoranam.com', 'http://localhost:3000'],
  );
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: databaseUrl,
        DATABASE_SSL: 'true',
        NODE_ENV: 'production',
      }),
    /CORS_ORIGINS/,
  );
});
