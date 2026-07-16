import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint ? String(body.endpoint) : null;
  const p256dh = body?.keys?.p256dh ? String(body.keys.p256dh) : null;
  const auth = body?.keys?.auth ? String(body.keys.auth) : null;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 });
  }

  await prisma.leadflowPushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth },
    update: { userId: user.id, p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await prisma.leadflowPushSubscription.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
