import { prisma } from '../lib/prisma';
import { intakeLead } from '../lib/lead-intake';

/**
 * Traz manualmente um lead que caiu no Real-Sales mas não foi repassado (backfill pontual),
 * passando pelo mesmo pipeline de intake (mapeamento de campos + roleta + notificação) que o
 * webhook/ingest usaria se tivesse chegado na hora.
 *
 * Uso (sem hardcodar dados de lead no código/histórico do git):
 *   BACKFILL_EXTERNAL_FORM_ID=2429990674095430 \
 *   BACKFILL_LEAD_ID=1057429020042390 \
 *   BACKFILL_CREATED_TIME=2026-07-17T18:25:35.000Z \
 *   BACKFILL_EMAIL=alguem@exemplo.com \
 *   BACKFILL_TELEFONE=+5511999999999 \
 *   BACKFILL_NOME=Nome Completo \
 *   npx tsx scripts/backfill-lead.ts
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} antes de rodar este script.`);
  return value;
}

async function main() {
  const externalFormId = requireEnv('BACKFILL_EXTERNAL_FORM_ID');
  const form = await prisma.leadflowForm.findUnique({ where: { externalFormId } });
  if (!form) throw new Error(`Formulário com externalFormId=${externalFormId} não encontrado.`);

  const rawPayload = {
    id: requireEnv('BACKFILL_LEAD_ID'),
    created_time: requireEnv('BACKFILL_CREATED_TIME'),
    email: requireEnv('BACKFILL_EMAIL'),
    telefone: requireEnv('BACKFILL_TELEFONE'),
    nome_completo: requireEnv('BACKFILL_NOME'),
    ...(process.env.BACKFILL_OBSERVACAO
      ? { [process.env.BACKFILL_OBSERVACAO_CHAVE ?? 'observacao']: process.env.BACKFILL_OBSERVACAO }
      : {}),
  };

  const result = await intakeLead({ form, rawPayload });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
