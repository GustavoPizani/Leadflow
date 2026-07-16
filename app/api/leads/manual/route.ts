import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccessLevel } from '@/lib/access-level';
import { createManualLead } from '@/lib/lead-intake';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const access = await getAccessLevel(user.id);
  if (access.level !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const { fullName, email, phone, source, rouletteId, defaultUserId } = body as Record<
    string,
    string | null | undefined
  >;

  const result = await createManualLead({
    fullName: fullName ?? null,
    email: email ?? null,
    phone: phone ?? null,
    source: source || 'manual',
    rouletteId: rouletteId ?? null,
    defaultUserId: defaultUserId ?? null,
  });

  return NextResponse.json(result);
}
