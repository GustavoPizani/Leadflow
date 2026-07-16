import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAccessLevel, homeRouteForLevel } from '@/lib/access-level';

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const access = await getAccessLevel(user.id);
  redirect(homeRouteForLevel(access.level));
}
