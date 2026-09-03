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
    listener([...this.transactions]);
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

  public logRequest(id: string, method: string, url: string, requestPayload?: any): void {
    const tx: ApiTransaction = {
      id,
      timestamp: Date.now(),
      method: method.toUpperCase(),
      url,
      requestPayload,
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
}

export const apiLogger = new ApiLoggerService();
