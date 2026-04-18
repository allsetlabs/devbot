import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Plus, Building2, X } from 'lucide-react';
import { companyHooks } from '../hooks/useCompany';
import { extractErrorMessage } from '../lib/format';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { SlideNav } from '../components/SlideNav';
import { ListPageHeader } from '../components/ListPageHeader';

export function CompanyList() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyIdea, setCompanyIdea] = useState('');

  const {
    data: companies = [],
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = companyHooks.useGetCompanies();

  const createMutation = companyHooks.useCreateCompany();
  const deleteMutation = companyHooks.useDeleteCompany();

  const error = extractErrorMessage(fetchError, createMutation.error, deleteMutation.error);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyIdea.trim()) return;
    createMutation.mutate(
      { name: companyName.trim(), idea: companyIdea.trim() },
      {
        onSuccess: (company) => {
          setShowForm(false);
          setCompanyName('');
          setCompanyIdea('');
          navigate(`/company/${company.id}`);
        },
      }
    );
  };

  const handleClose = () => {
    setShowForm(false);
    setCompanyName('');
    setCompanyIdea('');
  };

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      <ListPageHeader
        icon={<Building2 className="h-6 w-6 text-primary" />}
        title="Companies"
        onMenuClick={() => setNavOpen(true)}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      >
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Company
        </Button>
      </ListPageHeader>

      <ErrorBanner error={error} />

      <main className="flex-1 overflow-y-auto">
        {isLoading && companies.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading companies...</div>
          </div>
        ) : companies.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-16 w-16 text-muted-foreground/50" />}
            title="No companies"
            description="Create a company to start building with AI agents"
            actionLabel="Create First Company"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="divide-y divide-border">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => navigate(`/company/${company.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
              >
                <Building2 className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{company.name}</div>
                  <div className="truncate text-sm text-muted-foreground">{company.directory}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    company.status === 'active'
                      ? 'bg-green-500/10 text-green-500'
                      : company.status === 'creating'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {company.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* New Company Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="safe-area-bottom w-full max-w-lg rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Company</h2>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {createMutation.error && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Failed to create company'}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Company Name <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Project Idea <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={companyIdea}
                  onChange={(e) => setCompanyIdea(e.target.value)}
                  placeholder="Describe your project idea..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending || !companyIdea.trim()}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Company'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
