/**
 * Контакты магазина. Значения по умолчанию — от владельца магазина;
 * их можно переопределить переменными окружения NEXT_PUBLIC_*.
 */
const whatsapp = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '+996 779 040 589';

export const SITE_CONTACTS = {
  whatsapp,
  /** Ссылка wa.me — только цифры номера */
  whatsappUrl: `https://wa.me/${whatsapp.replace(/\D/g, '')}`,
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/oku_24/',
  instagramHandle: '@oku_24',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || null,
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
} as const;

/** Пять официальных категорий каталога (ТЗ). Аудиокниги — отдельный каталог. */
export const OFFICIAL_CATEGORIES = [
  { key: 'psychology', href: '/books?category=psychology' },
  { key: 'self-development', href: '/books?category=self-development' },
  { key: 'islamic-literature', href: '/books?category=islamic-literature' },
  { key: 'kids', href: '/books?category=kids' },
  { key: 'audiobooks', href: '/audiobooks' },
] as const;
