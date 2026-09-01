import { useState } from 'react';
import type { TripExpense } from '../types';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from '@allsetlabs/forge/components/ui/drawer';
import {
  Plus,
  Trash2,
  DollarSign,
  Plane,
  Utensils,
  Hotel,
  ShoppingBag,
  Ticket,
  MoreHorizontal,
  X,
  TrendingUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Expense categories
// ---------------------------------------------------------------------------

const EXPENSE_CATEGORIES = [
  { key: 'flights', label: 'Flights', icon: Plane },
  { key: 'accommodation', label: 'Accommodation', icon: Hotel },
  { key: 'food', label: 'Food & Drink', icon: Utensils },
  { key: 'transport', label: 'Transport', icon: Plane },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { key: 'other', label: 'Other', icon: MoreHorizontal },
];

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getCategoryIcon(category: string) {
  const cat = EXPENSE_CATEGORIES.find((c) => c.key === category);
  return cat?.icon ?? DollarSign;
}

// ---------------------------------------------------------------------------
// Add expense drawer
// ---------------------------------------------------------------------------

function AddExpenseDrawer({
  open,
  onOpenChange,
  onAdd,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (expense: TripExpense) => void;
  currency: string;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');

  const handleAdd = () => {
    if (!description.trim() || !amount) return;
    onAdd({
      id: generateId(),
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      currency,
      date,
      paidBy: paidBy.trim() || 'Me',
    });
    onOpenChange(false);
    setDescription('');
    setAmount('');
    setCategory('other');
    setPaidBy('');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Add Expense</DrawerTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <DrawerBody>
          <div className="flex flex-col gap-3 pb-6">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-all ${
                        category === cat.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground md:hover:border-primary/40'
                      }`}
                    >
                      <CatIcon className="h-3 w-3" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description *
              </label>
              <Input
                placeholder="Round-trip flight to Rome"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Amount *
                </label>
                <Input
                  type="number"
                  placeholder="450"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Paid By
              </label>
              <Input
                placeholder="Me"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              />
            </div>

            <Button onClick={handleAdd} disabled={!description.trim() || !amount}>
              Add Expense
            </Button>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ExpenseTrackerProps {
  expenses: TripExpense[];
  budget: number;
  currency: string;
  onChange: (expenses: TripExpense[]) => void;
}

export function ExpenseTracker({ expenses, budget, currency, onChange }: ExpenseTrackerProps) {
  const [addOpen, setAddOpen] = useState(false);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - totalSpent;
  const pct = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;

  // Group expenses by category
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const handleDelete = (id: string) => {
    onChange(expenses.filter((e) => e.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Budget overview */}
      {budget > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-medium">
              {totalSpent.toLocaleString()} / {budget.toLocaleString()} {currency}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 100
                  ? 'bg-destructive'
                  : pct >= 80
                    ? 'bg-amber-500'
                    : 'bg-primary'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{pct}% spent</span>
            <span className={remaining < 0 ? 'text-destructive' : ''}>
              {remaining >= 0 ? `${remaining.toLocaleString()} remaining` : `${Math.abs(remaining).toLocaleString()} over budget`}
            </span>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amount]) => {
              const Icon = getCategoryIcon(cat);
              const catLabel = EXPENSE_CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
              return (
                <div
                  key={cat}
                  className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/50 px-2 py-1 text-xs"
                >
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{catLabel}</span>
                  <span className="font-medium">{amount.toLocaleString()}</span>
                </div>
              );
            })}
        </div>
      )}

      {/* Expense list */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Expenses ({expenses.length})
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-8">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No expenses tracked yet</p>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Add first expense
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {expenses
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((expense) => {
              const Icon = getCategoryIcon(expense.category);
              return (
                <div
                  key={expense.id}
                  className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-2.5 transition-colors md:hover:border-border"
                >
                  <div className="rounded-md bg-muted p-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{expense.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {expense.date &&
                        new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      {expense.paidBy && ` · ${expense.paidBy}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {expense.amount.toLocaleString()} {expense.currency}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(expense.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              );
            })}
        </div>
      )}

      <AddExpenseDrawer
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(expense) => onChange([...expenses, expense])}
        currency={currency}
      />
    </div>
  );
}
