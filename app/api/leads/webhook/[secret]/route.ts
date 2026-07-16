import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { intakeLead } from '@/lib/lead-intake';

export async function POST(request: NextRequest, { params }: { params: { secret: string } }) {
  const form = await prisma.leadflowForm.findUnique({ where: { webhookSecret: params.secret } });

  if (!form || !form.isActive) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const result = await intakeLead({ form, rawPayload });

  return NextResponse.json({ status: result.status });
}
