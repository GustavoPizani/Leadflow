import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccessLevel } from '@/lib/access-level';
import { prisma } from '@/lib/prisma';
import { getFormQuestions } from '@/lib/meta-graph';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const access = await getAccessLevel(user.id);
  if (access.level !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const pageId = request.nextUrl.searchParams.get('pageId');
  const formId = request.nextUrl.searchParams.get('formId');
  if (!pageId || !formId) return NextResponse.json({ error: 'missing_params' }, { status: 400 });

  const connection = await prisma.leadflowMetaConnection.findUnique({ where: { pageId } });
  if (!connection || !connection.isActive) {
    return NextResponse.json({ error: 'connection_not_found' }, { status: 404 });
  }

  try {
    const questions = await getFormQuestions(formId, connection.pageAccessToken);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[META_FORM_FIELDS]', err);
    return NextResponse.json({ error: 'graph_api_error' }, { status: 502 });
  }
}
