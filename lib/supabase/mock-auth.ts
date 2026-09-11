/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';

export const MOCK_AUTH_COOKIE = 'leadflow_mock_session';

export interface MockUser {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    leadflow_local_user?: boolean;
    must_change_password?: boolean;
  };
  aud: string;
  created_at: string;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes('<') || url.includes('>') || url.includes('pooler-host') || key.includes('<') || key.includes('>')) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createMockUser(email: string = 'admin@leadflow.com', name?: string): MockUser {
  let id = 'admin-user-id';
  let defaultName = 'Administrador Leadflow';

  if (email.includes('gestor')) {
    id = 'manager-1';
    defaultName = 'Carlos Gestor';
  } else if (email.includes('ana') || email.includes('corretor')) {
    id = 'broker-1';
    defaultName = 'Ana Silva';
  } else if (email.includes('bruno')) {
    id = 'broker-2';
    defaultName = 'Bruno Santos';
  }

  return {
    id,
    email,
    user_metadata: {
      name: name || defaultName,
      leadflow_local_user: true,
      must_change_password: false,
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
}

export function createMockBrowserClient() {
  return {
    auth: {
      async signInWithPassword({ email }: { email: string; password?: string }) {
        if (!email) {
          return { data: { user: null, session: null }, error: { message: 'E-mail obrigatório' } };
        }
        const user = createMockUser(email);
        const encoded = encodeURIComponent(JSON.stringify(user));
        document.cookie = `${MOCK_AUTH_COOKIE}=${encoded}; path=/; max-age=604800; SameSite=Lax`;
        return { data: { user, session: { access_token: 'mock-token', user } }, error: null };
      },

      async signOut() {
        document.cookie = `${MOCK_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
        return { error: null };
      },

      async getUser() {
        const match = document.cookie.match(new RegExp(`(^| )${MOCK_AUTH_COOKIE}=([^;]+)`));
        if (!match) return { data: { user: null }, error: null };
        try {
          const user = JSON.parse(decodeURIComponent(match[2])) as MockUser;
          return { data: { user }, error: null };
        } catch {
          return { data: { user: null }, error: null };
        }
      },

      async updateUser(params: { password?: string; data?: Record<string, unknown> }) {
        const current = await this.getUser();
        if (!current.data.user) return { data: { user: null }, error: { message: 'Não autenticado' } };
        const updated = {
          ...current.data.user,
          user_metadata: {
            ...current.data.user.user_metadata,
            ...(params.data ?? {}),
            must_change_password: false,
          },
        };
        const encoded = encodeURIComponent(JSON.stringify(updated));
        document.cookie = `${MOCK_AUTH_COOKIE}=${encoded}; path=/; max-age=604800; SameSite=Lax`;
        return { data: { user: updated }, error: null };
      },
    },
  };
}

export function createMockServerClient(cookieStore: { get: (name: string) => { value: string } | undefined }) {
  return {
    auth: {
      async getUser() {
        const raw = cookieStore.get(MOCK_AUTH_COOKIE)?.value;
        if (!raw) return { data: { user: null }, error: null };
        try {
          const user = JSON.parse(decodeURIComponent(raw)) as MockUser;
          return { data: { user }, error: null };
        } catch {
          return { data: { user: null }, error: null };
        }
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}

export function mockUpdateSession(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const raw = request.cookies.get(MOCK_AUTH_COOKIE)?.value;
  let user: MockUser | null = null;
  if (raw) {
    try {
      user = JSON.parse(decodeURIComponent(raw));
    } catch {
      user = null;
    }
  }
  return { response, user };
}

export function createMockAdminClient() {
  return {
    auth: {
      admin: {
        async createUser(params: { email: string; password?: string; user_metadata?: any }) {
          const user = createMockUser(params.email, params.user_metadata?.name);
          return { data: { user }, error: null };
        },
        async getUserById(userId: string) {
          return {
            data: { user: { id: userId, email: `${userId}@leadflow.local`, user_metadata: {} } },
            error: null,
          };
        },
        async updateUserById(userId: string, params: any) {
          return {
            data: { user: { id: userId, email: `${userId}@leadflow.local`, user_metadata: params.user_metadata } },
            error: null,
          };
        },
        async deleteUser() {
          return { data: null, error: null };
        },
      },
    },
  };
}
