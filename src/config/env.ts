import { getEnv } from '../utils/env';

/**
 * HUMID1 Stack Environment & Domain Aggregator
 * Supports runtime hotloading via window.__HUMID1_CONFIG__ and window.__ENV__ (Docker container env injection)
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
  thingsboardOAuthProviderPath?: string;
  defaultDeviceName: string;
  isSimulatedDefault: boolean;
  version: string;
}

export const APP_CONFIG: Humid1Config = {
  domains: {
    dashboardUrl: getEnv('VITE_DASHBOARD_URL', 'https://dash.humid1.com').replace(/\/+$/, ''),
    thingsboardUrl: getEnv('VITE_THINGSBOARD_SERVER_URL', 'https://app.humid1.com').replace(/\/+$/, ''),
    authentikUrl: getEnv('VITE_AUTHENTIK_URL', 'https://auth.humid1.com').replace(/\/+$/, ''),
    captchaUrl: getEnv('VITE_CAPTCHA_URL', 'https://cap.humid1.com').replace(/\/+$/, ''),
    chatUrl: getEnv('VITE_CHAT_URL', 'https://chat.humid1.com').replace(/\/+$/, ''),
  },
  authentikSlug: getEnv('VITE_AUTHENTIK_APP_SLUG', getEnv('VITE_AUTHENTIK_SLUG', 'humid1-dash')),
  authentikClientId: getEnv('VITE_AUTHENTIK_CLIENT_ID', '7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI'),
  ssoAuthorizationEndpoint: getEnv(
    'VITE_SSO_AUTH_ENDPOINT',
    'https://app.humid1.com/oauth2/authorization/1efd3960-a10b-11f1-b530-9b9631e0c365'
  ),
  thingsboardOAuthProviderPath: '/oauth2/authorization/1efd3960-a10b-11f1-b530-9b9631e0c365',
  defaultDeviceName: getEnv('VITE_DEFAULT_DEVICE_NAME', 'HUMID1-CABINET-01'),
  isSimulatedDefault: false,
  version: '1.2.0-beta',
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
export function getThingsBoardOAuth2Url(
  serverUrl?: string,
  customReturnUrl?: string,
  customProviderPath?: string
): string {
  // Determine base dynamically: default to active origin in browser (for reverse proxy),
  // or fall back to the configured ThingsBoard URL.
  let base = '';
  if (typeof window !== 'undefined') {
    base = window.location.origin;
  } else {
    base = (serverUrl || APP_CONFIG.domains.thingsboardUrl).replace(/\/+$/, '');
  }

  const providerPath = customProviderPath || APP_CONFIG.thingsboardOAuthProviderPath || '/oauth2/authorization/1efd3960-a10b-11f1-b530-9b9631e0c365';
  const cleanPath = providerPath.startsWith('/') ? providerPath : `/${providerPath}`;
  
  // Because of the strict security validation introduced in ThingsBoard Commit 1655cf9:
  // 1. prevURI MUST be a relative path (e.g., '/') to prevent open-redirect rejections.
  // 2. We trigger this on our proxied domain so ThingsBoard natively uses it as the baseUrl and redirects back to us.
  const relativePrevUri = '/';
  
  return `${base}${cleanPath}?prevURI=${encodeURIComponent(relativePrevUri)}`;
}
