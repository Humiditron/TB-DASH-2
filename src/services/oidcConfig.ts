import { AuthProviderProps } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import { normalizeUrl } from '../utils/url';
import { getEnv } from '../utils/env';

export const DEFAULT_AUTHENTIK_URL = 'https://auth.humid1.com';
export const DEFAULT_APP_SLUG = 'humid1-dash';
export const DEFAULT_CLIENT_ID = '7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI';

export function getResolvedOidcParams() {
  let savedConfig: any = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('humid1_thingsboard_config');
      if (raw) savedConfig = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  const rawAuthentikUrl =
    savedConfig.authentikUrl ||
    getEnv('VITE_AUTHENTIK_URL', DEFAULT_AUTHENTIK_URL) ||
    DEFAULT_AUTHENTIK_URL;
  const authentikUrl = normalizeUrl(rawAuthentikUrl);

  const appSlug =
    savedConfig.authentikAppSlug ||
    getEnv('VITE_AUTHENTIK_APP_SLUG', DEFAULT_APP_SLUG) ||
    DEFAULT_APP_SLUG;

  const clientId =
    savedConfig.authentikClientId ||
    getEnv('VITE_AUTHENTIK_CLIENT_ID', DEFAULT_CLIENT_ID) ||
    DEFAULT_CLIENT_ID;

  const redirectUri =
    savedConfig.redirectUri ||
    getEnv('VITE_APP_REDIRECT_URI', '') ||
    (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '/');

  return {
    authentikUrl,
    appSlug,
    clientId,
    redirectUri,
  };
}

const params = getResolvedOidcParams();

export const oidcConfig: AuthProviderProps = {
  authority: `${params.authentikUrl}/application/o/${params.appSlug}/`,
  client_id: params.clientId,
  redirect_uri: params.redirectUri,
  post_logout_redirect_uri: params.redirectUri,
  response_type: 'code',
  scope: 'openid profile email',
  metadata: {
    issuer: `${params.authentikUrl}/application/o/${params.appSlug}/`,
    authorization_endpoint: `${params.authentikUrl}/application/o/authorize/`,
    token_endpoint: `${params.authentikUrl}/application/o/token/`,
    userinfo_endpoint: `${params.authentikUrl}/application/o/userinfo/`,
    end_session_endpoint: `${params.authentikUrl}/application/o/${params.appSlug}/end-session/`,
    jwks_uri: `${params.authentikUrl}/application/o/${params.appSlug}/jwks/`,
  },
  userStore: typeof window !== 'undefined' ? new WebStorageStateStore({ store: window.sessionStorage }) : undefined,
  automaticSilentRenew: false,
  onSigninCallback: () => {
    // Clean up authentication URL query and hash parameters after sign-in
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },
};
