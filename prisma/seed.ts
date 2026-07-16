import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { findCrmUsersByRole } from '../lib/crm-users';

async function seedAdmin() {
  const admins = await findCrmUsersByRole('MARKETING_ADMIN');
  for (const admin of admins) {
    await prisma.leadflowAdminUser.upsert({
      where: { userId: admin.id },
      create: { userId: admin.id },
      update: {},
    });
    console.log(`[seed] admin oculto detectado: ${admin.name} <${admin.email}>`);
  }
  if (admins.length === 0) {
    console.warn('[seed] nenhum usuário MARKETING_ADMIN encontrado em `users` — nenhum admin oculto criado.');
  }
}

async function seedSampleForm() {
  const roulette = await prisma.leadflowRoulette.upsert({
    where: { id: 'seed-roulette' },
    create: { id: 'seed-roulette', name: 'Roleta de exemplo', isActive: true },
    update: {},
  });

  const form = await prisma.leadflowForm.upsert({
    where: { id: 'seed-form' },
    create: {
      id: 'seed-form',
      name: 'Formulário genérico de exemplo',
      source: 'manual',
      roletaId: roulette.id,
      webhookSecret: randomBytes(24).toString('hex'),
    },
    update: {},
  });

  console.log(`[seed] webhook genérico de teste: /api/leads/webhook/${form.webhookSecret}`);
  return { roulette };
}

async function main() {
  await seedAdmin();
  const { roulette } = await seedSampleForm();

  console.log('\n[seed] próximos passos manuais:');
  console.log('  1. Acesse /admin/equipes para definir o gestor e os corretores.');
  console.log(`  2. Acesse /admin/roletas e adicione-os como membros da roleta "${roulette.name}".`);
  console.log('  3. Rode scripts/dispatch-test-leads.ts para conferir o round-robin.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
