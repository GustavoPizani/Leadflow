import type { AccessLevel } from '@/lib/access-level';
import { getCurrentUser, getCurrentAccess } from '@/lib/auth-context';

/** Toda server action de mutação em /admin deve chamar isso primeiro. */
export async function requireAdmin(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Não autenticado.');

  const access = await getCurrentAccess(user.id);
  if (access.level !== 'ADMIN') throw new Error('Acesso negado.');

  return user.id;
}

/** Toda server action de mutação em /gestor deve chamar isso primeiro. */
export async function requireGestor(): Promise<{
  userId: string;
  access: AccessLevel & { level: 'GESTOR' | 'DIRETOR' };
}> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Não autenticado.');

  const access = await getCurrentAccess(user.id);
  if (access.level !== 'GESTOR' && access.level !== 'DIRETOR') {
    throw new Error('Acesso negado.');
  }

  return { userId: user.id, access };
}
