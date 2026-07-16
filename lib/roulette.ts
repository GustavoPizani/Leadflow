import { prisma } from './prisma';

export type RouletteAssignment =
  | { status: 'ASSIGNED'; userId: string }
  | { status: 'ERROR'; errorReason: string };

/**
 * Escolhe o próximo destinatário de uma roleta de forma atômica e sem
 * condição de corrida com leads simultâneos. `leadflow_roulette_members` é
 * uma tabela própria deste projeto — a restrição de "só SELECT" do
 * lib/crm-users.ts vale apenas para a tabela externa `users`.
 *
 * A escolha + atualização de `lastAssignedAt` acontece numa ÚNICA instrução
 * SQL (CTE + UPDATE), com `FOR UPDATE SKIP LOCKED` — isso evita duas
 * armadilhas:
 * - Um `prisma.$transaction` interativo (BEGIN/COMMIT explícito) segura uma
 *   conexão dedicada; sob o pooler em modo transaction do Supabase
 *   (pgbouncer=true na porta 6543) isso é caro sob concorrência e, se a
 *   conexão cair no meio, pode deixar lock preso até o pooler resetá-la.
 *   Um único statement autocommit não tem esse risco.
 * - `FOR UPDATE` simples (sem skip) pode travar numa linha que já não é
 *   mais a de `lastAssignedAt` mais antigo depois de esperar outro commit,
 *   furando a ordem do round-robin.
 * Sob concorrência alta, `SKIP LOCKED` pode devolver 0 linhas por instantes
 * (todos os membros momentaneamente travados por outras chamadas); por isso
 * há retry com backoff antes de desistir.
 */
async function pickNextRouletteMember(rouletteId: string): Promise<string | null> {
  const maxAttempts = 15;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rows = await prisma.$queryRaw<{ userId: string }[]>`
      WITH next_member AS (
        SELECT "rouletteId", "userId"
        FROM leadflow_roulette_members
        WHERE "rouletteId" = ${rouletteId}
        ORDER BY "lastAssignedAt" ASC NULLS FIRST
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE leadflow_roulette_members m
      SET "lastAssignedAt" = now()
      FROM next_member n
      WHERE m."rouletteId" = n."rouletteId" AND m."userId" = n."userId"
      RETURNING m."userId"
    `;
    if (rows[0]) return rows[0].userId;

    const hasAnyMember = await prisma.leadflowRouletteMember.findFirst({
      where: { rouletteId },
      select: { userId: true },
    });
    if (!hasAnyMember) return null;

    await new Promise((resolve) => setTimeout(resolve, 20 + attempt * 15 + Math.random() * 20));
  }
  return null;
}

async function isRouletteUsable(rouletteId: string): Promise<boolean> {
  const roulette = await prisma.leadflowRoulette.findUnique({ where: { id: rouletteId } });
  if (!roulette || !roulette.isActive) return false;

  const now = new Date();
  if (roulette.validFrom && now < roulette.validFrom) return false;
  if (roulette.validUntil && now > roulette.validUntil) return false;

  return true;
}

/**
 * Resolve o destinatário de um lead: tenta a roleta informada (se ativa e
 * dentro do período de validade), cai no defaultUserId do formulário, e por
 * fim marca ERROR/"sem_destinatario" se nada estiver disponível.
 */
export async function assignLead(params: {
  rouletteId: string | null;
  defaultUserId: string | null;
}): Promise<RouletteAssignment> {
  const { rouletteId, defaultUserId } = params;

  if (rouletteId && (await isRouletteUsable(rouletteId))) {
    const userId = await pickNextRouletteMember(rouletteId);
    if (userId) return { status: 'ASSIGNED', userId };
  }

  if (defaultUserId) return { status: 'ASSIGNED', userId: defaultUserId };

  return { status: 'ERROR', errorReason: 'sem_destinatario' };
}
