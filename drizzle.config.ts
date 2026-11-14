import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { validateEnvironment } from './src/config/env';

const env = validateEnvironment(process.env);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : false,
  },
  strict: true,
});
