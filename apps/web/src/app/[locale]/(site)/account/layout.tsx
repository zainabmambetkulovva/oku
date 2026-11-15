import { AccountShell } from '@/components/account/account-shell';

/** Личный кабинет: меню разделов; данные загружаются от имени покупателя. */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
