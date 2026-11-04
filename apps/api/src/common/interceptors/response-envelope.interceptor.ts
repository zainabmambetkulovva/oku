import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../http/api-response';

/**
 * Оборачивает ответы контроллеров в единый формат { data, meta? }.
 * Если контроллер уже вернул { data, meta } (списки с пагинацией) — ответ не меняется.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(map((body) => (isEnvelope(body) ? body : { data: body ?? null })));
  }
}

function isEnvelope(body: unknown): body is ApiResponse<unknown> {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const keys = Object.keys(body);
  return keys.length === 2 && keys.includes('data') && keys.includes('meta');
}
