/**
 * Safe runtime environment variable reader.
 * Prioritizes:
 * 1. Runtime-injected variables from window.__ENV__ (populated by Docker / compose entrypoint)
 * 2. Vite build-time import.meta.env
 * 3. Default fallback values
 */

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

export function getEnv(key: string, defaultValue: string = ''): string {
  if (typeof window !== 'undefined' && window.__ENV__) {
    const runtimeVal = window.__ENV__[key];
    if (runtimeVal !== undefined && runtimeVal !== null && String(runtimeVal).trim() !== '') {
      return String(runtimeVal).trim();
    }
  }

  // Fallback to Vite build-time environment variable
  try {
    const viteVal = (import.meta.env as any)?.[key];
    if (viteVal !== undefined && viteVal !== null && String(viteVal).trim() !== '') {
      return String(viteVal).trim();
    }
  } catch {
    // ignore
  }

  return defaultValue;
}
