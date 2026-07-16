'use server';

import { searchCrmUsers, type CrmUser } from '@/lib/crm-users';
import { requireAdmin } from './guards';

export async function searchCrmUsersAction(query: string): Promise<CrmUser[]> {
  await requireAdmin();
  if (!query.trim()) return [];
  return searchCrmUsers(query);
}
