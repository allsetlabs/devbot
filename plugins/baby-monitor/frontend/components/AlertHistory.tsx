import { useState } from 'react';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  Info,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AlertRecord } from '../types';
import { babyMonitorApi } from '../api';

interface Props {
  alerts: AlertRecord[];
  onUpdate: () => void;
}

const SEVERITY_CONFIG = {
  danger: {
    icon: AlertTriangle,
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    label: 'Danger',
  },
  warning: {
    icon: AlertTriangle,
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    label: 'Info',
  },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AlertHistory({ alerts, onUpdate }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    try {
      await babyMonitorApi.acknowledgeAlert(id);
      onUpdate();
    } catch {
      toast.error('Failed to acknowledge');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await babyMonitorApi.deleteAlert(id);
      toast.success('Alert deleted');
      onUpdate();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      const result = await babyMonitorApi.acknowledgeAll();
      toast.success(`Acknowledged ${result.acknowledged} alerts`);
      onUpdate();
    } catch {
      toast.error('Failed to acknowledge all');
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Shield className="mb-2 h-10 w-10 opacity-40" />
        <p className="text-sm">No alerts</p>
        <p className="text-xs">All clear — no safety concerns detected.</p>
      </div>
    );
  }

  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-3">
      {unackCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {unackCount} unacknowledged alert{unackCount !== 1 ? 's' : ''}
          </p>
          <Button variant="outline" size="sm" onClick={handleAcknowledgeAll}>
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Acknowledge All
          </Button>
        </div>
      )}

      {alerts.map((alert) => {
        const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
        const Icon = config.icon;
        const isExpanded = expandedId === alert.id;

        return (
          <Card
            key={alert.id}
            className={`transition-all ${alert.acknowledged ? 'opacity-50' : ''}`}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    alert.severity === 'danger'
                      ? 'text-red-500'
                      : alert.severity === 'warning'
                        ? 'text-amber-500'
                        : 'text-blue-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={config.color} variant="outline">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {alert.cameraName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatTime(alert.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{alert.message}</p>
                  {alert.confidence > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Confidence: {Math.round(alert.confidence * 100)}%
                    </p>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                    className="mt-1 flex items-center gap-1 text-xs text-muted-foreground md:hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {isExpanded ? 'Less' : 'Details'}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                      {alert.details}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-2"
                      title="Acknowledge"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(alert.id)}
                    className="px-2"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
