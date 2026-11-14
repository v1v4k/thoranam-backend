import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { validateEnvironment } from '../src/config/env';
import { DatabaseService } from '../src/db/database.service';

test('real pool handles connection failure and closes cleanly', async () => {
  const database = new DatabaseService(
    new ConfigService(
      validateEnvironment({
        DATABASE_URL: 'postgresql://test:synthetic@127.0.0.1:1/unavailable',
      }),
    ),
  );
  try {
    assert.equal(await database.isReady(), false);
  } finally {
    await database.onApplicationShutdown();
  }
});
