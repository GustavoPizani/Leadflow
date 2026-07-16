import { randomInt } from 'crypto';
import { prisma } from './prisma';
import { createAdminClient } from './supabase/admin';

/** Senha temporária curta e fácil de repassar por WhatsApp/mensagem, ex: Leadflow@482913. */
function generateTempPassword() {
  const digits = randomInt(100000, 1000000);
  return `Leadflow@${digits}`;
}

/**
 * Cria uma conta 100% nova (gestor ou corretor): um auth.users novo via
 * Supabase Admin API + a linha correspondente em leadflow_local_users. Sem
 * nenhum vínculo com a tabela `users` do CRM. Retorna a senha temporária
 * (só existe neste retorno — não fica salva em lugar nenhum).
 *
 * `must_change_password: true` fica no user_metadata do Supabase Auth (não numa coluna do
 * nosso banco) — o middleware barra o acesso ao resto do app até a pessoa trocar a senha em
 * /trocar-senha, que zera essa flag.
 */
export async function createLocalUser(params: { name: string; email: string }) {
  const { name, email } = params;
  const tempPassword = generateTempPassword();

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name, leadflow_local_user: true, must_change_password: true },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Falha ao criar usuário.');
  }

  try {
    const localUser = await prisma.leadflowLocalUser.create({
      data: { id: data.user.id, name, email },
    });
    return { localUser, tempPassword };
  } catch (err) {
    // Evita auth.users órfão se a linha local falhar (ex: e-mail duplicado na nossa tabela).
    await admin.auth.admin.deleteUser(data.user.id);
    throw err;
  }
}

/**
 * Gera uma nova senha temporária para uma conta já existente e força a troca no próximo
 * login (mesmo mecanismo de must_change_password da criação). Usado pelo botão "Resetar
 * senha" em /admin/equipes.
 */
export async function resetLocalUserPassword(userId: string) {
  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data: existing, error: getError } = await admin.auth.admin.getUserById(userId);
  if (getError || !existing.user) {
    throw new Error(getError?.message ?? 'Usuário não encontrado.');
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
    user_metadata: { ...existing.user.user_metadata, must_change_password: true },
  });
  if (error) throw new Error(error.message);

  return { tempPassword };
}

export async function searchLocalUsers(query: string, limit = 20) {
  if (!query.trim()) return [];
  return prisma.leadflowLocalUser.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: limit,
  });
}

export async function listLocalUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.leadflowLocalUser.findMany({ where: { id: { in: ids } } });
}

export async function listAllLocalUsers() {
  return prisma.leadflowLocalUser.findMany({ orderBy: { name: 'asc' } });
}
