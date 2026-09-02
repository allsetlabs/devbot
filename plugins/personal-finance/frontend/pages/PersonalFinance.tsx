import { useState, useEffect, useCallback } from 'react';
import type { TransactionRecord, InvestmentRecord, GoldRecord, GoldSummary, DashboardData } from '../types';
import { personalFinanceApi } from '../api';
import { TransactionsList } from '../components/TransactionsList';
import { InvestmentsList } from '../components/InvestmentsList';
import { GoldHoldings } from '../components/GoldHoldings';
import { HeaderSlot } from '@devbot/app/components/HeaderSlot';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@allsetlabs/forge/components/ui/tabs';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  DollarSign, TrendingUp, Coins, RefreshCw,
  ArrowUpRight, ArrowDownRight, Wallet, Loader2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function StatCard({
  label,
  icon: Icon,
  value,
  valueClassName,
  subtitle,
}: {
  label: string;
  icon: LucideIcon;
  value: React.ReactNode;
  valueClassName?: string;
  subtitle: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClassName ?? ''}`}>
          {value}
        </p>
        {subtitle}
      </CardContent>
    </Card>
  );
}

export function PersonalFinance() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  const [goldItems, setGoldItems] = useState<GoldRecord[]>([]);
  const [goldSummary, setGoldSummary] = useState<GoldSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('transactions');

  const loadDashboard = useCallback(async () => {
    try {
      const data = await personalFinanceApi.dashboard();
      setDashboard(data);
    } catch {
      toast.error('Failed to load dashboard');
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await personalFinanceApi.listTransactions();
      setTransactions(data);
    } catch {
      toast.error('Failed to load transactions');
    }
  }, []);

  const loadInvestments = useCallback(async () => {
    try {
      const data = await personalFinanceApi.listInvestments();
      setInvestments(data);
    } catch {
      toast.error('Failed to load investments');
    }
  }, []);

  const loadGold = useCallback(async () => {
    try {
      const [items, summary] = await Promise.all([
        personalFinanceApi.listGold(),
        personalFinanceApi.goldSummary(),
      ]);
      setGoldItems(items);
      setGoldSummary(summary);
    } catch {
      toast.error('Failed to load gold holdings');
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadDashboard(), loadTransactions(), loadInvestments(), loadGold()]);
    setLoading(false);
  }, [loadDashboard, loadTransactions, loadInvestments, loadGold]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleTabRefresh = useCallback(
    async (tab: string) => {
      const loaders: Record<string, () => Promise<void>> = {
        transactions: loadTransactions,
        investments: loadInvestments,
        gold: loadGold,
      };
      await Promise.all([loaders[tab]?.(), loadDashboard()]);
    },
    [loadTransactions, loadInvestments, loadGold, loadDashboard],
  );

  const gainLossPositive = (dashboard?.investmentGainLoss ?? 0) >= 0;

  return (
    <div className="flex h-full flex-col">
      <HeaderSlot>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setLoading(true);
            void loadAll();
          }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </HeaderSlot>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-2xl p-4">
          {loading && !dashboard ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Dashboard stats */}
              {dashboard && (
                <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <StatCard
                    label="Net Worth"
                    icon={DollarSign}
                    value={formatCurrency(dashboard.netWorth)}
                    subtitle={<p className="text-xs text-muted-foreground">Savings + Investments + Gold</p>}
                  />
                  <StatCard
                    label="Net Savings"
                    icon={Wallet}
                    value={formatCurrency(dashboard.netSavings)}
                    valueClassName={dashboard.netSavings >= 0 ? 'text-green-500' : 'text-red-500'}
                    subtitle={<p className="text-xs text-muted-foreground">Income - Expenses</p>}
                  />
                  <StatCard
                    label="Portfolio"
                    icon={TrendingUp}
                    value={formatCurrency(dashboard.investmentValue)}
                    subtitle={
                      <p className={`flex items-center gap-0.5 text-xs ${gainLossPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {gainLossPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {formatCurrency(Math.abs(dashboard.investmentGainLoss))}
                      </p>
                    }
                  />
                  <StatCard
                    label="Gold"
                    icon={Coins}
                    value={`${dashboard.goldTotalPavans.toFixed(1)} pvn`}
                    subtitle={<p className="text-xs text-muted-foreground">{dashboard.goldTotalGrams.toFixed(1)}g total</p>}
                  />
                </div>
              )}

              {/* Tabbed content */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-3 w-full">
                  <TabsTrigger value="transactions" className="flex-1">
                    Transactions
                  </TabsTrigger>
                  <TabsTrigger value="investments" className="flex-1">
                    Investments
                  </TabsTrigger>
                  <TabsTrigger value="gold" className="flex-1">
                    Gold
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                  <TransactionsList
                    transactions={transactions}
                    onRefresh={() => handleTabRefresh('transactions')}
                  />
                </TabsContent>

                <TabsContent value="investments">
                  <InvestmentsList
                    investments={investments}
                    onRefresh={() => handleTabRefresh('investments')}
                  />
                </TabsContent>

                <TabsContent value="gold">
                  <GoldHoldings
                    goldItems={goldItems}
                    goldSummary={goldSummary}
                    onRefresh={() => handleTabRefresh('gold')}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
