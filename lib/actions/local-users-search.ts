'use server';

import { searchLocalUsers } from '@/lib/local-users';
import { requireAdmin } from './guards';

export async function searchLocalUsersAction(query: string) {
  await requireAdmin();
  return searchLocalUsers(query);
}
