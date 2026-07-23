import { useAdminSupabase } from './supabase';

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function getPublicConfig() {
  if (import.meta.client) {
    const clientConfig = (window as any).__NUXT__?.config?.public;
    if (clientConfig) {
      return clientConfig;
    }
  }

  return useRuntimeConfig().public;
}

export async function getAdminAccessToken() {
  const { data: { session } } = await useAdminSupabase().auth.getSession();
  return session?.access_token || null;
}

export async function ensureAdminSession() {
  const token = await getAdminAccessToken();
  if (!token) {
    return null;
  }

  const config = getPublicConfig();
  const response = await fetch(joinUrl(config.apiUrl, '/admin/me'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Falha ao validar acesso admin');
  }

  return response.json();
}

export async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await getAdminAccessToken();
  if (!token) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  const config = getPublicConfig();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(joinUrl(config.apiUrl, path), {
    ...init,
    headers,
  });
}
