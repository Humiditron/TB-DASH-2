import { client, setupAuth, logout, postApiAuthToken } from '@enerlab/thingsboard-client';

/**
 * Normalizes any JWT or Bearer token by:
 * 1. Trimming whitespace
 * 2. Stripping wrapping quotes (" or ')
 * 3. Stripping any case-insensitive "Bearer " prefix
 * 4. Ensuring clean raw JWT token output
 */
export function normalizeBearerToken(token: string | null | undefined): string | null {
  if (!token || typeof token !== 'string') return null;
  let clean = token.trim();
  // Strip surrounding quotes
  clean = clean.replace(/^["']|["']$/g, '').trim();
  // Strip Bearer prefix (case-insensitive) if present
  if (/^bearer\s+/i.test(clean)) {
    clean = clean.replace(/^bearer\s+/i, '').trim();
  }
  // Strip any lingering quotes
  clean = clean.replace(/^["']|["']$/g, '').trim();
  return clean.length > 0 ? clean : null;
}

/**
 * Returns a properly formatted "Bearer <token>" string,
 * guaranteed not to have duplicate "Bearer Bearer".
 */
export function formatBearerHeader(token: string | null | undefined): string | null {
  const clean = normalizeBearerToken(token);
  if (!clean) return null;
  return `Bearer ${clean}`;
}

/**
 * Safely decodes the payload of a JWT string.
 */
export function decodeJwtPayload(tokenStr?: string | null): Record<string, unknown> | null {
  const clean = normalizeBearerToken(tokenStr);
  if (!clean) return null;

  try {
    const parts = clean.split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT was issued by Authentik OIDC (not ThingsBoard native).
 */
export function isAuthentikOidcToken(tokenStr?: string | null): boolean {
  const payload = decodeJwtPayload(tokenStr);
  if (!payload) return false;
  const iss = typeof payload.iss === 'string' ? payload.iss.toLowerCase() : '';
  if (iss.includes('auth.humid1.com') || iss.includes('authentik') || iss.includes('/application/o/')) {
    return true;
  }
  const aud = typeof payload.aud === 'string' ? payload.aud : Array.isArray(payload.aud) ? payload.aud.join(' ') : '';
  if (aud.includes('humid1-dash') || aud.includes('7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI')) {
    return true;
  }
  return false;
}

/**
 * Checks if a JWT is a valid ThingsBoard session token (not an external Authentik OIDC token).
 */
export function isThingsBoardToken(tokenStr?: string | null): boolean {
  const clean = normalizeBearerToken(tokenStr);
  if (!clean || !clean.includes('.')) return false;
  if (isAuthentikOidcToken(clean)) return false;

  const payload = decodeJwtPayload(clean);
  if (!payload) return false;

  // Thingsboard JWTs contain scopes (e.g. ['CUSTOMER_USER'], ['TENANT_ADMIN']), userId, or tenantId
  if (
    Array.isArray(payload.scopes) &&
    payload.scopes.some((s) => typeof s === 'string' && (s.includes('USER') || s.includes('ADMIN')))
  ) {
    return true;
  }
  if (payload.userId || payload.tenantId || payload.customerId) {
    return true;
  }
  // Any valid non-Authentik JWT
  return Boolean(payload.sub);
}

/**
 * Checks if a JWT is expired (or close to expiring within bufferSeconds).
 */
export function isJwtExpired(tokenStr?: string | null, bufferSeconds = 30): boolean {
  const payload = decodeJwtPayload(tokenStr);
  if (!payload || typeof payload.exp !== 'number') {
    return false; // If no exp claim, cannot determine expiry
  }
  const expMs = payload.exp * 1000;
  return Date.now() + bufferSeconds * 1000 >= expMs;
}

/**
 * Scans window.location search and hash for auth and refresh tokens
 */
export function extractTokensFromUrl(): { token: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null };
  }

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const rawToken =
      urlParams.get('token') ||
      urlParams.get('accessToken') ||
      urlParams.get('jwtToken') ||
      urlParams.get('access_token') ||
      urlParams.get('jwt') ||
      urlParams.get('id_token') ||
      urlParams.get('auth_token') ||
      urlParams.get('bearer_token') ||
      hashParams.get('token') ||
      hashParams.get('accessToken') ||
      hashParams.get('access_token') ||
      hashParams.get('id_token') ||
      hashParams.get('auth_token');

    const rawRefreshToken =
      urlParams.get('refreshToken') ||
      urlParams.get('refresh_token') ||
      hashParams.get('refreshToken') ||
      hashParams.get('refresh_token');

    return {
      token: normalizeBearerToken(rawToken),
      refreshToken: normalizeBearerToken(rawRefreshToken),
    };
  } catch {
    return { token: null, refreshToken: null };
  }
}

/**
 * Cleans the URL search and hash if auth tokens were detected,
 * without triggering a page reload.
 */
export function cleanUrlAfterAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let changed = false;

    const authKeys = [
      'token',
      'accessToken',
      'jwtToken',
      'access_token',
      'jwt',
      'id_token',
      'auth_token',
      'bearer_token',
      'refreshToken',
      'refresh_token',
    ];

    for (const key of authKeys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }

    if (url.hash) {
      for (const key of authKeys) {
        if (url.hash.includes(key)) {
          url.hash = '';
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      window.history.replaceState({}, document.title, url.toString());
    }
  } catch {
    // ignore
  }
}

/**
 * Configures the @enerlab/thingsboard-client singleton with:
 * - setupAuth(client, { mode: 'bearer', token })
 * - client.setConfig({ auth: token, headers: { 'X-Authorization': 'Bearer ...', 'Authorization': 'Bearer ...' } })
 * Fully adheres to both client auth interfaces and ThingsBoard REST expectations.
 */
export function applyThingsBoardClientAuth(
  targetClient: typeof client,
  token: string | null | undefined,
  baseUrl?: string
): void {
  const cleanToken = normalizeBearerToken(token);
  const bearerValue = cleanToken ? `Bearer ${cleanToken}` : null;

  if (baseUrl) {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    targetClient.setConfig({ baseUrl: cleanBaseUrl });
  }

  if (cleanToken && bearerValue) {
    // 1. Setup auth on client using @enerlab/thingsboard-client built-in mechanism
    setupAuth(targetClient, { mode: 'bearer', token: cleanToken });

    // 2. Also pass auth to client config (for backward-compatibility with client.getConfig().auth)
    // and explicitly populate both X-Authorization and Authorization headers
    targetClient.setConfig({
      auth: cleanToken,
      headers: {
        'X-Authorization': bearerValue,
        Authorization: bearerValue,
      },
    });
  } else {
    try {
      logout({ client: targetClient as any });
    } catch {
      // ignore
    }
    setupAuth(targetClient, undefined as any);
    targetClient.setConfig({
      auth: undefined,
      headers: {
        'X-Authorization': null as any,
        Authorization: null as any,
      },
    });
  }
}

/**
 * Executes a silent token refresh against ThingsBoard REST endpoints.
 * Handles both POST /api/auth/token and POST /api/auth/token/refresh.
 */
export async function performSilentTokenRefresh(
  serverUrl: string,
  refreshTokenStr: string
): Promise<{ token: string; refreshToken: string } | null> {
  const cleanRefresh = normalizeBearerToken(refreshTokenStr);
  if (!cleanRefresh) return null;

  const base = serverUrl.replace(/\/+$/, '');

  // 1. First attempt: SDK postApiAuthToken
  try {
    const res = await postApiAuthToken({
      body: { refreshToken: cleanRefresh },
    });
    if (res && res.data && typeof (res.data as any).token === 'string') {
      const data = res.data as any;
      return {
        token: normalizeBearerToken(data.token)!,
        refreshToken: normalizeBearerToken(data.refreshToken) || cleanRefresh,
      };
    }
  } catch {
    // Continue to direct REST endpoints
  }

  // 2. Second attempt: Direct fetch to /api/auth/token (standard ThingsBoard CE)
  try {
    const res = await fetch(`${base}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken: cleanRefresh }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.token === 'string') {
        return {
          token: normalizeBearerToken(data.token)!,
          refreshToken: normalizeBearerToken(data.refreshToken) || cleanRefresh,
        };
      }
    }
  } catch {
    // Continue
  }

  // 3. Third attempt: /api/auth/token/refresh (ThingsBoard PE / reverse-proxy convention)
  try {
    const res = await fetch(`${base}/api/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken: cleanRefresh }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.token === 'string') {
        return {
          token: normalizeBearerToken(data.token)!,
          refreshToken: normalizeBearerToken(data.refreshToken) || cleanRefresh,
        };
      }
    }
  } catch {
    // Continue
  }

  return null;
}
