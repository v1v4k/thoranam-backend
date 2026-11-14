import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import type { Environment } from './config/env';
import { ApiErrorFilter } from './api-error.filter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  const origins = app
    .get(ConfigService<Environment, true>)
    .get('CORS_ORIGINS', { infer: true });
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Content-Type', 'X-CSRF-Token', 'X-Request-ID'],
    optionsSuccessStatus: 204,
  });
  app.useGlobalFilters(new ApiErrorFilter(app.get(HttpAdapterHost)));
  app.enableShutdownHooks();
}
