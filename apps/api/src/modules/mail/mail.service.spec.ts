import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { Env } from '../../config/env';
import { MailService } from './mail.service';
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

describe('mail templates', () => {
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
