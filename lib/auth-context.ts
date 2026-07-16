import { cache } from 'react';
import { createClient } from './supabase/server';
import { getAccessLevel, type AccessLevel } from './access-level';

/**
 * `supabase.auth.getUser()` revalida a sessão com o servidor de Auth (rede) e `getAccessLevel`
 * faz consultas no Prisma — ambos caros. Várias partes de uma mesma navegação (layout + page,
 * às vezes um componente) chamavam isso de novo, cada uma disparando sua própria ida à rede/
 * banco. `cache()` do React deduplica: dentro de uma mesma renderização de servidor, a segunda
 * chamada com os mesmos argumentos reaproveita o resultado da primeira, sem nova chamada.
 */
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentAccess = cache((userId: string): Promise<AccessLevel> => {
  return getAccessLevel(userId);
});
