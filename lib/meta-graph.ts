/**
 * Helpers de OAuth + Graph API do Meta, usados só para o Leadflow conectar o mesmo App do
 * Meta que o Real-Sales já usa e obter tokens de página (para listar leadgen forms e buscar o
 * lead completo pelo leadgen_id via Graph API). O Leadflow NUNCA recebe webhook do Meta
 * diretamente — quem recebe é o Real-Sales, que repassa para /api/meta/ingest.
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';
const OAUTH_DIALOG = 'https://www.facebook.com/v21.0/dialog/oauth';

const OAUTH_SCOPES = [
  'pages_show_list',
  'leads_retrieval',
  'pages_manage_ads',
  'pages_manage_metadata',
  'pages_read_engagement',
  'business_management',
].join(',');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} não configurada.`);
  return value;
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const url = new URL(OAUTH_DIALOG);
  url.searchParams.set('client_id', requireEnv('FACEBOOK_APP_ID'));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', OAUTH_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('auth_type', 'rerequest');
  return url.toString();
}

export async function graphGet<T>(
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${GRAPH_API}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('access_token', token);

  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Graph API error em ${path}: ${json.error?.message ?? res.statusText}`);
  }
  return json as T;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const url = new URL(`${GRAPH_API}/oauth/access_token`);
  url.searchParams.set('client_id', requireEnv('FACEBOOK_APP_ID'));
  url.searchParams.set('client_secret', requireEnv('FACEBOOK_APP_SECRET'));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Falha ao trocar code por token: ${json.error?.message ?? 'resposta inválida'}`);
  }
  return json.access_token as string;
}

export async function getLongLivedToken(shortToken: string): Promise<string> {
  const url = new URL(`${GRAPH_API}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', requireEnv('FACEBOOK_APP_ID'));
  url.searchParams.set('client_secret', requireEnv('FACEBOOK_APP_SECRET'));
  url.searchParams.set('fb_exchange_token', shortToken);

  const res = await fetch(url.toString());
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Falha ao obter token de longa duração: ${json.error?.message ?? 'resposta inválida'}`);
  }
  return json.access_token as string;
}

export type GraphPage = { id: string; name: string; access_token: string };

/** Réplica da lógica do Real-Sales: /me/accounts + /me/businesses -> owned_pages/client_pages, deduplicado por id. */
export async function listAdminPages(userToken: string): Promise<GraphPage[]> {
  const byId = new Map<string, GraphPage>();

  const own = await graphGet<{ data: GraphPage[] }>('/me/accounts', userToken, {
    fields: 'id,name,access_token',
  });
  for (const page of own.data) byId.set(page.id, page);

  const businesses = await graphGet<{ data: { id: string }[] }>('/me/businesses', userToken, {});
  for (const business of businesses.data ?? []) {
    for (const edge of ['owned_pages', 'client_pages'] as const) {
      const pages = await graphGet<{ data: GraphPage[] }>(`/${business.id}/${edge}`, userToken, {
        fields: 'id,name,access_token',
      });
      for (const page of pages.data ?? []) byId.set(page.id, page);
    }
  }

  return Array.from(byId.values());
}

export type LeadgenForm = { id: string; name: string; status: string };

export async function listLeadgenForms(pageId: string, pageToken: string): Promise<LeadgenForm[]> {
  const result = await graphGet<{ data: LeadgenForm[] }>(`/${pageId}/leadgen_forms`, pageToken, {
    fields: 'id,name,status',
    limit: '100',
  });
  return result.data;
}

export type FormQuestion = { key: string; label: string; type: string };

export async function getFormQuestions(formId: string, pageToken: string): Promise<FormQuestion[]> {
  const result = await graphGet<{ questions: FormQuestion[] }>(`/${formId}`, pageToken, {
    fields: 'questions',
  });
  return result.questions ?? [];
}

export type FbLeadField = { name: string; values: string[] };
export type FbLead = { id: string; created_time: string; field_data: FbLeadField[] };

export async function getLeadDetail(leadgenId: string, pageToken: string): Promise<FbLead> {
  return graphGet<FbLead>(`/${leadgenId}`, pageToken, { fields: 'id,created_time,field_data' });
}

export async function listFormLeads(
  formId: string,
  pageToken: string,
  after?: string,
): Promise<{ data: FbLead[]; nextAfter: string | null }> {
  const result = await graphGet<{ data: FbLead[]; paging?: { cursors?: { after?: string } } }>(
    `/${formId}/leads`,
    pageToken,
    { fields: 'id,created_time,field_data', limit: '100', ...(after ? { after } : {}) },
  );
  return { data: result.data, nextAfter: result.paging?.cursors?.after ?? null };
}
