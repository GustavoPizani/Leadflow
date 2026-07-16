import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/push';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await sendPushToUser(user.id, {
    title: '🔔 Teste do Leadflow',
    body: 'Se você viu isso, as notificações estão funcionando.',
    data: { url: '/' },
  });

  return NextResponse.json({ ok: true });
}
