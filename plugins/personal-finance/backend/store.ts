/**
 * Personal Finance Store — file-based backend for expense/income tracking,
 * investment portfolio, and gold holdings.
 *
 * Three FileStores: transactions, investments, gold.
 * Uses the FileStore + createFileStoreRouter framework for zero-boilerplate CRUD.
 */

import path from 'path';
import { Router } from 'express';
import { FileStore } from '../../../backend/src/lib/file-store.js';
import { createFileStoreRouter } from '../../../backend/src/lib/file-store-router.js';
import type { FileStoreRecord } from '../../../backend/src/lib/file-store.js';
import { DEVBOT_PROJECTS_DIR } from '../../../backend/src/lib/env.js';

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface TransactionRecord extends FileStoreRecord {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  paymentMethod: string;
  merchant: string;
  tags: string[];
  recurring: boolean;
  recurringInterval: '' | 'weekly' | 'monthly' | 'yearly';
  notes: string;
}

export interface InvestmentRecord extends FileStoreRecord {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'mutual_fund' | 'crypto' | 'bond' | 'other';
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  currency: string;
  account: string;
  lastUpdated: string;
  notes: string;
}

export interface GoldRecord extends FileStoreRecord {
  description: string;
  type: 'jewelry' | 'coin' | 'bar' | 'other';
  weightPavans: number;
  purity: '24k' | '22k' | '18k' | '14k';
  purchasePrice: number;
  purchaseDate: string;
  currency: string;
  location: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Store instances
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'file-stores');

export const transactionStore = new FileStore<TransactionRecord>({
  filePath: path.join(DATA_DIR, 'personal-finance-transactions.json'),
  name: 'personal-finance-transactions',
  autoCommit: false,
  commitPrefix: 'data',
});

export const investmentStore = new FileStore<InvestmentRecord>({
  filePath: path.join(DATA_DIR, 'personal-finance-investments.json'),
  name: 'personal-finance-investments',
  autoCommit: false,
  commitPrefix: 'data',
});

export const goldStore = new FileStore<GoldRecord>({
  filePath: path.join(DATA_DIR, 'personal-finance-gold.json'),
  name: 'personal-finance-gold',
  autoCommit: false,
  commitPrefix: 'data',
});

// ---------------------------------------------------------------------------
// CRUD routers
// ---------------------------------------------------------------------------

const transactionCrudRouter = createFileStoreRouter(transactionStore, {
  requiredFields: ['type', 'category', 'amount', 'description', 'date'],
  beforeCreate: (data) => ({
    ...data,
    currency: data.currency ?? 'USD',
    paymentMethod: data.paymentMethod ?? 'other',
    merchant: data.merchant ?? '',
    tags: data.tags ?? [],
    recurring: data.recurring ?? false,
    recurringInterval: data.recurringInterval ?? '',
    notes: data.notes ?? '',
  }),
});

const investmentCrudRouter = createFileStoreRouter(investmentStore, {
  requiredFields: ['symbol', 'name', 'type', 'quantity', 'avgCostBasis'],
  beforeCreate: (data) => ({
    ...data,
    currentPrice: data.currentPrice ?? data.avgCostBasis ?? 0,
    currency: data.currency ?? 'USD',
    account: data.account ?? 'Manual',
    lastUpdated: data.lastUpdated ?? new Date().toISOString(),
    notes: data.notes ?? '',
  }),
});

const goldCrudRouter = createFileStoreRouter(goldStore, {
  requiredFields: ['description', 'type', 'weightPavans', 'purchasePrice', 'purchaseDate'],
  beforeCreate: (data) => ({
    ...data,
    purity: data.purity ?? '22k',
    currency: data.currency ?? 'INR',
    location: data.location ?? '',
    notes: data.notes ?? '',
  }),
});

// ---------------------------------------------------------------------------
// Custom routes
// ---------------------------------------------------------------------------

