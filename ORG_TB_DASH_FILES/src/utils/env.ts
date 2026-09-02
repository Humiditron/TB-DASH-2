/**
 * Safe runtime environment variable reader.
 * Prioritizes runtime-injected variables from window.__ENV__ (populated by Docker / compose entrypoint)
 * and falls back to Vite build-time import.meta.env.
 */

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

export function getEnv(key: string, defaultValue: string = ''): string {
  if (typeof window !== 'undefined' && window.__ENV__) {
    const runtimeVal = window.__ENV__[key];
    if (runtimeVal !== undefined && runtimeVal !== null && runtimeVal !== '') {
      return String(runtimeVal).trim();
    }
  }

  // Fallback to Vite build-time environment variable
  try {
    const viteVal = (import.meta.env as any)?.[key];
    if (viteVal !== undefined && viteVal !== null && viteVal !== '') {
      return String(viteVal).trim();
    }
  } catch {
    // ignore
  }

  return defaultValue;
}
