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
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(30);
    expect(env.COOKIE_SAMESITE).toBe('lax');
    expect(env.MAIL_TRANSPORT).toBe('log');
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

  it('requires a long JWT secret and secure cookies in production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET[\s\S]*COOKIE_SECURE/,
    );
  });

  it('validates the access token lifetime format', () => {
    expect(validateEnv({ ...base, JWT_ACCESS_EXPIRES_IN: '30m' }).JWT_ACCESS_EXPIRES_IN).toBe(
      '30m',
    );
    expect(() => validateEnv({ ...base, JWT_ACCESS_EXPIRES_IN: '15 minutes' })).toThrow(
      /JWT_ACCESS_EXPIRES_IN/,
    );
  });

  it('requires secure cookies for SameSite=None', () => {
    expect(() => validateEnv({ ...base, COOKIE_SAMESITE: 'none' })).toThrow(/COOKIE_SAMESITE/);
    expect(() =>
      validateEnv({ ...base, COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'true' }),
    ).not.toThrow();
  });

  it('parses role managers as lower-case e-mails', () => {
    expect(validateEnv(base).ROLE_MANAGER_EMAILS).toEqual([]);
    expect(
      validateEnv({ ...base, ROLE_MANAGER_EMAILS: 'Owner@OKU24.kg, second@oku24.kg' })
        .ROLE_MANAGER_EMAILS,
    ).toEqual(['owner@oku24.kg', 'second@oku24.kg']);
  });

  it('treats empty strings as not set', () => {
    const env = validateEnv({ ...base, S3_ENDPOINT: '', REDIS_URL: '', SMTP_HOST: '' });
    expect(env.S3_ENDPOINT).toBeUndefined();
    expect(env.REDIS_URL).toBeUndefined();
  });

  it('requires the full storage configuration once any S3 variable is set', () => {
    expect(() => validateEnv({ ...base, S3_PUBLIC_BUCKET: 'public' })).toThrow(
      /S3_ACCESS_KEY_ID[\s\S]*S3_SECRET_ACCESS_KEY[\s\S]*S3_PRIVATE_BUCKET[\s\S]*MEDIA_PUBLIC_BASE_URL/,
    );
    expect(() =>
      validateEnv({
        ...base,
        S3_ACCESS_KEY_ID: 'key',
        S3_SECRET_ACCESS_KEY: 'secret',
        S3_PUBLIC_BUCKET: 'public',
        S3_PRIVATE_BUCKET: 'private',
        MEDIA_PUBLIC_BASE_URL: 'https://cdn.oku24.kg',
      }),
    ).not.toThrow();
  });

  it('configures delivery prices and payments with safe defaults', () => {
    const env = validateEnv(base);
    expect(env.DELIVERY_PRICE_COURIER).toBe(20_000);
    expect(env.DELIVERY_PRICE_POST).toBe(30_000);
    expect(env.ORDER_PAYMENT_TTL_MINUTES).toBe(10);
    expect(env.PAYMENT_PROVIDER).toBe('test');
  });

  it('forbids the test payment provider in production', () => {
    const production = {
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(32),
      COOKIE_SECURE: 'true',
    };
    expect(() => validateEnv(production)).toThrow(/PAYMENT_PROVIDER/);
  });

  it('requires Finik credentials for the finik provider', () => {
    expect(() => validateEnv({ ...base, PAYMENT_PROVIDER: 'finik' })).toThrow(
      /FINIK_API_KEY[\s\S]*FINIK_ACCOUNT_ID[\s\S]*FINIK_PRIVATE_KEY[\s\S]*FINIK_PUBLIC_KEY/,
    );
  });

  it('requires an SMTP host for the smtp mail transport', () => {
    expect(() => validateEnv({ ...base, MAIL_TRANSPORT: 'smtp' })).toThrow(/SMTP_HOST/);
    expect(() =>
      validateEnv({ ...base, MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.example.com' }),
    ).not.toThrow();
  });
});