function customRoutes(): Router {
  const router = Router();

  // ---- Dashboard summary ----
  router.get('/dashboard', async (req, res) => {
    try {
      const transactions = await transactionStore.list();
      const investments = await investmentStore.list();
      const goldHoldings = await goldStore.list();

      // Income / expense totals
      const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const netSavings = totalIncome - totalExpenses;

      // Monthly breakdown — last 12 months
      const now = new Date();
      const monthlyBreakdown: { month: string; income: number; expenses: number }[] = [];

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth(); // 0-indexed
        const label = `${year}-${String(month + 1).padStart(2, '0')}`;

        const monthTxns = transactions.filter((t) => {
          const td = new Date(t.date);
          return td.getFullYear() === year && td.getMonth() === month;
        });

        monthlyBreakdown.push({
          month: label,
          income: monthTxns
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0),
          expenses: monthTxns
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0),
        });
      }

      // Category breakdown (expenses only)
      const categoryMap: Record<string, number> = {};
      transactions
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
        });
      const categoryBreakdown = Object.entries(categoryMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      // Investments
      const investmentValue = investments.reduce(
        (sum, inv) => sum + inv.quantity * inv.currentPrice,
        0
      );
      const investmentCost = investments.reduce(
        (sum, inv) => sum + inv.quantity * inv.avgCostBasis,
        0
      );
      const investmentGainLoss = investmentValue - investmentCost;

      // Gold
      const goldTotalPavans = goldHoldings.reduce((sum, g) => sum + g.weightPavans, 0);
      const goldTotalGrams = goldTotalPavans * 8;

      // Gold estimated value: use query param goldPricePerOz or default $2300/oz
      // 1 troy oz = 31.1035 grams
      const goldPricePerOz = parseFloat(String(req.query.goldPricePerOz)) || 2300;
      const goldPricePerGram = goldPricePerOz / 31.1035;
      const goldEstimatedValue = goldTotalGrams * goldPricePerGram;

      const netWorth = netSavings + investmentValue + goldEstimatedValue;

      res.json({
        totalIncome,
        totalExpenses,
        netSavings,
        monthlyBreakdown,
        categoryBreakdown,
        investmentValue,
        investmentCost,
        investmentGainLoss,
        goldTotalPavans,
        goldTotalGrams,
        netWorth,
      });
    } catch (err) {
      res.status(500).json({ error: 'Dashboard failed', detail: String(err) });
    }
  });

  // ---- Transactions for a specific month ----
  router.get('/transactions/monthly/:year/:month', async (req, res) => {
    try {
      const year = parseInt(req.params.year, 10);
      const month = parseInt(req.params.month, 10); // 1-indexed

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        res.status(400).json({ error: 'Invalid year or month. Month must be 1-12.' });
        return;
      }

      const transactions = await transactionStore.list();
      const filtered = transactions.filter((t) => {
        const td = new Date(t.date);
        return td.getFullYear() === year && td.getMonth() === month - 1;
      });

      res.json(filtered);
    } catch (err) {
      res.status(500).json({ error: 'Monthly query failed', detail: String(err) });
    }
  });

  // ---- Gold summary ----
  router.get('/gold/summary', async (_req, res) => {
    try {
      const goldHoldings = await goldStore.list();

      const totalPavans = goldHoldings.reduce((sum, g) => sum + g.weightPavans, 0);
      const totalGrams = totalPavans * 8;

      // Breakdown by type — returns Record<string, { count, pavans }>
      const byType: Record<string, { count: number; pavans: number }> = {};
      goldHoldings.forEach((g) => {
        if (!byType[g.type]) {
          byType[g.type] = { count: 0, pavans: 0 };
        }
        byType[g.type].count += 1;
        byType[g.type].pavans += g.weightPavans;
      });

      // Breakdown by purity — returns Record<string, { count, pavans }>
      const byPurity: Record<string, { count: number; pavans: number }> = {};
      goldHoldings.forEach((g) => {
        if (!byPurity[g.purity]) {
          byPurity[g.purity] = { count: 0, pavans: 0 };
        }
        byPurity[g.purity].count += 1;
        byPurity[g.purity].pavans += g.weightPavans;
      });

      res.json({
        totalPavans,
        totalGrams,
        byType,
        byPurity,
      });
    } catch (err) {
      res.status(500).json({ error: 'Gold summary failed', detail: String(err) });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// Combined router
// ---------------------------------------------------------------------------

export function getPersonalFinanceRouter(): Router {
  const router = Router();
  router.use('/', customRoutes());
  router.use('/transactions', transactionCrudRouter);
  router.use('/investments', investmentCrudRouter);
  router.use('/gold', goldCrudRouter);
  return router;
}
