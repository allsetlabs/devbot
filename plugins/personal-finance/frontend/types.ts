/** Personal Finance Plugin — shared types. */

// ---------------------------------------------------------------------------
// Standard FileStore fields included in every record
// ---------------------------------------------------------------------------

interface BaseRecord {
  id: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'utilities'
  | 'rent'
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'education'
  | 'travel'
  | 'gifts'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'credit'
  | 'debit'
  | 'upi'
  | 'bank_transfer'
  | 'other';

export interface TransactionRecord extends BaseRecord {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: string;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  merchant: string;
  tags: string[];
  recurring: boolean;
  recurringInterval: '' | 'weekly' | 'monthly' | 'yearly';
  notes: string;
}

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

export type InvestmentType =
  | 'stock'
  | 'etf'
  | 'mutual_fund'
  | 'crypto'
  | 'bond'
  | 'other';

export interface InvestmentRecord extends BaseRecord {
  symbol: string;
  name: string;
  type: InvestmentType;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  currency: string;
  account: string;
  lastUpdated: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Gold
// ---------------------------------------------------------------------------

export type GoldType = 'jewelry' | 'coin' | 'bar' | 'other';
export type GoldPurity = '24k' | '22k' | '18k' | '14k';

export interface GoldRecord extends BaseRecord {
  description: string;
  type: GoldType;
  weightPavans: number;
  purity: GoldPurity;
  purchasePrice: number;
  purchaseDate: string;
  currency: string;
  location: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Dashboard & summaries
// ---------------------------------------------------------------------------

export interface MonthlyBreakdown {
  month: string;
  income: number;
  expenses: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
}

export interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  monthlyBreakdown: MonthlyBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  investmentValue: number;
  investmentCost: number;
  investmentGainLoss: number;
  goldTotalPavans: number;
  goldTotalGrams: number;
  netWorth: number;
}

export interface GoldSummary {
  totalPavans: number;
  totalGrams: number;
  byType: Record<string, { count: number; pavans: number }>;
  byPurity: Record<string, { count: number; pavans: number }>;
}
