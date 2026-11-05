/** Ключ кэша из объекта параметров: порядок полей не важен, undefined отбрасывается. */
export function stableKey(params: object): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
}
