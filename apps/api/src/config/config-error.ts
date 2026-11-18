import type { IncomingMessage, ServerResponse } from 'http';

export interface ConfigProblem {
  variable: string;
  reason: string;
}

/** Разбирает сообщение validateEnv: только имена переменных и наши тексты причин. */
export function parseConfigProblems(message: string): ConfigProblem[] {
  return [...message.matchAll(/^\s+- ([A-Z0-9_.]+|\(root\)): (.+)$/gm)].map((match) => ({
    variable: match[1],
    reason: match[2],
  }));
}

/**
 * Сбой при запуске (не настройки): только тип ошибки и её код — например,
 * PrismaClientInitializationError / P1001 «база недоступна». Текст ошибки не
 * показывается: в нём могут быть адреса и имена из строк подключения.
 */
export function describeStartupError(error: unknown): {
  error: string;
  code?: string;
  module?: string;
} {
  const value = error as {
    name?: unknown;
    code?: unknown;
    errorCode?: unknown;
    message?: unknown;
  } | null;
  const name = typeof value?.name === 'string' ? value.name : 'Error';
  const rawCode = value?.errorCode ?? value?.code;
  const code =
    typeof rawCode === 'string' && /^[A-Z0-9_]{2,40}$/.test(rawCode) ? rawCode : undefined;
  // Для «модуль не найден» — имя модуля (имя пакета или файла, не секрет)
  const missing =
    code === 'MODULE_NOT_FOUND' && typeof value?.message === 'string'
      ? value.message.match(/Cannot find module '([^'\s]{1,200})'/)?.[1]
      : undefined;
  return { error: name, ...(code && { code }), ...(missing && { module: missing }) };
}

/** Обработчик запросов, пока сервер не настроен: 503, подробности — только на /health. */
export function configErrorHandler(message: string) {
  return unavailableHandler({ configProblems: parseConfigProblems(message) });
}

export function startupErrorHandler(error: unknown) {
  return unavailableHandler({ startupError: describeStartupError(error) });
}

function unavailableHandler(details: Record<string, unknown>) {
  return (request: IncomingMessage, response: ServerResponse) => {
    const path = (request.url ?? '').split('?')[0].replace(/\/+$/, '');
    const body = {
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Server configuration is incomplete',
      ...(path === '/api/v1/health' && details),
    };
    response.writeHead(503, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify(body));
  };
}
