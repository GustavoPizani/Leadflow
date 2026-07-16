import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccessLevel } from '@/lib/access-level';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForToken, getLongLivedToken, listAdminPages } from '@/lib/meta-graph';

function redirectUri(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  return `${base}/api/meta/auth/callback`;
}

function popupResult(request: NextRequest, status: 'success' | 'error') {
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  return NextResponse.redirect(`${base}/meta/oauth?status=${status}`);
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const access = await getAccessLevel(user.id);
  if (access.level !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const code = request.nextUrl.searchParams.get('code');
  if (!code) return popupResult(request, 'error');

  try {
    const shortToken = await exchangeCodeForToken(code, redirectUri(request));
    const userToken = await getLongLivedToken(shortToken);
    const pages = await listAdminPages(userToken);

    const activePageIds = pages.map((page) => page.id);

    for (const page of pages) {
      await prisma.leadflowMetaConnection.upsert({
        where: { pageId: page.id },
        create: {
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          userAccessToken: userToken,
          isActive: true,
        },
        update: {
          pageName: page.name,
          pageAccessToken: page.access_token,
          userAccessToken: userToken,
          isActive: true,
        },
      });
    }

    if (activePageIds.length > 0) {
      await prisma.leadflowMetaConnection.updateMany({
        where: { pageId: { notIn: activePageIds } },
        data: { isActive: false },
      });
    }

    return popupResult(request, 'success');
  } catch (err) {
    console.error('[META_OAUTH_CALLBACK]', err);
    return popupResult(request, 'error');
  }
}
