import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleAuthError, GoogleAuthService, safeNextPath } from './google-auth.service';

const service = (values: Record<string, unknown>) =>
  new GoogleAuthService(
    {} as PrismaService,
    { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>,
  );

describe('GoogleAuthService', () => {
  it('is unavailable until both Google keys are configured', () => {
    const google = service({ API_PUBLIC_URL: 'https://oku24.vercel.app/' });
    expect(google.enabled).toBe(false);
    expect(() => google.start('ru', null)).toThrow(GoogleAuthError);
    expect(google.redirectUri).toBe('https://oku24.vercel.app/api/v1/auth/google/callback');
  });

  it('builds the Google URL in the visitor language', () => {
    const google = service({
      API_PUBLIC_URL: 'https://oku24.vercel.app',
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
    });
    const { url, flow } = google.start('ky', '/ky/books');
    const params = new URL(url).searchParams;
    expect(params.get('hl')).toBe('ky');
    expect(params.get('state')).toBe(flow.state);
    expect(url).not.toContain('secret');
    expect(flow).toMatchObject({ locale: 'ky', next: '/ky/books' });
  });

  it('accepts only same-site paths as the return address', () => {
    expect(safeNextPath('/ru/books?page=2')).toBe('/ru/books?page=2');
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
