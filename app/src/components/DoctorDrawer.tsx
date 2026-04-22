import { useState, useEffect } from 'react';
import { Stethoscope, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { api } from '../lib/api';
import type { DoctorCheck, DoctorResponse } from '../types';

const CHECK_ORDER = ['backend', 'claudeCLI', 'activeSessions', 'workingDirectory', 'diskSpace', 'memory'];

function StatusIcon({ status }: { status: DoctorCheck['status'] }) {
  if (status === 'pass') return <CheckCircle className="h-4 w-4 flex-shrink-0 text-success" />;
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />;
  return <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />;
}

function CheckRow({ check }: { check: DoctorCheck }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <StatusIcon status={check.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{check.label}</span>
          {check.value && (
            <span
              className={`flex-shrink-0 text-xs font-medium ${
                check.status === 'pass'
                  ? 'text-success'
                  : check.status === 'warn'
                    ? 'text-warning'
                    : 'text-destructive'
              }`}
            >
              {check.value}
            </span>
          )}
        </div>
        {check.detail && (
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{check.detail}</p>
        )}
      </div>
    </div>
  );
}

interface DoctorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DoctorDrawer({ open, onOpenChange }: DoctorDrawerProps) {
  const [data, setData] = useState<DoctorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.doctor();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !data) {
      runDiagnostics();
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const checks = data
    ? CHECK_ORDER.map((key) => data.checks[key]).filter(Boolean)
    : [];
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const allPass = failCount === 0 && warnCount === 0;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center justify-between pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Backend Diagnostics
          </DrawerTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={runDiagnostics}
            disabled={loading}
            className="h-7 w-7"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </DrawerHeader>

        <div className="flex-1 overflow-auto px-4 pb-6">
          {loading && !data && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm">Running diagnostics…</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {data && (
            <>
              <div
                className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${
                  allPass
                    ? 'bg-success/10 text-success'
                    : failCount > 0
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-warning/10 text-warning'
                }`}
              >
                {allPass
                  ? 'All systems operational'
                  : failCount > 0
                    ? `${failCount} check${failCount > 1 ? 's' : ''} failed`
                    : `${warnCount} warning${warnCount > 1 ? 's' : ''}`}
              </div>

              <div className="divide-y divide-border/50">
                {checks.map((check, i) => (
                  <CheckRow key={i} check={check} />
                ))}
              </div>

              {data.timestamp && (
                <p className="mt-4 text-center text-[10px] text-muted-foreground/50">
                  Last checked {new Date(data.timestamp).toLocaleTimeString()}
                </p>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
