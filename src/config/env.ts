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
  ssoAuthorizationEndpoint: resolveEnv(
    'SSO_AUTH_ENDPOINT',
    import.meta.env.VITE_SSO_AUTH_ENDPOINT || '',
    'https://app.humid1.com/oauth2/authorization/authentik'
  ),
  defaultDeviceName: import.meta.env.VITE_DEFAULT_DEVICE_NAME || 'HUMID1-CABINET-01',
  isSimulatedDefault: false,
  version: '1.2.0',
};
