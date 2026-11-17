import { createPrivateKey, createPublicKey, createSign, createVerify } from 'crypto';

/**
 * Подпись запросов в формате Finik / AversPay (тот же алгоритм, что в библиотеке
 * @mancho.devs/authorizer, но без вывода секретов в лог).
 *
 * Подписываемая строка — части, разделённые переводом строки:
 *   1) HTTP-метод в нижнем регистре;
 *   2) путь (decodeURI);
 *   3) host:<Host>&<x-api-* заголовки по алфавиту, имя в нижнем регистре:значение>;
 *   4) query-параметры по алфавиту key=value через & (часть пропускается, если их нет);
 *   5) JSON тела с ключами верхнего уровня по алфавиту (пустая строка без тела).
 * Подпись — RSA-SHA256, base64.
 */
export interface SignableRequest {
  method: string;
  path: string;
  /** Обязателен Host; учитываются заголовки, начинающиеся с x-api- */
  headers: Record<string, string | number | undefined>;
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown> | null;
}

export function canonicalRequest(request: SignableRequest): string {
  const host = request.headers.Host ?? request.headers.host;
  if (!host) {
    throw new Error("Header 'Host' is required for signing");
  }

  const apiHeaders = Object.keys(request.headers)
    .filter((key) => key.toLowerCase().startsWith('x-api-'))
    .sort()
    .map((key) => {
      const value = request.headers[key];
      if (value === undefined || value === null) {
        throw new Error(`Header '${key}' contains invalid value`);
      }
      return `${key.toLowerCase()}:${String(value)}`;
    });

  const query = Object.keys(request.query ?? {})
    .sort()
    .map((key) => {
      const value = request.query?.[key] ?? '';
      return `${encodeURI(decodeURI(key))}=${encodeURI(decodeURI(value))}`;
    })
    .join('&');

  const body = request.body
    ? JSON.stringify(
        Object.fromEntries(Object.entries(request.body).sort(([a], [b]) => a.localeCompare(b))),
      )
    : '';

  const parts = [
    request.method.toLowerCase(),
    decodeURI(request.path),
    [`host:${String(host)}`, ...apiHeaders].join('&'),
  ];
  if (query) {
    parts.push(query);
  }
  parts.push(body);
  return parts.join('\n');
}

export function signRequest(request: SignableRequest, privateKeyPem: string): string {
  return createSign('SHA256').update(canonicalRequest(request)).sign(privateKeyPem, 'base64');
}

export function verifyRequest(
  request: SignableRequest,
  signature: string,
  publicKeyPem: string,
): boolean {
  try {
    return createVerify('SHA256')
      .update(canonicalRequest(request))
      .verify(publicKeyPem, signature, 'base64');
  } catch {
    return false;
  }
}

/**
 * PEM из переменной окружения. Терпит то, как ключ обычно вставляют в настройки
 * хостинга: переводы строк в виде \\n, кавычки вокруг, ключ в одну строку
 * и ключ без строк -----BEGIN/END----- (тогда они добавляются по типу ключа).
 */
export function pemFromEnv(value: string, kind?: 'private' | 'public'): string {
  const text = value
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, '$2')
    .replace(/\\n/g, '\n')
    .trim();
  const match = text.match(/^(-----BEGIN [A-Z ]+-----)\s*([\s\S]*?)\s*(-----END [A-Z ]+-----)$/);
  if (match) {
    // Ключ одной строкой (пробелы вместо переводов строк) — тело переносим заново
    return `${match[1]}\n${wrapBase64(match[2])}\n${match[3]}`;
  }
  if (!kind || !text) return text;

  const body = wrapBase64(text);
  const labels =
    kind === 'private' ? ['PRIVATE KEY', 'RSA PRIVATE KEY'] : ['PUBLIC KEY', 'RSA PUBLIC KEY'];
  const candidates = labels.map(
    (label) => `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`,
  );
  return candidates.find((pem) => isReadableKey(pem, kind)) ?? candidates[0];
}

function wrapBase64(body: string): string {
  return (body.replace(/\s+/g, '').match(/.{1,64}/g) ?? []).join('\n');
}

/** Ключ читается Node.js (без раскрытия содержимого в ошибках). */
export function isReadableKey(pem: string, kind: 'private' | 'public'): boolean {
  try {
    if (kind === 'private') createPrivateKey(pem);
    else createPublicKey(pem);
    return true;
  } catch {
    return false;
  }
}
