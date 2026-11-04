import { validateEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  DIRECT_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'secret',
};

describe('validateEnv', () => {
  it('applies defaults for optional variables', () => {
    const env = validateEnv(base);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.JWT_EXPIRES_IN).toBe('7d');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3001']);
    expect(env.THROTTLE_LIMIT).toBe(100);
    expect(env.SWAGGER_ENABLED).toBe(true);
  });

  it('parses numbers, booleans and comma-separated lists', () => {
    const env = validateEnv({
      ...base,
      PORT: '8080',
      SWAGGER_ENABLED: 'false',
      CORS_ORIGINS: 'https://oku24.kg, https://admin.oku24.kg ,',
    });

    expect(env.PORT).toBe(8080);
    expect(env.SWAGGER_ENABLED).toBe(false);
    expect(env.CORS_ORIGINS).toEqual(['https://oku24.kg', 'https://admin.oku24.kg']);
  });

  it('fails when required variables are missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL[\s\S]*DIRECT_URL[\s\S]*JWT_SECRET/);
  });

  it('rejects invalid values', () => {
    expect(() => validateEnv({ ...base, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ ...base, DATABASE_URL: 'not a url' })).toThrow(/DATABASE_URL/);
  });

  it('requires a long JWT secret in production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32) }),
    ).not.toThrow();
  });
});
