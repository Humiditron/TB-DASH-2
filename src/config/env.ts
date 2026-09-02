/**
 * HUMID1 Stack Environment & Domain Aggregator
 * Supports runtime hotloading via window.__HUMID1_CONFIG__ (Docker container env injection)
 * with graceful fallback to Vite build-time env vars and production domain defaults.
 */

export interface Humid1DomainMap {
  dashboardUrl: string;   // dash.humid1.com
  thingsboardUrl: string; // app.humid1.com (port 8080)
  authentikUrl: string;   // auth.humid1.com (port 9000)
  captchaUrl: string;     // cap.humid1.com (port 3000)
  chatUrl: string;        // chat.humid1.com (port 4000)
}

export interface Humid1Config {
  domains: Humid1DomainMap;
  authentikSlug: string;  // e.g. "humid1-dash"
  authentikClientId: string; // Authentik OAuth2 Provider Client ID
  ssoAuthorizationEndpoint: string;
  defaultDeviceName: string;
  isSimulatedDefault: boolean;
  version: string;
}

declare global {
  interface Window {
    __HUMID1_CONFIG__?: Partial<Humid1DomainMap> & {
      THINGSBOARD_SERVER_URL?: string;
      AUTHENTIK_URL?: string;
      AUTHENTIK_SLUG?: string;
      AUTHENTIK_CLIENT_ID?: string;
      CAPTCHA_URL?: string;
      CHAT_URL?: string;
      DASHBOARD_URL?: string;
      SSO_AUTH_ENDPOINT?: string;
    };
  }
}

function resolveEnv(key: string, viteFallback: string, hardcodedDefault: string): string {
  if (typeof window !== 'undefined' && window.__HUMID1_CONFIG__) {
    const runtimeVal = (window.__HUMID1_CONFIG__ as any)[key];
    if (runtimeVal && typeof runtimeVal === 'string' && !runtimeVal.startsWith('__')) {
      return runtimeVal.replace(/\/+$/, '');
    }
  }
  if (viteFallback && !viteFallback.startsWith('__')) {
    return viteFallback.replace(/\/+$/, '');
  }
  return hardcodedDefault.replace(/\/+$/, '');
}

export const APP_CONFIG: Humid1Config = {
  domains: {
    dashboardUrl: resolveEnv(
      'DASHBOARD_URL',
      import.meta.env.VITE_DASHBOARD_URL || '',
      'https://dash.humid1.com'
    ),
    thingsboardUrl: resolveEnv(
      'THINGSBOARD_SERVER_URL',
      import.meta.env.VITE_THINGSBOARD_SERVER_URL || '',
      'https://app.humid1.com'
    ),
    authentikUrl: resolveEnv(
      'AUTHENTIK_URL',
      import.meta.env.VITE_AUTHENTIK_URL || '',
      'https://auth.humid1.com'
    ),
    captchaUrl: resolveEnv(
      'CAPTCHA_URL',
      import.meta.env.VITE_CAPTCHA_URL || '',
      'https://cap.humid1.com'
    ),
    chatUrl: resolveEnv(
      'CHAT_URL',
      import.meta.env.VITE_CHAT_URL || '',
      'https://chat.humid1.com'
    ),
  },
  authentikSlug: resolveEnv(
    'AUTHENTIK_SLUG',
    import.meta.env.VITE_AUTHENTIK_SLUG || '',
    'humid1-dash'
  ),
  authentikClientId: resolveEnv(
    'AUTHENTIK_CLIENT_ID',
    import.meta.env.VITE_AUTHENTIK_CLIENT_ID || '',
    '7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI'
  ),
  ssoAuthorizationEndpoint: resolveEnv(
    'SSO_AUTH_ENDPOINT',
    import.meta.env.VITE_SSO_AUTH_ENDPOINT || '',
    'https://app.humid1.com/oauth2/authorization/authentik'
  ),
  defaultDeviceName: import.meta.env.VITE_DEFAULT_DEVICE_NAME || 'HUMID1-CABINET-01',
  isSimulatedDefault: false,
  version: '1.2.0',
};

const STORAGE_KEY_AUTHENTIK_SLUG = 'humid1_authentik_slug';

export function getAuthentikSlug(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_AUTHENTIK_SLUG);
    if (saved && saved.trim()) {
      const val = saved.trim();
      // Auto-migrate from previous test slug "web-dash"
      if (val === 'web-dash') {
        localStorage.setItem(STORAGE_KEY_AUTHENTIK_SLUG, 'humid1-dash');
        return 'humid1-dash';
      }
      return val;
    }
  }
  return APP_CONFIG.authentikSlug || 'humid1-dash';
}

export function setAuthentikSlug(slug: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_AUTHENTIK_SLUG, slug.trim());
  }
}

/**
 * Returns the current app's origin and path for SSO redirect callback
 */
export function getCurrentReturnUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin + window.location.pathname;
  }
  return APP_CONFIG.domains.dashboardUrl;
}

/**
 * Generates the direct Authentik Application launch URL for the humid1-dash provider slug
 * with ?next parameter returning to the current dashboard.
 */
export function getAuthentikAppLoginUrl(customSlug?: string, customReturnUrl?: string): string {
  const slug = customSlug || getAuthentikSlug();
  const returnUrl = customReturnUrl || getCurrentReturnUrl();
  const base = APP_CONFIG.domains.authentikUrl;
  return `${base}/application/o/${encodeURIComponent(slug)}/?next=${encodeURIComponent(returnUrl)}`;
}

/**
 * Generates the Authentik OIDC OAuth2 Authorize URL
 */
export function getAuthentikOidcAuthorizeUrl(customClientId?: string, customReturnUrl?: string): string {
  const clientId = customClientId || APP_CONFIG.authentikClientId || getAuthentikSlug();
  const returnUrl = customReturnUrl || getCurrentReturnUrl();
  const base = APP_CONFIG.domains.authentikUrl;
  return `${base}/application/o/authorize/?client_id=${encodeURIComponent(clientId)}&response_type=token%20id_token&redirect_uri=${encodeURIComponent(returnUrl)}&scope=openid%20profile%20email&nonce=${Date.now()}`;
}

/**
 * Generates ThingsBoard OAuth2 Gateway authorization URL with return redirects attached
 */
export function getThingsBoardOAuth2Url(serverUrl?: string, customReturnUrl?: string): string {
  const base = (serverUrl || APP_CONFIG.domains.thingsboardUrl).replace(/\/+$/, '');
  const returnUrl = customReturnUrl || getCurrentReturnUrl();
  return `${base}/oauth2/authorization/authentik?redirect_uri=${encodeURIComponent(returnUrl)}&prevURI=${encodeURIComponent(returnUrl)}&returnUrl=${encodeURIComponent(returnUrl)}`;
}
