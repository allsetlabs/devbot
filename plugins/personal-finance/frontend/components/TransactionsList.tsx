import { useState, useMemo } from 'react';
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
import { Plus, Search, ArrowUpRight, ArrowDownRight, Trash2, Filter } from 'lucide-react';
import type {
  TransactionRecord,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
} from '../types';
import { financeApi } from '../api';

const CATEGORY_ICONS: Record<string, string> = {
  groceries: '🛒',
  dining: '🍽️',
  transport: '🚗',
  utilities: '💡',
  rent: '🏠',
  salary: '💰',
  freelance: '💻',
  investment: '📈',
  shopping: '🛍️',
  entertainment: '🎬',
  health: '🏥',
  education: '📚',
  travel: '✈️',
  gifts: '🎁',
  other: '📝',
};

const ALL_CATEGORIES: TransactionCategory[] = [
  'groceries',
  'dining',
  'transport',
  'utilities',
  'rent',
  'salary',
  'freelance',
  'investment',
  'shopping',
  'entertainment',
  'health',
  'education',
  'travel',
  'gifts',
  'other',
];

const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'credit',
  'debit',
  'upi',
  'bank_transfer',
  'other',
];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  credit: 'Credit Card',
  debit: 'Debit Card',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Add Transaction Drawer
// ---------------------------------------------------------------------------

interface AddTransactionDrawerProps {
  onSaved: () => void;
}

function AddTransactionDrawer({ onSaved }: AddTransactionDrawerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [date, setDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [merchant, setMerchant] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [notes, setNotes] = useState('');

  function resetForm() {
    setType('expense');
    setAmount('');
    setDescription('');
    setCategory('other');
    setDate(todayISO());
    setPaymentMethod('cash');
    setMerchant('');
    setTagsInput('');
    setRecurring(false);
    setRecurringInterval('monthly');
    setNotes('');
  }

  async function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!description.trim()) return;

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await financeApi.createTransaction({
        type,
        amount: parsedAmount,
        description: description.trim(),
        category,
        date,
        paymentMethod,
        merchant: merchant.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        recurring,
        recurringInterval: recurring ? recurringInterval : undefined,
        notes: notes.trim() || undefined,
      });

      resetForm();
      setOpen(false);
      onSaved();
    } catch (err) {
      console.error('Failed to create transaction:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Transaction</DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="space-y-4 px-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <Button
              variant={type === 'expense' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setType('expense')}
            >
              Expense
            </Button>
            <Button
              variant={type === 'income' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setType('income')}
            >
              Income
            </Button>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-amount">Amount</Label>
            <Input
              id="txn-amount"
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-description">Description</Label>
            <Input
              id="txn-description"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TransactionCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-date">Date</Label>
            <Input
              id="txn-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm} value={pm}>
                    {PAYMENT_METHOD_LABELS[pm]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Merchant */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-merchant">Merchant (optional)</Label>
            <Input
              id="txn-merchant"
              placeholder="Store or company name"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-tags">Tags (comma-separated)</Label>
            <Input
              id="txn-tags"
              placeholder="e.g. weekly, essential"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <Label htmlFor="txn-recurring" className="cursor-pointer">
              Recurring
            </Label>
            <Button
              id="txn-recurring"
              variant={recurring ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRecurring(!recurring)}
            >
              {recurring ? 'Yes' : 'No'}
            </Button>
          </div>

          {recurring && (
            <div className="space-y-1.5">
              <Label>Interval</Label>
              <Select
                value={recurringInterval}
                onValueChange={(v) => setRecurringInterval(v as '' | 'weekly' | 'monthly' | 'yearly')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-notes">Notes</Label>
            <Textarea
              id="txn-notes"
              placeholder="Any additional details..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </DrawerBody>

        <DrawerFooter className="flex-row gap-2 px-4">
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </DrawerClose>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !amount || !description.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Transaction Card
// ---------------------------------------------------------------------------

interface TransactionCardProps {
  transaction: TransactionRecord;
  onDeleted: () => void;
}

function TransactionCard({ transaction, onDeleted }: TransactionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isIncome = transaction.type === 'income';
  const emoji = CATEGORY_ICONS[transaction.category] ?? '📝';

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await financeApi.deleteTransaction(transaction.id);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Card className="md:hover:shadow-md transition-shadow">
      <CardContent className="flex items-start gap-3 p-4">
        {/* Left: emoji + details */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
          {emoji}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium leading-tight">{transaction.description}</p>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {transaction.merchant && <span>{transaction.merchant}</span>}
            {transaction.merchant && <span>·</span>}
            <span>{formatDate(transaction.date)}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {transaction.category}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {PAYMENT_METHOD_LABELS[transaction.paymentMethod] ?? transaction.paymentMethod}
            </Badge>
            {transaction.recurring && (
              <Badge variant="outline" className="text-[10px]">
                🔁 {transaction.recurringInterval ?? 'recurring'}
              </Badge>
            )}
            {transaction.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Right: amount + delete */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div
            className={`flex items-center gap-0.5 font-semibold ${
              isIncome ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {isIncome ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>{formatCurrency(transaction.amount)}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${
              confirmDelete
                ? 'text-red-600'
                : 'text-muted-foreground md:hover:text-red-600'
            }`}
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {confirmDelete && (
            <span className="text-[10px] text-red-500">Tap again</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Transactions List (main export)
// ---------------------------------------------------------------------------

interface TransactionsListProps {
  transactions: TransactionRecord[];
  onRefresh: () => void;
}

export function TransactionsList({ transactions, onRefresh }: TransactionsListProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return [...transactions]
      .filter((txn) => {
        if (typeFilter !== 'all' && txn.type !== typeFilter) return false;
        if (!term) return true;

        return (
          txn.description.toLowerCase().includes(term) ||
          txn.category.toLowerCase().includes(term) ||
          (txn.merchant?.toLowerCase().includes(term) ?? false) ||
          (txn.tags?.some((t) => t.toLowerCase().includes(term)) ?? false) ||
          (txn.notes?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, typeFilter]);

  const typeFilterOptions: { label: string; value: 'all' | TransactionType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Income', value: 'income' },
    { label: 'Expense', value: 'expense' },
  ];

  return (
    <div className="space-y-4">
      {/* Header: title + add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <AddTransactionDrawer onSaved={onRefresh} />
      </div>

      {/* Search + type filter row */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {typeFilterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={typeFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Transaction cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {transactions.length === 0
            ? 'No transactions yet. Add your first one!'
            : 'No transactions match your filters.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((txn) => (
            <TransactionCard key={txn.id} transaction={txn} onDeleted={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
