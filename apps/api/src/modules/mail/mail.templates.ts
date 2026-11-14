import { MailMessage } from './mail.types';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type MailLocale = 'ru' | 'ky';

const FOOTER: Record<MailLocale, string> = {
  ru: 'Если вы не запрашивали это письмо, просто проигнорируйте его.',
  ky: 'Эгер бул катты сиз сураган эмес болсоңуз, жөн гана көңүл бурбаңыз.',
};

function layout(
  title: string,
  paragraphs: string[],
  link: { url: string; label: string },
  locale: MailLocale = 'ru',
) {
  const safeUrl = escapeHtml(link.url);
  return `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#f6ebe0;font-family:Arial,sans-serif;color:#3a2416">
    <div style="max-width:520px;margin:0 auto;background:#fffaf4;border-radius:20px;padding:32px;border:1px solid #ead7c3">
      <p style="margin:0 0 20px;font-size:13px;letter-spacing:3px;color:#b8873e;font-weight:bold">OKU24</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-family:Georgia,serif;color:#3a2416">${escapeHtml(title)}</h1>
      ${paragraphs.map((p) => `<p style="line-height:1.55">${escapeHtml(p)}</p>`).join('\n      ')}
      <p style="margin:24px 0">
        <a href="${safeUrl}" style="background:#3a2416;color:#fff6ea;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(link.label)}</a>
      </p>
      <p style="font-size:12px;color:#8a7360;word-break:break-all">${safeUrl}</p>
      <p style="font-size:12px;color:#8a7360">${FOOTER[locale]}</p>
    </div>
  </body>
</html>`;
}

const VERIFY = {
  ru: {
    subject: 'OKU24: подтвердите электронную почту',
    title: 'Подтверждение почты',
    lines: (hours: number) => [
      'Спасибо за регистрацию в OKU24!',
      `Подтвердите адрес электронной почты. Ссылка действует ${hours} ч.`,
    ],
    button: 'Подтвердить почту',
  },
  ky: {
    subject: 'OKU24: электрондук почтаңызды ырастаңыз',
    title: 'Почтаны ырастоо',
    lines: (hours: number) => [
      'OKU24төн катталганыңыз үчүн рахмат!',
      `Электрондук почтаңыздын дарегин ырастаңыз. Шилтеме ${hours} саат жарактуу.`,
    ],
    button: 'Почтаны ырастоо',
  },
} as const;

const RESET = {
  ru: {
    subject: 'OKU24: восстановление пароля',
    title: 'Восстановление пароля',
    lines: (minutes: number) => [
      'Мы получили запрос на восстановление пароля для вашего аккаунта OKU24.',
      `Чтобы задать новый пароль, перейдите по ссылке. Ссылка действует ${minutes} мин.`,
    ],
    button: 'Задать новый пароль',
  },
  ky: {
    subject: 'OKU24: сырсөздү калыбына келтирүү',
    title: 'Сырсөздү калыбына келтирүү',
    lines: (minutes: number) => [
      'OKU24 аккаунтуңуздун сырсөзүн калыбына келтирүү боюнча суроо алдык.',
      `Жаңы сырсөз коюу үчүн шилтемеге өтүңүз. Шилтеме ${minutes} мүнөт жарактуу.`,
    ],
    button: 'Жаңы сырсөз коюу',
  },
} as const;

export function emailVerificationMail(
  to: string,
  url: string,
  ttlHours: number,
  locale: MailLocale = 'ru',
): MailMessage {
  const copy = VERIFY[locale];
  const paragraphs = copy.lines(ttlHours);
  return {
    to,
    subject: copy.subject,
    text: `${paragraphs.join('\n')}\n\n${url}`,
    html: layout(copy.title, paragraphs, { url, label: copy.button }, locale),
  };
}

export function passwordResetMail(
  to: string,
  url: string,
  ttlMinutes: number,
  locale: MailLocale = 'ru',
): MailMessage {
  const copy = RESET[locale];
  const paragraphs = copy.lines(ttlMinutes);
  return {
    to,
    subject: copy.subject,
    text: `${paragraphs.join('\n')}\n\n${url}`,
    html: layout(copy.title, paragraphs, { url, label: copy.button }, locale),
  };
}

/** Письмо о событии заказа: заголовок, абзацы и ссылка на страницу заказа. */
export function orderMail(
  to: string,
  subject: string,
  title: string,
  paragraphs: string[],
  orderUrl: string,
  locale: MailLocale = 'ru',
): MailMessage {
  return {
    to,
    subject: `OKU24: ${subject}`,
    text: `${paragraphs.join('\n')}\n\n${orderUrl}`,
    html: layout(
      title,
      paragraphs,
      { url: orderUrl, label: locale === 'ky' ? 'Буйрутманы ачуу' : 'Открыть заказ' },
      locale,
    ),
  };
}

/** Подтверждение подписки на новости со ссылкой для отписки. */
export function newsletterWelcomeMail(to: string, unsubscribeUrl: string): MailMessage {
  const paragraphs = [
    'Вы подписались на новости OKU24: новинки, подборки и акции.',
    'Отписаться можно в любой момент по ссылке ниже.',
  ];
  return {
    to,
    subject: 'OKU24: подписка на новости',
    text: `${paragraphs.join('\n')}\n\nОтписаться: ${unsubscribeUrl}`,
    html: layout('Подписка оформлена', paragraphs, { url: unsubscribeUrl, label: 'Отписаться' }),
  };
}
