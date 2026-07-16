import { prisma } from '@/lib/prisma';
import { listLocalUsersByIds } from '@/lib/local-users';
import { toggleFormActive, regenerateWebhookSecret, deleteForm, syncMetaFormNow } from '@/lib/actions/forms';
import { WebhookUrl } from '@/components/admin/webhook-url';
import { MetaConnectManager } from '@/components/admin/meta-connect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export default async function FormulariosPage() {
  const [forms, roulettes, metaConnections] = await Promise.all([
    prisma.leadflowForm.findMany({
      orderBy: { createdAt: 'desc' },
      include: { roulette: { select: { name: true } }, metaConnection: { select: { pageName: true } } },
    }),
    prisma.leadflowRoulette.findMany({ orderBy: { name: 'asc' } }),
    prisma.leadflowMetaConnection.findMany({ orderBy: { pageName: 'asc' } }),
  ]);

  const defaultUserIds = forms.map((f) => f.defaultUserId).filter((id): id is string => !!id);
  const localUsers = await listLocalUsersByIds(defaultUserIds);
  const localUserById = new Map(localUsers.map((u) => [u.id, u]));
  const linkedExternalFormIds = new Set(
    forms.map((f) => f.externalFormId).filter((id): id is string => !!id),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Formulários</h1>

      <MetaConnectManager
        connections={metaConnections}
        linkedExternalFormIds={linkedExternalFormIds}
        roulettes={roulettes}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formulários vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Zap className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Nenhum formulário configurado</p>
              <p className="text-sm">Conecte o Meta acima e adicione seu primeiro formulário.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {forms.map((form) => {
                const defaultUser = form.defaultUserId ? localUserById.get(form.defaultUserId) : null;
                return (
                  <div key={form.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{form.name}</span>
                        <Badge variant={form.isActive ? 'default' : 'secondary'}>
                          {form.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {form.metaConnection && <Badge variant="outline">Meta: {form.metaConnection.pageName}</Badge>}
                        {!form.metaConnection && <Badge variant="outline">origem: {form.source}</Badge>}
                        {form.roulette && <Badge variant="outline">roleta: {form.roulette.name}</Badge>}
                      </div>
                      <div className="flex gap-2">
                        {form.externalFormId && (
                          <form action={syncMetaFormNow}>
                            <input type="hidden" name="id" value={form.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Sincronizar agora
                            </Button>
                          </form>
                        )}
                        <form action={toggleFormActive}>
                          <input type="hidden" name="id" value={form.id} />
                          <input type="hidden" name="isActive" value={String(form.isActive)} />
                          <Button type="submit" size="sm" variant="outline">
                            {form.isActive ? 'Desativar' : 'Ativar'}
                          </Button>
                        </form>
                        {!form.externalFormId && (
                          <form action={regenerateWebhookSecret}>
                            <input type="hidden" name="id" value={form.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Trocar secret
                            </Button>
                          </form>
                        )}
                        <form action={deleteForm}>
                          <input type="hidden" name="id" value={form.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Excluir
                          </Button>
                        </form>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {form.externalFormId ? (
                        <div>
                          Leadgen form <code className="rounded bg-muted px-1 font-mono text-xs">{form.externalFormId}</code>{' '}
                          — recebido automaticamente, não precisa de nenhuma configuração no Meta.
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>Webhook:</span> <WebhookUrl secret={form.webhookSecret} />
                        </div>
                      )}
                      <div>
                        Destinatário padrão: {defaultUser ? `${defaultUser.name} (${defaultUser.email})` : '—'}
                      </div>
                      {Object.keys(form.fieldMappings as Record<string, unknown>).length > 0 && (
                        <pre className="mt-1 rounded-md border bg-muted p-2 text-xs">
                          {JSON.stringify(form.fieldMappings, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
