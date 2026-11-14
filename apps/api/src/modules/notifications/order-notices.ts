import { OrderStatus } from '@prisma/client';
import type { SiteLocale } from '../auth/auth.constants';

/** Тексты уведомлений о заказах на языке покупателя (ru / ky). */

export const som = (tyiyn: number) => {
  const value = tyiyn / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace('.', ',')} сом`;
};

interface NoticeInput {
  orderNumber: string;
  isDigital: boolean;
  comment?: string;
}

type NoticeTexts = Partial<
  Record<OrderStatus, { title: string; message: (order: NoticeInput) => string }>
>;

const RU: NoticeTexts = {
  PAID: {
    title: 'Заказ оплачен',
    message: ({ orderNumber }) => `Оплата заказа ${orderNumber} получена. Мы начали его собирать.`,
  },
  PROCESSING: {
    title: 'Заказ принят в обработку',
    message: ({ orderNumber }) => `Заказ ${orderNumber} подтверждён и готовится к отправке.`,
  },
  SHIPPED: {
    title: 'Заказ отправлен',
    message: ({ orderNumber }) => `Заказ ${orderNumber} передан в доставку.`,
  },
  COMPLETED: {
    title: 'Заказ выполнен',
    message: ({ orderNumber, isDigital }) =>
      isDigital
        ? `Заказ ${orderNumber} оплачен. Аудиокниги доступны в разделе «Мои аудиокниги».`
        : `Заказ ${orderNumber} получен. Спасибо за покупку!`,
  },
  CANCELLED: {
    title: 'Заказ отменён',
    message: ({ orderNumber, comment }) =>
      comment === 'Payment time expired'
        ? `Заказ ${orderNumber} отменён: время на оплату истекло. Книги вернулись в продажу.`
        : `Заказ ${orderNumber} отменён.`,
  },
  REFUNDED: {
    title: 'Деньги возвращены',
    message: ({ orderNumber }) => `Оплата по заказу ${orderNumber} возвращена.`,
  },
};

const KY: NoticeTexts = {
  PAID: {
    title: 'Буйрутма төлөндү',
    message: ({ orderNumber }) =>
      `${orderNumber} буйрутмасынын төлөмү алынды. Аны чогулта баштадык.`,
  },
  PROCESSING: {
    title: 'Буйрутма иштетүүгө кабыл алынды',
    message: ({ orderNumber }) => `${orderNumber} буйрутмасы ырасталды жана жөнөтүүгө даярдалууда.`,
  },
  SHIPPED: {
    title: 'Буйрутма жөнөтүлдү',
    message: ({ orderNumber }) => `${orderNumber} буйрутмасы жеткирүүгө берилди.`,
  },
  COMPLETED: {
    title: 'Буйрутма аткарылды',
    message: ({ orderNumber, isDigital }) =>
      isDigital
        ? `${orderNumber} буйрутмасы төлөндү. Аудиокитептер «Менин аудиокитептерим» бөлүмүндө.`
        : `${orderNumber} буйрутмасы алынды. Сатып алганыңыз үчүн рахмат!`,
  },
  CANCELLED: {
    title: 'Буйрутма жокко чыгарылды',
    message: ({ orderNumber, comment }) =>
      comment === 'Payment time expired'
        ? `${orderNumber} буйрутмасы жокко чыгарылды: төлөө убактысы бүттү. Китептер кайра сатыкка чыкты.`
        : `${orderNumber} буйрутмасы жокко чыгарылды.`,
  },
  REFUNDED: {
    title: 'Акча кайтарылды',
    message: ({ orderNumber }) => `${orderNumber} буйрутмасы боюнча төлөм кайтарылды.`,
  },
};

export function statusNotice(locale: SiteLocale, status: OrderStatus) {
  return (locale === 'ky' ? KY : RU)[status];
}

export function createdNotice(
  locale: SiteLocale,
  order: { orderNumber: string; total: number; paymentMethod: string; expiresAt: Date | null },
) {
  const time = order.expiresAt?.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bishkek',
  });
  if (locale === 'ky') {
    const tail =
      order.paymentMethod === 'ONLINE' && time
        ? ` Аны ${time} чейин төлөңүз (Бишкек убактысы), антпесе буйрутма жокко чыгарылат.`
        : order.paymentMethod === 'CASH'
          ? ' Төлөм — алганда накталай.'
          : '';
    return {
      title: 'Буйрутма берилди',
      message: `${som(order.total)} суммасындагы ${order.orderNumber} буйрутмасы берилди.${tail}`,
    };
  }
  const tail =
    order.paymentMethod === 'ONLINE' && time
      ? ` Оплатите его до ${time} (время Бишкека), иначе заказ будет отменён.`
      : order.paymentMethod === 'CASH'
        ? ' Оплата — наличными при получении.'
        : '';
  return {
    title: 'Заказ оформлен',
    message: `Заказ ${order.orderNumber} на сумму ${som(order.total)} оформлен.${tail}`,
  };
}

export const ACCESS_GRANTED = {
  ru: (title: string) => ({
    title: 'Открыт доступ к аудиокниге',
    message: `Аудиокнига «${title}» доступна в разделе «Мои аудиокниги».`,
  }),
  ky: (title: string) => ({
    title: 'Аудиокитепке жеткиликтүүлүк ачылды',
    message: `«${title}» аудиокитеби «Менин аудиокитептерим» бөлүмүндө.`,
  }),
};
