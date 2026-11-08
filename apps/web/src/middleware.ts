import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Node.js вместо Edge: в проекте Vercel с сервисами Edge-функции не поддерживаются
  runtime: 'nodejs',
  // Все страницы, кроме служебных путей Next.js и файлов
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
