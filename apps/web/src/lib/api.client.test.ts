import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBaseUrl, internalHeaders } from './api';

describe('apiBaseUrl in the browser', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the same-origin /api/v1 path by default', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', undefined);
    vi.stubEnv('API_SERVICE_URL', 'https://internal.example');
    expect(apiBaseUrl()).toBe('/api/v1');
  });

  it('respects NEXT_PUBLIC_API_URL for local development', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000/api/v1/');
    expect(apiBaseUrl()).toBe('http://localhost:3000/api/v1');
  });
});

describe('internalHeaders in the browser', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('never sends the internal token from the browser', () => {
    vi.stubEnv('INTERNAL_API_TOKEN', 'k'.repeat(40));
    expect(internalHeaders()).toEqual({});
  });
});
