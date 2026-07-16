import { redirect } from 'next/navigation';
import { homeRouteForLevel } from '@/lib/access-level';
import { getCurrentUser, getCurrentAccess } from '@/lib/auth-context';
import { NavShell } from '@/components/nav-shell';

const LINKS = [
  { href: '/gestor', label: 'Dashboard' },
  { href: '/gestor/configuracoes', label: 'Minha conta' },
];

export default async function GestorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const access = await getCurrentAccess(user.id);
  if (access.level !== 'GESTOR') redirect(homeRouteForLevel(access.level));

  return (
    <NavShell title="Leadflow" links={LINKS}>
      {children}
    </NavShell>
  );
}
