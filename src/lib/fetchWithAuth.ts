/**
 * fetchWithAuth — Client-side fetch wrapper with automatic session handling
 * 
 * Features:
 * - Automatically redirects to login on 401 (session expired/invalid)
 * - Returns typed error objects instead of throwing
 * - Provides clear error messages for 403 (forbidden) responses
 */

interface FetchWithAuthOptions extends RequestInit {
  /** Skip automatic redirect on 401 (useful for background checks) */
  skipRedirect?: boolean;
}

interface FetchWithAuthResult<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

/**
 * Wraps fetch() with auth-aware error handling.
 * - On 401: attempts session refresh, then redirects to login if still failing
 * - On 403: returns clear "access denied" error
 * - On network error: returns generic error message
 */
export async function fetchWithAuth<T = unknown>(
  url: string,
  options: FetchWithAuthOptions = {}
): Promise<FetchWithAuthResult<T>> {
  const { skipRedirect = false, ...fetchOptions } = options;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'same-origin', // Ensure cookies are sent
    });

    // 401 — Session expired or invalid
    if (response.status === 401) {
      // Try refreshing the session
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();

        if (sessionData.authenticated) {
          // Session refreshed — retry original request
          const retry = await fetch(url, {
            ...fetchOptions,
            credentials: 'same-origin',
          });
          const retryData = await retry.json();

          if (retry.ok) {
            return { data: retryData as T, error: null, status: retry.status, ok: true };
          }
          return {
            data: null,
            error: retryData.error || 'Erreur lors de la requête',
            status: retry.status,
            ok: false,
          };
        }
      } catch {
        // Session refresh failed
      }

      // Session is truly invalid — redirect to login
      if (!skipRedirect) {
        const isAdmin = window.location.pathname.startsWith('/admin');
        const loginPath = isAdmin ? '/admin/connexion' : '/agence/connexion';
        window.location.href = loginPath;
      }

      return {
        data: null,
        error: 'Session expirée — Reconnexion requise',
        status: 401,
        ok: false,
      };
    }

    // 403 — Forbidden (wrong role)
    if (response.status === 403) {
      const body = await response.json().catch(() => ({ error: 'Accès non autorisé' }));
      return {
        data: null,
        error: body.error || 'Accès non autorisé — Permissions insuffisantes',
        status: 403,
        ok: false,
      };
    }

    // Other errors (4xx, 5xx)
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Erreur serveur' }));
      return {
        data: null,
        error: body.error || `Erreur ${response.status}`,
        status: response.status,
        ok: false,
      };
    }

    // Success
    const data = await response.json();
    return { data: data as T, error: null, status: response.status, ok: true };

  } catch (error) {
    // Network error (offline, CORS, etc.)
    return {
      data: null,
      error: 'Erreur de connexion — Vérifiez votre réseau',
      status: 0,
      ok: false,
    };
  }
}

/**
 * POST wrapper with JSON body and auth handling
 */
export async function postWithAuth<T = unknown>(
  url: string,
  body: unknown,
  options: Omit<FetchWithAuthOptions, 'body' | 'method'> = {}
): Promise<FetchWithAuthResult<T>> {
  return fetchWithAuth<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * PUT wrapper with JSON body and auth handling
 */
export async function putWithAuth<T = unknown>(
  url: string,
  body: unknown,
  options: Omit<FetchWithAuthOptions, 'body' | 'method'> = {}
): Promise<FetchWithAuthResult<T>> {
  return fetchWithAuth<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}
