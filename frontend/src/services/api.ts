const base = process.env.NEXT_PUBLIC_API_URL ?? '/api';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
let refreshing: Promise<boolean> | null = null;
async function refreshSession() {
  if (!refreshing)
    refreshing = fetch(base + '/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Cesda-Client': 'web' },
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base + path, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Cesda-Client': 'web',
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar. Confira sua conexão e tente novamente.',
      0,
      'NETWORK_ERROR',
    );
  }
  if (
    response.status === 401 &&
    retry &&
    ![
      '/auth/login',
      '/auth/register',
      '/auth/logout',
      '/auth/refresh',
    ].includes(path) &&
    (await refreshSession())
  )
    return api<T>(path, options, false);
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      body?.error?.message ?? 'Não foi possível concluir. Tente novamente.',
      response.status,
      body?.error?.code ?? 'REQUEST_ERROR',
    );
  return body.data as T;
}
export const post = <T>(path: string, body: unknown, key?: string) =>
  api<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: key ? { 'Idempotency-Key': key } : {},
  });
export const patch = <T>(path: string, body: unknown = {}) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
