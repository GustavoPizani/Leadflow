import { prisma } from '../lib/prisma';

/**
 * Remove: (1) leads de teste que o próprio Meta manda ao clicar "Test Lead" no Ads Manager
 * (marcados com fullName "<test lead: dummy data for ...>" / email "test@meta.com" — nunca são
 * leads reais); (2) linhas de duplicata antigas (status NEW + errorReason
 * "duplicado_30_dias:*") criadas antes do recadastro passar a atribuir ao mesmo corretor.
 */
async function main() {
  const dummy = await prisma.leadflowLead.deleteMany({
    where: {
      OR: [{ email: 'test@meta.com' }, { fullName: { startsWith: '<test lead' } }],
    },
  });
  console.log(`[cleanup] leads de teste do Meta removidos: ${dummy.count}`);

  const duplicates = await prisma.leadflowLead.deleteMany({
    where: { errorReason: { startsWith: 'duplicado_30_dias:' } },
  });
  console.log(`[cleanup] linhas de duplicata antigas removidas: ${duplicates.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
