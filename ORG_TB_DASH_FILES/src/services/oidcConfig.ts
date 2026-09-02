import { AuthProviderProps } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import { normalizeUrl } from '../utils/url';
import { getEnv } from '../utils/env';

const rawAuthentikUrl = getEnv('VITE_AUTHENTIK_URL', '');
const authentikUrl = normalizeUrl(rawAuthentikUrl);
const appSlug = getEnv('VITE_AUTHENTIK_APP_SLUG', 'humid1-dash');
const clientId = getEnv('VITE_AUTHENTIK_CLIENT_ID', '') || appSlug || 'humid1-dash';
const redirectUri =
  getEnv('VITE_APP_REDIRECT_URI', '') ||
  (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '/');

export const oidcConfig: AuthProviderProps = {
  authority: authentikUrl ? `${authentikUrl}/application/o/${appSlug}/` : '',
  client_id: clientId,
  redirect_uri: redirectUri,
  post_logout_redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid profile email',
  // Dynamic OIDC metadata derived strictly from environment variables
  metadata: authentikUrl
    ? {
        issuer: `${authentikUrl}/application/o/${appSlug}/`,
        authorization_endpoint: `${authentikUrl}/application/o/authorize/`,
        token_endpoint: `${authentikUrl}/application/o/token/`,
        userinfo_endpoint: `${authentikUrl}/application/o/userinfo/`,
        end_session_endpoint: `${authentikUrl}/application/o/${appSlug}/end-session/`,
        jwks_uri: `${authentikUrl}/application/o/${appSlug}/jwks/`,
      }
    : undefined,
  userStore: typeof window !== 'undefined' ? new WebStorageStateStore({ store: window.sessionStorage }) : undefined,
  automaticSilentRenew: false,
  onSigninCallback: () => {
    // Clean up authentication URL query and hash parameters after sign-in
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
