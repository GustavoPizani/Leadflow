import { prisma } from './prisma';
import type { AccessLevel } from './access-level';
import type { Prisma } from '@prisma/client';

export async function getAdminUserIds(): Promise<string[]> {
  const rows = await prisma.leadflowAdminUser.findMany({ select: { userId: true } });
  return rows.map((r) => r.userId);
}

export async function getTeamMemberUserIds(teamIds: string[]): Promise<string[]> {
  if (teamIds.length === 0) return [];
  const rows = await prisma.leadflowTeamMember.findMany({
    where: { teamId: { in: teamIds } },
    select: { userId: true },
  });
  return Array.from(new Set(rows.map((r) => r.userId)));
}

/**
 * Filtro de leads por nível de acesso. Vale em TODA listagem/contagem de
 * leads do sistema, sem exceção:
 * - ADMIN: sem filtro (mas o admin nunca aparece como `assignedUserId` de
 *   ninguém, já que ele nunca é oferecido como membro de roleta/equipe).
 * - GESTOR: só leads atribuídos a membros das equipes que ele gerencia.
 * - USUARIO: só os próprios leads.
 */
export async function leadWhereForAccess(
  userId: string,
  access: AccessLevel,
): Promise<Prisma.LeadflowLeadWhereInput> {
  switch (access.level) {
    case 'ADMIN':
      return {};
    case 'GESTOR': {
      const memberIds = await getTeamMemberUserIds(access.teamIds);
      return { assignedUserId: { in: memberIds } };
    }
    case 'USUARIO':
      return { assignedUserId: userId };
  }
}

/** Para relatórios/contagens por usuário: nunca incluir o admin oculto. */
export async function excludeAdminsWhere(): Promise<Prisma.LeadflowLeadWhereInput> {
  const adminIds = await getAdminUserIds();
  if (adminIds.length === 0) return {};
  return { assignedUserId: { notIn: adminIds } };
}
