import { useState } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@allsetlabs/forge/components/ui/select';
import { Label } from '@allsetlabs/forge/components/ui/label';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from '@allsetlabs/forge/components/ui/drawer';
import { Plus, Search, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import type { InvestmentRecord, InvestmentType } from '../types';
import { financeApi } from '../api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

const TYPE_COLORS: Record<InvestmentType, string> = {
  stock: 'bg-blue-500/10 text-blue-500',
  etf: 'bg-purple-500/10 text-purple-500',
  mutual_fund: 'bg-indigo-500/10 text-indigo-500',
  crypto: 'bg-orange-500/10 text-orange-500',
  bond: 'bg-green-500/10 text-green-500',
  other: 'bg-gray-500/10 text-gray-500',
};

const TYPE_LABELS: Record<InvestmentType, string> = {
  stock: 'Stock',
  etf: 'ETF',
  mutual_fund: 'Mutual Fund',
  crypto: 'Crypto',
  bond: 'Bond',
  other: 'Other',
};

const INVESTMENT_TYPES: InvestmentType[] = [
  'stock',
  'etf',
  'mutual_fund',
  'crypto',
  'bond',
  'other',
];

// ---------------------------------------------------------------------------
// Add Investment Drawer
// ---------------------------------------------------------------------------

function AddInvestmentDrawer({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('stock');
  const [quantity, setQuantity] = useState('');
  const [avgCostBasis, setAvgCostBasis] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [account, setAccount] = useState('Manual');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setSymbol('');
    setName('');
    setType('stock');
    setQuantity('');
    setAvgCostBasis('');
    setCurrentPrice('');
    setAccount('Manual');
    setNotes('');
  };

  const handleSave = async () => {
    if (!symbol.trim() || !quantity || !avgCostBasis || !currentPrice) return;
    setSaving(true);
    try {
      await financeApi.createInvestment({
        symbol: symbol.trim().toUpperCase(),
        name: name.trim(),
        type,
        quantity: parseFloat(quantity),
        avgCostBasis: parseFloat(avgCostBasis),
        currentPrice: parseFloat(currentPrice),
        account: account.trim() || 'Manual',
        notes: notes.trim(),
      });
      resetForm();
      setOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to create investment:', err);
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    symbol.trim() &&
    parseFloat(quantity) > 0 &&
    parseFloat(avgCostBasis) > 0 &&
    parseFloat(currentPrice) > 0;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add Investment
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader>
          <DrawerTitle>Add Investment</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <div className="flex flex-col gap-3 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Symbol *</Label>
                <Input
                  placeholder="AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Name</Label>
                <Input
                  placeholder="Apple Inc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as InvestmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Quantity *</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Avg Cost *</Label>
                <Input
                  type="number"
                  placeholder="150.00"
                  value={avgCostBasis}
                  onChange={(e) => setAvgCostBasis(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Current Price *</Label>
                <Input
                  type="number"
                  placeholder="175.00"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs">Account</Label>
              <Input
                placeholder="Manual"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs">Notes</Label>
              <Textarea
                placeholder="Optional notes about this holding..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving...' : 'Save Investment'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Investment Card
// ---------------------------------------------------------------------------

function InvestmentCard({
  investment,
  onDelete,
}: {
  investment: InvestmentRecord;
  onDelete: () => void;
}) {
  const totalCost = investment.quantity * investment.avgCostBasis;
  const marketValue = investment.quantity * investment.currentPrice;
  const gainLoss = marketValue - totalCost;
  const gainLossPercent =
    investment.avgCostBasis > 0
      ? ((investment.currentPrice - investment.avgCostBasis) / investment.avgCostBasis) * 100
      : 0;
  const isPositive = gainLoss >= 0;

  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await financeApi.deleteInvestment(investment.id);
      onDelete();
    } catch (err) {
      console.error('Failed to delete investment:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="group transition-colors md:hover:border-border">
      <CardContent className="p-3">
        {/* Row 1: Symbol, name, badges, delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{investment.symbol}</span>
              <Badge className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[investment.type]}`}>
                {TYPE_LABELS[investment.type]}
              </Badge>
              {investment.account && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {investment.account}
                </Badge>
              )}
            </div>
            {investment.name && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{investment.name}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>

        {/* Row 2: Cost / Value / Gain */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">
              {investment.quantity} x {formatCurrency(investment.avgCostBasis)}
            </span>
            <p className="font-medium tabular-nums">{formatCurrency(totalCost)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">
              @ {formatCurrency(investment.currentPrice)}
            </span>
            <p className="font-medium tabular-nums">{formatCurrency(marketValue)}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={`text-[11px] font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {formatPercent(gainLossPercent)}
              </span>
            </div>
            <p
              className={`font-semibold tabular-nums ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {isPositive ? '+' : ''}
              {formatCurrency(gainLoss)}
            </p>
          </div>
        </div>

        {/* Row 3: Last updated */}
        {investment.lastUpdated && (
          <p className="mt-1.5 text-[10px] text-muted-foreground/60">
            Updated{' '}
            {new Date(investment.lastUpdated).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface InvestmentsListProps {
  investments: InvestmentRecord[];
  onRefresh: () => void;
}

export function InvestmentsList({ investments, onRefresh }: InvestmentsListProps) {
  const [search, setSearch] = useState('');

  // Filter investments by search term
  const filtered = investments.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.symbol.toLowerCase().includes(q) || (inv.name && inv.name.toLowerCase().includes(q))
    );
  });

  // Portfolio summary
  const totalValue = investments.reduce((sum, inv) => sum + inv.quantity * inv.currentPrice, 0);
  const totalCost = investments.reduce((sum, inv) => sum + inv.quantity * inv.avgCostBasis, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const isPortfolioPositive = totalGainLoss >= 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Summary row */}
      {investments.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card/50 p-3">
            <p className="text-[11px] text-muted-foreground">Portfolio Value</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(totalValue)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-3">
            <p className="text-[11px] text-muted-foreground">Cost Basis</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(totalCost)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-3">
            <p className="text-[11px] text-muted-foreground">Total Gain / Loss</p>
            <div className="flex items-baseline gap-2">
              <p
                className={`text-lg font-bold tabular-nums ${isPortfolioPositive ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {isPortfolioPositive ? '+' : ''}
                {formatCurrency(totalGainLoss)}
              </p>
              <span
                className={`text-xs font-medium ${isPortfolioPositive ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {formatPercent(totalGainLossPercent)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header: search + add button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <AddInvestmentDrawer onRefresh={onRefresh} />
      </div>

      {/* Investment cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-10">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {investments.length === 0
              ? 'No investments tracked. Add holdings manually or sync from Robinhood.'
              : 'No investments match your search.'}
          </p>
          {investments.length === 0 && (
            <AddInvestmentDrawer onRefresh={onRefresh} />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((inv) => (
            <InvestmentCard key={inv.id} investment={inv} onDelete={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
