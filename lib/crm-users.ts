/**
 * ÚNICO ponto de contato deste projeto com o banco do CRM Real-Sales.
 *
 * Regras rígidas, não flexibilizar:
 * - Só leitura: toda query aqui é `prisma.$queryRaw`, nunca `$executeRaw`.
 * - Nunca concatenar SQL — sempre usar a tagged template do Prisma (parametrizada).
 * - Nunca declarar `users` como model no schema.prisma deste projeto.
 * - Nenhuma outra parte do código deste projeto pode montar SQL contra `users`
 *   fora deste arquivo.
 *
 * `searchCrmUsers` já exclui por padrão qualquer usuário presente em
 * `leadflow_admin_users`, para que o admin oculto nunca apareça em telas de
 * seleção (membros de roleta, definição de equipe, etc).
 */
import { prisma } from './prisma';

export type CrmRole = 'MARKETING_ADMIN' | 'BROKER';

export type CrmUser = {
  id: string;
  name: string;
  email: string;
  role: CrmRole;
  accountId: string | null;
};

export async function getCrmUserById(id: string): Promise<CrmUser | null> {
  const rows = await prisma.$queryRaw<CrmUser[]>`
    SELECT id, name, email, role::text as role, "accountId"
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listCrmUsersByIds(ids: string[]): Promise<CrmUser[]> {
  if (ids.length === 0) return [];
  return prisma.$queryRaw<CrmUser[]>`
    SELECT id, name, email, role::text as role, "accountId"
    FROM users
    WHERE id = ANY(${ids})
    ORDER BY name ASC
  `;
}

export async function searchCrmUsers(
  query: string,
  opts: { excludeAdmins?: boolean; limit?: number } = {},
): Promise<CrmUser[]> {
  const { excludeAdmins = true, limit = 20 } = opts;
  const like = `%${query.trim()}%`;

  if (excludeAdmins) {
    return prisma.$queryRaw<CrmUser[]>`
      SELECT id, name, email, role::text as role, "accountId"
      FROM users
      WHERE (name ILIKE ${like} OR email ILIKE ${like})
        AND id NOT IN (SELECT "userId" FROM leadflow_admin_users)
      ORDER BY name ASC
      LIMIT ${limit}
    `;
  }

  return prisma.$queryRaw<CrmUser[]>`
    SELECT id, name, email, role::text as role, "accountId"
    FROM users
    WHERE (name ILIKE ${like} OR email ILIKE ${like})
    ORDER BY name ASC
    LIMIT ${limit}
  `;
}

/** Usado só pelo seed, para autodetectar o admin oculto existente no CRM. */
export async function findCrmUsersByRole(role: CrmRole): Promise<CrmUser[]> {
  return prisma.$queryRaw<CrmUser[]>`
    SELECT id, name, email, role::text as role, "accountId"
    FROM users
    WHERE role::text = ${role}
    ORDER BY name ASC
  `;
}
