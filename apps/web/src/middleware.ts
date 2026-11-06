import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Все страницы, кроме служебных путей Next.js и файлов
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
