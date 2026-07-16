import { createClient } from '@/lib/supabase/server';
import { getAccessLevel, type AccessLevel } from '@/lib/access-level';

/** Toda server action de mutação em /admin deve chamar isso primeiro. */
export async function requireAdmin(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const access = await getAccessLevel(user.id);
  if (access.level !== 'ADMIN') throw new Error('Acesso negado.');

  return user.id;
}

/** Toda server action de mutação em /gestor deve chamar isso primeiro. */
export async function requireGestor(): Promise<{ userId: string; access: AccessLevel & { level: 'GESTOR' } }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const access = await getAccessLevel(user.id);
  if (access.level !== 'GESTOR') throw new Error('Acesso negado.');

  return { userId: user.id, access };
}
