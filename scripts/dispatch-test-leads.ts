import { prisma } from '../lib/prisma';

const COUNT = 10;

async function main() {
  const form = await prisma.leadflowForm.findFirst({
    where: { source: 'manual' },
    orderBy: { createdAt: 'asc' },
  });
  if (!form) {
    throw new Error('Nenhum formulário genérico encontrado. Rode `npx prisma db seed` primeiro.');
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/api/leads/webhook/${form.webhookSecret}`;

  console.log(`[dispatch] disparando ${COUNT} leads de teste para ${url}`);

  for (let i = 0; i < COUNT; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: `Lead de teste ${i + 1}`,
        email: `lead-teste-${i + 1}-${Date.now()}@example.com`,
        phone: `1199999${String(i).padStart(4, '0')}`,
      }),
    });
    const json = await res.json().catch(() => null);
    console.log(`  lead ${i + 1}: ${res.status} ${JSON.stringify(json)}`);
  }

  const leads = await prisma.leadflowLead.findMany({
    where: { formId: form.id },
    orderBy: { createdAt: 'desc' },
    take: COUNT,
  });

  const byUser = new Map<string, number>();
  let errorCount = 0;
  for (const lead of leads) {
    if (lead.status === 'ERROR' || !lead.assignedUserId) {
      errorCount++;
      continue;
    }
    byUser.set(lead.assignedUserId, (byUser.get(lead.assignedUserId) ?? 0) + 1);
  }

  console.log('\n[dispatch] distribuição por corretor:');
  byUser.forEach((count, userId) => console.log(`  ${userId}: ${count} lead(s)`));
  if (errorCount > 0) {
    console.log(`  sem destinatário (ERROR): ${errorCount} lead(s)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
