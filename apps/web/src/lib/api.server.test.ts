// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBaseUrl } from './api';

describe('apiBaseUrl on the server', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the Vercel service binding and appends the API prefix', () => {
    vi.stubEnv('API_SERVICE_URL', 'https://internal.example/');
    vi.stubEnv('API_URL', 'http://localhost:3000/api/v1');
    expect(apiBaseUrl()).toBe('https://internal.example/api/v1');
  });

  it('falls back to API_URL, then to localhost', () => {
    vi.stubEnv('API_SERVICE_URL', '');
    vi.stubEnv('API_URL', 'http://api.local/api/v1/');
    expect(apiBaseUrl()).toBe('http://api.local/api/v1');
    vi.stubEnv('API_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_API_URL', undefined);
    expect(apiBaseUrl()).toBe('http://localhost:3000/api/v1');
  });
});
