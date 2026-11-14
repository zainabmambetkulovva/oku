import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { Env } from '../../config/env';
import { BREVO_SEND_URL, MailService, parseSender } from './mail.service';
import { emailVerificationMail, passwordResetMail } from './mail.templates';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const config = (values: Record<string, unknown>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService<Env, true>;

const message = { to: 'reader@oku24.kg', subject: 'Subject', text: 'Text', html: '<p>Text</p>' };

describe('MailService', () => {
  beforeEach(() => jest.mocked(createTransport).mockReset());

  it('only logs messages with the log transport', async () => {
    const service = new MailService(config({ MAIL_TRANSPORT: 'log', MAIL_FROM: 'from@x' }));
    const logSpy = jest
      .spyOn((service as unknown as { logger: { log: () => void } }).logger, 'log')
      .mockImplementation(() => undefined);

    await service.send(message);

    expect(createTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('to=reader@oku24.kg'));
  });

  it('sends through SMTP with the smtp transport', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    jest.mocked(createTransport).mockReturnValue({ sendMail } as never);

    const service = new MailService(
      config({
        MAIL_TRANSPORT: 'smtp',
        MAIL_FROM: 'OKU_24 <no-reply@oku24.kg>',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
        SMTP_SECURE: false,
        SMTP_USER: 'user',
        SMTP_PASSWORD: 'secret',
      }),
    );
    jest
      .spyOn((service as unknown as { logger: { log: () => void } }).logger, 'log')
      .mockImplementation(() => undefined);

    await service.send(message);

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'secret' },
    });
    expect(sendMail).toHaveBeenCalledWith({ from: 'OKU_24 <no-reply@oku24.kg>', ...message });
  });
});

describe('MailService with Brevo', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    jest.mocked(createTransport).mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const service = () => {
    const instance = new MailService(
      config({
        MAIL_TRANSPORT: 'brevo',
        MAIL_FROM: 'OKU24 <no-reply@oku24.kg>',
        BREVO_API_KEY: 'test-key',
      }),
    );
    jest
      .spyOn((instance as unknown as { logger: { log: () => void } }).logger, 'log')
      .mockImplementation(() => undefined);
    return instance;
  };

  it('sends through the Brevo API with the key in the header', async () => {
    fetchMock.mockResolvedValue(new Response('{"messageId":"1"}', { status: 201 }));

    await service().send(message);

    expect(fetchMock).toHaveBeenCalledWith(
      BREVO_SEND_URL,
      expect.objectContaining({ method: 'POST' }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['api-key']).toBe('test-key');
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { name: 'OKU24', email: 'no-reply@oku24.kg' },
      to: [{ email: 'reader@oku24.kg' }],
      subject: 'Subject',
      htmlContent: '<p>Text</p>',
      textContent: 'Text',
    });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('throws when Brevo rejects the message', async () => {
    fetchMock.mockResolvedValue(new Response('{"code":"unauthorized"}', { status: 401 }));
    await expect(service().send(message)).rejects.toThrow('Brevo responded with 401');
  });

  it('parses the sender', () => {
    expect(parseSender('OKU24 <a@b.kg>')).toEqual({ name: 'OKU24', email: 'a@b.kg' });
    expect(parseSender('"OKU 24" <a@b.kg>')).toEqual({ name: 'OKU 24', email: 'a@b.kg' });
    expect(parseSender('a@b.kg')).toEqual({ email: 'a@b.kg' });
  });
});

describe('mail templates', () => {
  it('builds the verification e-mail in Kyrgyz', () => {
    const mail = emailVerificationMail(
      'a@b.kg',
      'https://oku24.kg/ky/verify-email?token=t',
      24,
      'ky',
    );
    expect(mail.subject).toContain('ырастаңыз');
    expect(mail.html).toContain('lang="ky"');
    expect(mail.text).toContain('24 саат');
  });

  it('builds the verification e-mail with the link', () => {
    const mail = emailVerificationMail('a@b.kg', 'https://oku24.kg/verify-email?token=t', 24);

    expect(mail.to).toBe('a@b.kg');
    expect(mail.text).toContain('https://oku24.kg/verify-email?token=t');
    expect(mail.html).toContain('href="https://oku24.kg/verify-email?token=t"');
    expect(mail.text).toContain('24 ч');
  });

  it('escapes HTML in links', () => {
    const mail = passwordResetMail('a@b.kg', 'https://oku24.kg/reset?token="><script>', 60);

    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&quot;&gt;&lt;script&gt;');
  });
});
