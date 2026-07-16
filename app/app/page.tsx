import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadDeepLink } from '@/components/lead-deep-link';

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export default async function MeusLeadsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const leads = user
    ? await prisma.leadflowLead.findMany({
        where: { assignedUserId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { form: { select: { name: true } } },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Meus leads</h1>
        <p className="text-sm text-muted-foreground">Toque num lead pra ver os dados completos e compartilhar.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recebidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/app?lead=${lead.id}`}
              scroll={false}
              className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-medium">{lead.fullName ?? 'Sem nome'}</span>{' '}
                <span className="text-muted-foreground">— {lead.form?.name ?? lead.source}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={lead.status === 'ASSIGNED' ? 'default' : 'secondary'}>{lead.status}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
              </div>
            </Link>
          ))}
          {leads.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lead recebido ainda.</p>}
        </CardContent>
      </Card>

      <LeadDeepLink variant="full" />
    </div>
  );
}
