import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAccessLevel, homeRouteForLevel } from '@/lib/access-level';
import { NavShell } from '@/components/nav-shell';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/formularios', label: 'Formulários' },
  { href: '/admin/roletas', label: 'Roletas' },
  { href: '/admin/equipes', label: 'Equipes' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/configuracoes', label: 'Minha conta' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const access = await getAccessLevel(user.id);
  if (access.level !== 'ADMIN') redirect(homeRouteForLevel(access.level));

  return (
    <NavShell title="Leadflow · Admin" links={LINKS}>
      {children}
    </NavShell>
  );
}
