import { redirect } from 'next/navigation';
import { homeRouteForLevel } from '@/lib/access-level';
import { getCurrentUser, getCurrentAccess } from '@/lib/auth-context';

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const access = await getCurrentAccess(user.id);
  redirect(homeRouteForLevel(access.level));
}
