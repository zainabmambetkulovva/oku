import { MailMessage } from './mail.types';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(title: string, paragraphs: string[], link: { url: string; label: string }) {
  const safeUrl = escapeHtml(link.url);
  return `<!doctype html>
<html lang="ru">
  <body style="margin:0;padding:24px;background:#faf7f2;font-family:Arial,sans-serif;color:#1f2933">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>
      ${paragraphs.map((p) => `<p style="line-height:1.5">${escapeHtml(p)}</p>`).join('\n      ')}
      <p style="margin:24px 0">
        <a href="${safeUrl}" style="background:#f07c2a;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none">${escapeHtml(link.label)}</a>
      </p>
      <p style="font-size:12px;color:#6b7280;word-break:break-all">${safeUrl}</p>
      <p style="font-size:12px;color:#6b7280">Если вы не запрашивали это письмо, просто проигнорируйте его.</p>
    </div>
  </body>
</html>`;
}

export function emailVerificationMail(to: string, url: string, ttlHours: number): MailMessage {
  const paragraphs = [
    'Спасибо за регистрацию в OKU_24.',
    `Подтвердите адрес электронной почты. Ссылка действует ${ttlHours} ч.`,
  ];
  return {
    to,
    subject: 'OKU_24: подтверждение электронной почты',
    text: `${paragraphs.join('\n')}\n\n${url}`,
    html: layout('Подтверждение почты', paragraphs, { url, label: 'Подтвердить почту' }),
  };
}

export function passwordResetMail(to: string, url: string, ttlMinutes: number): MailMessage {
  const paragraphs = [
    'Мы получили запрос на восстановление пароля для вашего аккаунта OKU_24.',
    `Чтобы задать новый пароль, перейдите по ссылке. Ссылка действует ${ttlMinutes} мин.`,
  ];
  return {
    to,
    subject: 'OKU_24: восстановление пароля',
    text: `${paragraphs.join('\n')}\n\n${url}`,
    html: layout('Восстановление пароля', paragraphs, { url, label: 'Задать новый пароль' }),
  };
}

/** Письмо о событии заказа: заголовок, абзацы и ссылка на страницу заказа. */
export function orderMail(
  to: string,
  subject: string,
  title: string,
  paragraphs: string[],
  orderUrl: string,
): MailMessage {
  return {
    to,
    subject: `OKU_24: ${subject}`,
    text: `${paragraphs.join('\n')}\n\n${orderUrl}`,
    html: layout(title, paragraphs, { url: orderUrl, label: 'Открыть заказ' }),
  };
}

/** Подтверждение подписки на новости со ссылкой для отписки. */
export function newsletterWelcomeMail(to: string, unsubscribeUrl: string): MailMessage {
  const paragraphs = [
    'Вы подписались на новости OKU_24: новинки, подборки и акции.',
    'Отписаться можно в любой момент по ссылке ниже.',
  ];
  return {
    to,
    subject: 'OKU_24: подписка на новости',
    text: `${paragraphs.join('\n')}\n\nОтписаться: ${unsubscribeUrl}`,
    html: layout('Подписка оформлена', paragraphs, { url: unsubscribeUrl, label: 'Отписаться' }),
  };
}
