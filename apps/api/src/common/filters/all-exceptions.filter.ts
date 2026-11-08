import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { STATUS_CODES } from 'http';
import type { Request, Response } from 'express';
import { ApiErrorResponse } from '../http/api-response';

interface ResolvedError {
  statusCode: number;
  message: string;
  details?: unknown;
}

/**
 * Единый формат ошибок API: { statusCode, error, message, details?, path, timestamp }.
 *  - HttpException — статус и сообщение исключения;
 *  - ошибки Prisma — понятные HTTP-коды (дубликат → 409, не найдено → 404, ...);
 *  - всё остальное — 500 без внутренних подробностей (подробности — в лог).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // Не называть переменную http: сборщик Vercel (rolldown) путает её с модулем http,
    // из которого импортирован STATUS_CODES
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const { statusCode, message, details } = resolveException(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'Error',
      message,
      ...(details !== undefined && { details }),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }
}

export function resolveException(exception: unknown): ResolvedError {
  if (exception instanceof HttpException) {
    return resolveHttpException(exception);
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return resolvePrismaKnownError(exception);
  }
  if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
    const constraint = /violates check constraint \\?"([^"\\]+)\\?"/.exec(exception.message)?.[1];
    if (constraint || exception.message.includes('23514')) {
      return {
        statusCode: 400,
        message: 'Data violates a database constraint',
        details: constraint ? { constraint } : undefined,
      };
    }
  }
  return { statusCode: 500, message: 'Internal server error' };
}

function resolveHttpException(exception: HttpException): ResolvedError {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return { statusCode, message: response };
  }

  const { message, details } = response as { message?: string | string[]; details?: unknown };
  if (Array.isArray(message)) {
    return { statusCode, message: 'Validation failed', details: message };
  }
  return { statusCode, message: message ?? exception.message, details };
}

function resolvePrismaKnownError(exception: Prisma.PrismaClientKnownRequestError): ResolvedError {
  const meta = exception.meta ?? {};

  switch (exception.code) {
    case 'P2002':
      return {
        statusCode: 409,
        message: 'Resource already exists',
        details: { fields: meta.target },
      };
    case 'P2003':
    case 'P2014':
      return {
        statusCode: 409,
        message: 'Operation conflicts with related records',
        details: meta.field_name ? { constraint: meta.field_name } : undefined,
      };
    case 'P2025':
      return { statusCode: 404, message: 'Resource not found' };
    case 'P2000':
      return {
        statusCode: 400,
        message: 'Value is too long',
        details: { field: meta.column_name },
      };
    default:
      return { statusCode: 500, message: 'Internal server error' };
  }
}
