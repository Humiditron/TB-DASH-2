/**
 * Safely extracts the host/domain name from any URL or domain string.
 * Handles inputs with or without protocol (e.g. 'app.humid1.com', 'https://app.humid1.com').
 */
export function getSafeHost(rawUrl: string | undefined | null, fallback: string = ''): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.host || parsed.hostname || fallback;
  } catch {
    // Fallback: strip potential protocol and paths manually
    const cleaned = trimmed.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].split('#')[0];
    return cleaned || fallback;
  }
}

/**
 * Normalizes a URL string by ensuring it has a valid HTTP/HTTPS protocol
 * and removing any trailing slashes.
 */
export function normalizeUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')
    ? `http://${trimmed}`
    : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, '');
}
