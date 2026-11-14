/** Плавное появление страницы при каждом переходе (шаблон пересоздаётся при навигации). */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-[page-in_0.55s_cubic-bezier(0.2,0.7,0.2,1)_both]">{children}</div>;
}
