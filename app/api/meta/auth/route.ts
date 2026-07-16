import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccessLevel } from '@/lib/access-level';
import { buildAuthorizeUrl } from '@/lib/meta-graph';

function redirectUri(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  return `${base}/api/meta/auth/callback`;
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const access = await getAccessLevel(user.id);
  if (access.level !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64url');
  const url = buildAuthorizeUrl(redirectUri(request), state);

  return NextResponse.redirect(url);
}
