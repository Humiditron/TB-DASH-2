import { client } from '@enerlab/thingsboard-client';
import { normalizeBearerToken, isJwtExpired, performSilentTokenRefresh } from '../utils/authTokens';
import { apiLogger } from './apiLogger';

let interceptorsInstalled = false;
let getTokenFn: (() => string | null) = () => null;
let getRefreshTokenFn: (() => string | null) = () => null;
let getServerUrlFn: (() => string) = () => 'https://app.humid1.com';
let onTokenRefreshedFn: ((token: string, refreshToken?: string) => void) | null = null;
let isRefreshing = false;

interface GlobalInterceptorOptions {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  getServerUrl: () => string;
  onTokenRefreshed?: (newToken: string, newRefreshToken?: string) => void;
}

export function registerGlobalClientInterceptors(options: GlobalInterceptorOptions): void {
  getTokenFn = options.getToken;
  getRefreshTokenFn = options.getRefreshToken;
  getServerUrlFn = options.getServerUrl;
  if (options.onTokenRefreshed) {
    onTokenRefreshedFn = options.onTokenRefreshed;
  }

  if (interceptorsInstalled) {
    return;
  }

  interceptorsInstalled = true;

  // Global Request Interceptor
  client.interceptors.request.use(async (request, options) => {
    let cleanToken = normalizeBearerToken(getTokenFn());

    // Proactive refresh if token is within 15 seconds of expiration
    if (cleanToken && isJwtExpired(cleanToken, 15) && !isRefreshing) {
      const refreshTok = normalizeBearerToken(getRefreshTokenFn());
      if (refreshTok) {
        try {
          isRefreshing = true;
          const refreshed = await performSilentTokenRefresh(getServerUrlFn(), refreshTok);
          if (refreshed) {
            cleanToken = refreshed.token;
            if (onTokenRefreshedFn) {
              onTokenRefreshedFn(refreshed.token, refreshed.refreshToken);
            }
          }
        } catch (err) {
          console.warn('[ThingsBoard Interceptor] Proactive token refresh failed:', err);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Attach both X-Authorization and Authorization headers
    if (cleanToken) {
      const bearerValue = `Bearer ${cleanToken}`;
      request.headers.set('X-Authorization', bearerValue);
      request.headers.set('Authorization', bearerValue);
    }

    const txId = 'tx-' + Math.random().toString(36).substring(2, 9);
    (request as any).__txId = txId;

    const authHeader = request.headers.get('X-Authorization') || request.headers.get('Authorization') || undefined;

    let parsedBody: any = options?.body;
    if (!parsedBody && request.body) {
      try {
        parsedBody = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      } catch {
        parsedBody = request.body;
      }
    }

    apiLogger.logRequest(txId, request.method || 'GET', request.url || '', parsedBody, authHeader);
    return request;
  });

  // Global Response Interceptor
  client.interceptors.response.use(async (response, request) => {
    const txId = (request as any)?.__txId;
    let responseBody: any = undefined;

    try {
      const clone = response.clone();
      const text = await clone.text();
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
    } catch {
      responseBody = response.body;
    }

    if (txId) {
      apiLogger.logResponse(txId, response.status, responseBody);
    }

    // Reactive refresh on 401 Unauthorized
    if (response.status === 401 && !isRefreshing) {
      const refreshTok = normalizeBearerToken(getRefreshTokenFn());
      if (refreshTok) {
        try {
          isRefreshing = true;
          console.warn('[ThingsBoard Interceptor] Received 401. Triggering reactive silent token refresh...');
          const refreshed = await performSilentTokenRefresh(getServerUrlFn(), refreshTok);
          if (refreshed && onTokenRefreshedFn) {
            console.info('[ThingsBoard Interceptor] Silent token refresh succeeded.');
            onTokenRefreshedFn(refreshed.token, refreshed.refreshToken);
          }
        } catch (err) {
          console.error('[ThingsBoard Interceptor] Reactive silent token refresh failed:', err);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return response;
  });
}
