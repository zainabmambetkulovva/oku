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

/** Обработчик запросов, пока сервер не настроен: 503, подробности — только на /health. */
export function configErrorHandler(message: string) {
  const problems = parseConfigProblems(message);
  return (request: IncomingMessage, response: ServerResponse) => {
    const path = (request.url ?? '').split('?')[0].replace(/\/+$/, '');
    const body = {
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Server configuration is incomplete',
      ...(path === '/api/v1/health' && { configProblems: problems }),
    };
    response.writeHead(503, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify(body));
  };
}
