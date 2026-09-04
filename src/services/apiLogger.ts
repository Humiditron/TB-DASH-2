import { ApiTransaction } from '../types';

const STORAGE_KEY = 'humid1_api_transaction_logs';
const MAX_LOGS = 100;

class ApiLoggerService {
  private transactions: ApiTransaction[] = [];
  private listeners: Array<(transactions: ApiTransaction[]) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.transactions = JSON.parse(stored);
      }
    } catch {
      this.transactions = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.transactions.slice(0, MAX_LOGS)));
    } catch {
      // ignore
    }
  }

  public getTransactions(): ApiTransaction[] {
    return [...this.transactions];
  }

  public subscribe(listener: (transactions: ApiTransaction[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const list = [...this.transactions];
    for (const l of this.listeners) {
      try {
        l(list);
      } catch {
        // ignore
      }
    }
  }

  public logRequest(
    id: string,
    method: string,
    url: string,
    requestPayload?: any,
    authHeader?: string
  ): void {
    const tx: ApiTransaction = {
      id,
      timestamp: Date.now(),
      method: method.toUpperCase(),
      url,
      requestPayload,
      authHeader: authHeader
        ? authHeader.length > 32
          ? `${authHeader.substring(0, 16)}...${authHeader.substring(authHeader.length - 8)}`
          : authHeader
        : undefined,
      hasToken: Boolean(authHeader && authHeader.trim().length > 0),
    };
    this.transactions = [tx, ...this.transactions].slice(0, MAX_LOGS);
    this.saveToStorage();
    this.notify();
  }

  public logResponse(id: string, responseStatus: number, responsePayload?: any, error?: string): void {
    const index = this.transactions.findIndex((t) => t.id === id);
    if (index !== -1) {
      const tx = this.transactions[index];
      const durationMs = Date.now() - tx.timestamp;
      this.transactions[index] = {
        ...tx,
        responseStatus,
        responsePayload,
        durationMs,
        error,
      };
    } else {
      // Fallback if request log wasn't found
      const tx: ApiTransaction = {
        id,
        timestamp: Date.now(),
        method: 'UNKNOWN',
        url: id,
        responseStatus,
        responsePayload,
        durationMs: 0,
        error,
      };
      this.transactions = [tx, ...this.transactions].slice(0, MAX_LOGS);
    }
    this.saveToStorage();
    this.notify();
  }

  public clearLogs(): void {
    this.transactions = [];
    this.saveToStorage();
    this.notify();
  }

  /**
   * Probes the ThingsBoard /api/auth/user endpoint with a specified token
   * and records the complete HTTP transaction in the logger.
   */
  public async testTokenDirect(
    serverUrl: string,
    token: string
  ): Promise<{ success: boolean; status: number; data?: any; error?: string }> {
    const txId = 'test-' + Math.random().toString(36).substring(2, 9);
    const cleanBase = serverUrl.replace(/\/+$/, '');
    const url = `${cleanBase}/api/auth/user`;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

    this.logRequest(txId, 'GET', url, undefined, `Bearer ${cleanToken.substring(0, 16)}...`);

    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Authorization': `Bearer ${cleanToken}`,
          Authorization: `Bearer ${cleanToken}`,
        },
      });

      let data: any;
      try {
        data = await resp.json();
      } catch {
        data = await resp.text();
      }

      if (resp.ok) {
        this.logResponse(txId, resp.status, data);
        return { success: true, status: resp.status, data };
      } else {
        const errMsg = typeof data === 'object' && data?.message ? data.message : `HTTP ${resp.status} ${resp.statusText}`;
        this.logResponse(txId, resp.status, data, errMsg);
        return { success: false, status: resp.status, data, error: errMsg };
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Network request failed';
      this.logResponse(txId, 0, undefined, errMsg);
      return { success: false, status: 0, error: errMsg };
    }
  }

  /**
   * Probes the ThingsBoard /api/auth/login endpoint and records the complete HTTP transaction.
   */
  public async testLoginDirect(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; status: number; data?: any; error?: string }> {
    const txId = 'login-' + Math.random().toString(36).substring(2, 9);
    const cleanBase = serverUrl.replace(/\/+$/, '');
    const url = `${cleanBase}/api/auth/login`;

    this.logRequest(txId, 'POST', url, { username, password: '•••' }, undefined);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      let data: any;
      try {
        data = await resp.json();
      } catch {
        data = await resp.text();
      }

      if (resp.ok) {
        this.logResponse(txId, resp.status, {
          token: data?.token ? `${data.token.substring(0, 16)}...` : undefined,
          refreshToken: data?.refreshToken ? `${data.refreshToken.substring(0, 16)}...` : undefined,
        });
        return { success: true, status: resp.status, data };
      } else {
        const errMsg = typeof data === 'object' && data?.message ? data.message : `HTTP ${resp.status} ${resp.statusText}`;
        this.logResponse(txId, resp.status, data, errMsg);
        return { success: false, status: resp.status, data, error: errMsg };
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Network request failed';
      this.logResponse(txId, 0, undefined, errMsg);
      return { success: false, status: 0, error: errMsg };
    }
  }
}

export const apiLogger = new ApiLoggerService();
