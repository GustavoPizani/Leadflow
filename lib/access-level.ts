import { prisma } from './prisma';

export type AccessLevel =
  | { level: 'ADMIN' }
  | { level: 'GESTOR'; teamIds: string[] }
  | { level: 'DIRETOR'; teamIds: string[] }
  | { level: 'USUARIO' };

/**
 * Nunca decide nível de acesso a partir da tabela `users` do CRM (nem sua role
 * MARKETING_ADMIN/BROKER) — só a partir das tabelas próprias deste projeto.
 */
export async function getAccessLevel(userId: string): Promise<AccessLevel> {
  const admin = await prisma.leadflowAdminUser.findUnique({ where: { userId } });
  if (admin) return { level: 'ADMIN' };

  const localUser = await prisma.leadflowLocalUser.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const teams = await prisma.leadflowTeam.findMany({
    where: { managerId: userId },
    select: { id: true },
  });

  if (localUser?.role === 'GESTOR' && teams.length > 0) {
    return { level: 'GESTOR', teamIds: teams.map((t) => t.id) };
  }

  if (localUser?.role === 'DIRETOR') {
    const allTeams = await prisma.leadflowTeam.findMany({ select: { id: true } });
    return { level: 'DIRETOR', teamIds: allTeams.map((t) => t.id) };
  }

  if (teams.length > 0) {
    return { level: 'GESTOR', teamIds: teams.map((t) => t.id) };
  }

  return { level: 'USUARIO' };
}

export function homeRouteForLevel(level: AccessLevel['level']): string {
  switch (level) {
    case 'ADMIN':
      return '/admin';
    case 'GESTOR':
    case 'DIRETOR':
      return '/gestor';
    case 'USUARIO':
      return '/app';
  }
}
