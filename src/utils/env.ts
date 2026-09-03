/**
 * Safe runtime environment variable reader.
 * Prioritizes:
 * 1. Runtime-injected variables from window.__ENV__ (populated by Docker entrypoint)
 * 2. Runtime-injected variables from window.__HUMID1_CONFIG__
 * 3. Vite build-time import.meta.env
 * 4. Default fallback values
 */

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
    __HUMID1_CONFIG__?: Record<string, any>;
  }
}

/**
 * Normalizes a lookup key to search for both standard and VITE_ prefixed variants.
 */
function getLookupKeys(key: string): string[] {
  const keys = [key];
  if (key.startsWith('VITE_')) {
    keys.push(key.replace(/^VITE_/, ''));
  } else {
    keys.push(`VITE_${key}`);
  }
  // Add common aliases
  if (key.includes('THINGSBOARD_SERVER_URL') || key.includes('THINGSBOARD_URL')) {
    keys.push('THINGSBOARD_SERVER_URL', 'THINGSBOARD_URL', 'VITE_THINGSBOARD_SERVER_URL', 'VITE_THINGSBOARD_URL');
  }
  if (key.includes('AUTHENTIK_SLUG') || key.includes('AUTHENTIK_APP_SLUG')) {
    keys.push('AUTHENTIK_SLUG', 'AUTHENTIK_APP_SLUG', 'VITE_AUTHENTIK_SLUG', 'VITE_AUTHENTIK_APP_SLUG');
  }
  return Array.from(new Set(keys));
}

export function getEnv(key: string, defaultValue: string = ''): string {
  const candidateKeys = getLookupKeys(key);

  // 1. Check window.__ENV__
  if (typeof window !== 'undefined' && window.__ENV__) {
    for (const k of candidateKeys) {
      const val = window.__ENV__[k];
      if (val !== undefined && val !== null && String(val).trim() !== '' && !String(val).startsWith('__')) {
        return String(val).trim();
      }
    }
  }

  // 2. Check window.__HUMID1_CONFIG__
  if (typeof window !== 'undefined' && window.__HUMID1_CONFIG__) {
    for (const k of candidateKeys) {
      const val = window.__HUMID1_CONFIG__[k];
      if (val !== undefined && val !== null && String(val).trim() !== '' && !String(val).startsWith('__')) {
        return String(val).trim();
      }
    }
  }

  // 3. Fallback to Vite build-time environment variable
  try {
    const metaEnv = import.meta.env as any;
    if (metaEnv) {
      for (const k of candidateKeys) {
        const viteVal = metaEnv[k];
        if (viteVal !== undefined && viteVal !== null && String(viteVal).trim() !== '' && !String(viteVal).startsWith('__')) {
          return String(viteVal).trim();
        }
      }
    }
  } catch {
    // ignore
  }

  return defaultValue;
}

