'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { linkMetaForm } from '@/lib/actions/forms';

type MetaConnection = { id: string; pageId: string; pageName: string; isActive: boolean };
type LeadgenForm = { id: string; name: string; status: string };
type FormQuestion = { key: string; label: string; type: string };
type Option = { id: string; name: string };

const CRM_TARGETS = [
  { value: 'fullName', label: 'Nome completo' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'ignore', label: 'Ignorar' },
];

const AUTO_DETECT_BY_TYPE: Record<string, string> = {
  FULL_NAME: 'fullName',
  FIRST_NAME: 'fullName',
  LAST_NAME: 'fullName',
  EMAIL: 'email',
  PHONE: 'phone',
  PHONE_NUMBER: 'phone',
  WHATSAPP_NUMBER: 'phone',
};

const AUTO_DETECT_BY_KEY: [RegExp, string][] = [
  [/full[_-]?name|nome/i, 'fullName'],
  [/e[_-]?mail/i, 'email'],
  [/phone|telefone|celular|whatsapp/i, 'phone'],
];

function autoDetect(question: FormQuestion): string {
  if (AUTO_DETECT_BY_TYPE[question.type]) return AUTO_DETECT_BY_TYPE[question.type];
  for (const [pattern, target] of AUTO_DETECT_BY_KEY) {
    if (pattern.test(question.key) || pattern.test(question.label)) return target;
  }
  return 'ignore';
}

export function MetaConnectManager({
  connections,
  linkedExternalFormIds,
  roulettes,
}: {
  connections: MetaConnection[];
  linkedExternalFormIds: Set<string>;
  roulettes: Option[];
}) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'meta_oauth_done') {
        setConnecting(false);
        router.refresh();
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  function connect() {
    setConnecting(true);
    const width = 600;
    const height = 720;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      '/api/meta/auth',
      'meta_oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
    );
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        setConnecting(false);
      }
    }, 500);
  }

  const activeConnections = connections.filter((c) => c.isActive);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Meta (Facebook/Instagram Lead Ads)</CardTitle>
        <div className="flex items-center gap-2">
          {activeConnections.length > 0 && (
            <NewMetaFormDialog
              connections={activeConnections}
              linkedExternalFormIds={linkedExternalFormIds}
              roulettes={roulettes}
            />
          )}
          <Button type="button" size="sm" variant={activeConnections.length > 0 ? 'outline' : 'default'} onClick={connect} disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Conectando...
              </>
            ) : activeConnections.length > 0 ? (
              'Reconectar'
            ) : (
              'Conectar Meta'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeConnections.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Zap className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma página conectada ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {activeConnections.map((c) => (
                <Badge key={c.id} variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {c.pageName}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeConnections.length} página(s) conectada(s). Formulários vinculados aparecem na lista
              abaixo, marcados com a página de origem.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewMetaFormDialog({
  connections,
  linkedExternalFormIds,
  roulettes,
}: {
  connections: MetaConnection[];
  linkedExternalFormIds: Set<string>;
  roulettes: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pageId, setPageId] = useState('');
  const [forms, setForms] = useState<LeadgenForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [formId, setFormId] = useState('');
  const [questions, setQuestions] = useState<FormQuestion[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [name, setName] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [roletaId, setRoletaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetAll() {
    setPageId('');
    setForms([]);
    setFormId('');
    setQuestions(null);
    setName('');
    setMapping({});
    setRoletaId('');
    setError(null);
  }

  async function onPageChange(value: string) {
    setPageId(value);
    setFormId('');
    setQuestions(null);
    setForms([]);
    setError(null);
    if (!value) return;
    setLoadingForms(true);
    try {
      const res = await fetch(`/api/meta/forms?pageId=${value}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Falha ao listar formulários.');
      setForms(json.forms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao listar formulários.');
    } finally {
      setLoadingForms(false);
    }
  }

  async function onFormChange(value: string) {
    setFormId(value);
    setQuestions(null);
    setError(null);
    const form = forms.find((f) => f.id === value);
    setName(form?.name ?? '');
    if (!value || !pageId) return;
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/meta/form-fields?pageId=${pageId}&formId=${value}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Falha ao buscar campos do formulário.');
      const qs: FormQuestion[] = json.questions;
      setQuestions(qs);
      const autoMap: Record<string, string> = {};
      for (const q of qs) autoMap[q.key] = autoDetect(q);
      setMapping(autoMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao buscar campos do formulário.');
    } finally {
      setLoadingQuestions(false);
    }
  }

  function submit() {
    if (!pageId || !formId || !name.trim()) {
      setError('Selecione a página, o formulário e informe um nome.');
      return;
    }
    const connection = connections.find((c) => c.pageId === pageId);
    if (!connection) return;

    const fieldMappings: Record<string, string> = {};
    for (const [questionKey, target] of Object.entries(mapping)) {
      if (target === 'ignore' || !target) continue;
      fieldMappings[target] = questionKey;
    }

    startTransition(async () => {
      try {
        await linkMetaForm({
          metaConnectionId: connection.id,
          externalFormId: formId,
          name,
          roletaId: roletaId || null,
          fieldMappings,
        });
        setOpen(false);
        resetAll();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao vincular formulário.');
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (!next) resetAll();
      }}
    >
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        Adicionar formulário
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Vincular formulário do Meta</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Página</Label>
            <SelectField
              value={pageId}
              onValueChange={onPageChange}
              placeholder="Selecione..."
              options={connections.map((c) => ({ value: c.pageId, label: c.pageName }))}
            />
          </div>

          {pageId && (
            <div className="space-y-1">
              <Label className="text-xs">Formulário</Label>
              <SelectField
                value={formId}
                onValueChange={onFormChange}
                disabled={loadingForms}
                placeholder={loadingForms ? 'Carregando...' : 'Selecione...'}
                options={forms.map((f) => ({
                  value: f.id,
                  label: `${f.name} (${f.status})${linkedExternalFormIds.has(f.id) ? ' — já vinculado' : ''}`,
                }))}
              />
            </div>
          )}

          {formId && (
            <div className="space-y-1">
              <Label className="text-xs">Nome no Leadflow</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}

          {formId && (loadingQuestions || (questions && questions.length > 0)) && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mapeamento de campos
              </p>
              {loadingQuestions ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando campos do formulário...
                </div>
              ) : (
                <div className="space-y-2">
                  {questions!.map((q) => (
                    <div key={q.key} className="flex items-start gap-3">
                      <span className="min-w-0 flex-1 pt-1.5 text-xs leading-snug">{q.label}</span>
                      <SelectField
                        className="h-7 w-40 shrink-0 text-xs"
                        value={mapping[q.key] ?? 'ignore'}
                        onValueChange={(v) => setMapping((prev) => ({ ...prev, [q.key]: v }))}
                        options={CRM_TARGETS}
                      />
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    Campos deixados como &quot;Ignorar&quot; ficam disponíveis no payload bruto, mas não
                    preenchem nome/e-mail/telefone do lead.
                  </p>
                </div>
              )}
            </div>
          )}

          {formId && (
            <div className="space-y-1">
              <Label className="text-xs">Roleta</Label>
              <SelectField
                value={roletaId}
                onValueChange={setRoletaId}
                options={[{ value: '', label: 'Nenhuma' }, ...roulettes.map((r) => ({ value: r.id, label: r.name }))]}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={!formId || isPending}>
            {isPending ? 'Vinculando...' : 'Vincular ao Leadflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
