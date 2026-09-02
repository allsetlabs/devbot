/**
 * Personal Finance API client — talks to the DevBot backend.
 *
 * Uses the app's BACKEND_URL + authHeaders for correct resolution across
 * web, mobile (Capacitor), and desktop (Electron).
 */

import type {
  TransactionRecord,
  InvestmentRecord,
  GoldRecord,
  DashboardData,
  GoldSummary,
} from './types';
import { BACKEND_URL, authHeaders } from '@devbot/app/lib/api';

const BASE = '/api/plugins/personal-finance';

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchFinance<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Query-string builder
// ---------------------------------------------------------------------------

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const financeApi = {
  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  /** Get aggregated dashboard data. */
  dashboard: (): Promise<DashboardData> => fetchFinance('/dashboard'),

  // -------------------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------------------

  /** List transactions with optional filters. */
  listTransactions: (params?: {
    search?: string;
    sort?: string;
    order?: string;
    type?: string;
    category?: string;
  }): Promise<TransactionRecord[]> =>
    fetchFinance(`/transactions${buildQuery(params)}`),

  /** Get a single transaction. */
  getTransaction: (id: string): Promise<TransactionRecord> =>
    fetchFinance(`/transactions/${id}`),

  /** Create a new transaction. */
  createTransaction: (data: Partial<TransactionRecord>): Promise<TransactionRecord> =>
    fetchFinance('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a transaction. */
  updateTransaction: (id: string, data: Partial<TransactionRecord>): Promise<TransactionRecord> =>
    fetchFinance(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a transaction. */
  deleteTransaction: (id: string): Promise<void> =>
    fetchFinance(`/transactions/${id}`, { method: 'DELETE' }),

  /** Get transactions for a specific month. */
  monthlyTransactions: (year: number, month: number): Promise<TransactionRecord[]> =>
    fetchFinance(`/transactions/monthly/${year}/${month}`),

  // -------------------------------------------------------------------------
  // Investments
  // -------------------------------------------------------------------------

  /** List investments with optional filters. */
  listInvestments: (params?: {
    search?: string;
    sort?: string;
    order?: string;
  }): Promise<InvestmentRecord[]> =>
    fetchFinance(`/investments${buildQuery(params)}`),

  /** Get a single investment. */
  getInvestment: (id: string): Promise<InvestmentRecord> =>
    fetchFinance(`/investments/${id}`),

  /** Create a new investment. */
  createInvestment: (data: Partial<InvestmentRecord>): Promise<InvestmentRecord> =>
    fetchFinance('/investments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update an investment. */
  updateInvestment: (id: string, data: Partial<InvestmentRecord>): Promise<InvestmentRecord> =>
    fetchFinance(`/investments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete an investment. */
  deleteInvestment: (id: string): Promise<void> =>
    fetchFinance(`/investments/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Gold
  // -------------------------------------------------------------------------

  /** List gold items with optional filters. */
  listGold: (params?: {
    search?: string;
    sort?: string;
    order?: string;
  }): Promise<GoldRecord[]> =>
    fetchFinance(`/gold${buildQuery(params)}`),

  /** Get a single gold item. */
  getGoldItem: (id: string): Promise<GoldRecord> =>
    fetchFinance(`/gold/${id}`),

  /** Create a new gold item. */
  createGoldItem: (data: Partial<GoldRecord>): Promise<GoldRecord> =>
    fetchFinance('/gold', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a gold item. */
  updateGoldItem: (id: string, data: Partial<GoldRecord>): Promise<GoldRecord> =>
    fetchFinance(`/gold/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a gold item. */
  deleteGoldItem: (id: string): Promise<void> =>
    fetchFinance(`/gold/${id}`, { method: 'DELETE' }),

  /** Get gold portfolio summary. */
  goldSummary: (): Promise<GoldSummary> => fetchFinance('/gold/summary'),
};

/** Alias — pages import this name. */
export const personalFinanceApi = financeApi;
