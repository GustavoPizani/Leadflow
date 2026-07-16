import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAccessLevel, homeRouteForLevel } from '@/lib/access-level';
import { NavShell } from '@/components/nav-shell';

const LINKS = [
  { href: '/gestor', label: 'Dashboard' },
  { href: '/gestor/configuracoes', label: 'Minha conta' },
];

export default async function GestorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const access = await getAccessLevel(user.id);
  if (access.level !== 'GESTOR') redirect(homeRouteForLevel(access.level));

  return (
    <NavShell title="Leadflow" links={LINKS}>
      {children}
    </NavShell>
  );
}
