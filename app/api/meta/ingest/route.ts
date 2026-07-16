import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidInternalCall } from '@/lib/meta-ingest-auth';
import { getLeadDetail } from '@/lib/meta-graph';
import { intakeLead } from '@/lib/lead-intake';

/**
 * Chamado pelo Real-Sales (nunca pelo Meta diretamente) a cada evento de leadgen recebido no
 * webhook dele — repasse incondicional, tenha ou não `FacebookFormMapping` ativo lá. Aqui só
 * decidimos, pela nossa própria tabela `leadflow_forms`, se aquele form_id pertence ao
 * Leadflow. Isso permite que o mesmo formulário do Meta seja processado pelos dois sistemas
 * de forma independente.
 */
export async function POST(request: NextRequest) {
  if (!isValidInternalCall(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const formId = body?.form_id ? String(body.form_id) : null;
  const leadgenId = body?.leadgen_id ? String(body.leadgen_id) : null;
  if (!formId || !leadgenId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const form = await prisma.leadflowForm.findUnique({
    where: { externalFormId: formId },
    include: { metaConnection: true },
  });

  if (!form || !form.isActive || !form.metaConnection || !form.metaConnection.isActive) {
    return NextResponse.json({ status: 'ignored' });
  }

  try {
    const lead = await getLeadDetail(leadgenId, form.metaConnection.pageAccessToken);
    const result = await intakeLead({ form, rawPayload: lead });
    return NextResponse.json({ status: result.status });
  } catch (err) {
    console.error('[META_INGEST]', err);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
