import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { randomUUID } from 'node:crypto';

const errors: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'The request is invalid.' },
  401: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' },
  403: { code: 'FORBIDDEN', message: 'Access is forbidden.' },
  404: { code: 'NOT_FOUND', message: 'The resource was not found.' },
  409: {
    code: 'CONFLICT',
    message: 'The request conflicts with the current state.',
  },
  410: {
    code: 'LINK_EXPIRED',
    message: 'The requested link is no longer available.',
  },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large.' },
  415: {
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'The media type is not supported.',
  },
  422: { code: 'VALIDATION_FAILED', message: 'Check the submitted values.' },
  429: { code: 'RATE_LIMITED', message: 'Too many requests.' },
  500: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  502: {
    code: 'UPSTREAM_UNAVAILABLE',
    message: 'An upstream service is unavailable.',
  },
  503: { code: 'UPSTREAM_UNAVAILABLE', message: 'Service is not ready.' },
};

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const candidate =
      exception instanceof HttpException
        ? exception.getStatus()
        : typeof exception === 'object' &&
            exception !== null &&
            'statusCode' in exception
          ? exception.statusCode
          : 500;
    const status =
      typeof candidate === 'number' &&
      Number.isInteger(candidate) &&
      candidate >= 400 &&
      candidate <= 599
        ? candidate
        : 500;
    const requestId = randomUUID();
    if (status >= 500)
      this.logger.error(
        `API request failed: status=${status} requestId=${requestId}`,
      );
    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();
    if (httpAdapter.isHeadersSent(response)) return;
    httpAdapter.setHeader(response, 'Cache-Control', 'no-store');
    httpAdapter.reply(
      response,
      {
        success: false,
        error: errors[status] ?? errors[status < 500 ? 400 : 500],
        meta: { requestId },
      },
      status,
    );
  }
}
