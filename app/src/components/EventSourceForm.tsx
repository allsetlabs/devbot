import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@allsetlabs/forge/components/ui/dialog';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Label } from '@allsetlabs/forge/components/ui/label';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import type { EventSource, EventSourceType, CreateEventSourceRequest } from '../types';

const TYPE_OPTIONS: { label: string; value: EventSourceType }[] = [
  { label: 'Stock', value: 'stock' },
  { label: 'Weather', value: 'weather' },
  { label: 'File Watch', value: 'file_watch' },
  { label: 'Webhook', value: 'webhook' },
  { label: 'Custom', value: 'custom' },
];

const POLL_OPTIONS: { label: string; value: number }[] = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
];

const STOCK_CONDITIONS = ['above', 'below', 'change_pct'] as const;
const WEATHER_CONDITIONS = ['temp_above', 'temp_below', 'rain', 'snow', 'severe'] as const;

interface EventSourceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventSourceRequest) => Promise<void>;
  editSource?: EventSource;
}

export function EventSourceForm({ isOpen, onClose, onSubmit, editSource }: EventSourceFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EventSourceType>('stock');
  const [pollInterval, setPollInterval] = useState(300);
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  // Stock config
  const [stockSymbol, setStockSymbol] = useState('');
  const [stockCondition, setStockCondition] = useState<string>('above');
  const [stockThreshold, setStockThreshold] = useState('');

  // Weather config
  const [weatherLocation, setWeatherLocation] = useState('');
  const [weatherCondition, setWeatherCondition] = useState<string>('temp_above');
  const [weatherThreshold, setWeatherThreshold] = useState('');

  // File watch config
  const [filePath, setFilePath] = useState('');
  const [filePattern, setFilePattern] = useState('');

  // Webhook config
  const [webhookPath, setWebhookPath] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  // Custom config
  const [customJson, setCustomJson] = useState('{}');

  useEffect(() => {
    if (editSource) {
      setName(editSource.name);
      setType(editSource.type);
      setPollInterval(editSource.pollIntervalSeconds);
      setStatus(editSource.status);
      const c = editSource.config;
      switch (editSource.type) {
        case 'stock':
          setStockSymbol((c.symbol as string) || '');
          setStockCondition((c.condition as string) || 'above');
          setStockThreshold(c.threshold != null ? String(c.threshold) : '');
          break;
        case 'weather':
          setWeatherLocation((c.location as string) || '');
          setWeatherCondition((c.condition as string) || 'temp_above');
          setWeatherThreshold(c.threshold != null ? String(c.threshold) : '');
          break;
        case 'file_watch':
          setFilePath((c.watchPath as string) || '');
          setFilePattern((c.pattern as string) || '');
          break;
        case 'webhook':
          setWebhookPath((c.path as string) || '');
          setWebhookSecret((c.secret as string) || '');
          break;
        default:
          setCustomJson(JSON.stringify(c, null, 2));
      }
    } else {
      resetForm();
    }
  }, [editSource, isOpen]);

  const resetForm = () => {
    setName('');
    setType('stock');
    setPollInterval(300);
    setStatus('active');
    setStockSymbol('');
    setStockCondition('above');
    setStockThreshold('');
    setWeatherLocation('');
    setWeatherCondition('temp_above');
    setWeatherThreshold('');
    setFilePath('');
    setFilePattern('');
    setWebhookPath('');
    setWebhookSecret('');
    setCustomJson('{}');
  };

  const buildConfig = (): Record<string, unknown> => {
    switch (type) {
      case 'stock':
        return {
          symbol: stockSymbol.toUpperCase(),
          condition: stockCondition,
          threshold: stockThreshold ? parseFloat(stockThreshold) : undefined,
        };
      case 'weather':
        return {
          location: weatherLocation,
          condition: weatherCondition,
          ...(weatherCondition.startsWith('temp_') && weatherThreshold
            ? { threshold: parseFloat(weatherThreshold) }
            : {}),
        };
      case 'file_watch':
        return {
          watchPath: filePath,
          ...(filePattern ? { pattern: filePattern } : {}),
        };
      case 'webhook':
        return {
          path: webhookPath.startsWith('/webhook/') ? webhookPath : `/webhook/${webhookPath}`,
          ...(webhookSecret ? { secret: webhookSecret } : {}),
        };
      case 'custom':
        try {
          return JSON.parse(customJson);
        } catch {
          return {};
        }
      default:
        return {};
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const data: CreateEventSourceRequest = {
        name: name.trim(),
        type,
        config: buildConfig(),
        pollIntervalSeconds: pollInterval,
        status,
      };
      return onSubmit(data);
    },
    onSuccess: () => {
      resetForm();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    submitMutation.mutate();
  };

  const handleClose = () => {
    resetForm();
    submitMutation.reset();
    onClose();
  };

  const isTemperatureCondition =
    weatherCondition === 'temp_above' || weatherCondition === 'temp_below';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>{editSource ? 'Edit Event Source' : 'New Event Source'}</DialogTitle>
        </DialogHeader>

        {submitMutation.error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitMutation.error instanceof Error
              ? submitMutation.error.message
              : 'Failed to save'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="es-name">Name</Label>
            <Input
              id="es-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AAPL Price Alert"
            />
          </div>

          {/* Type selector */}
          <div>
            <Label>Type</Label>
            <div className="mt-1 grid grid-cols-5 gap-2" role="group" aria-label="Source type">
              {TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    type === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground md:hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Type-specific config */}
          {type === 'stock' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="stock-symbol">Symbol</Label>
                <Input
                  id="stock-symbol"
                  value={stockSymbol}
                  onChange={(e) => setStockSymbol(e.target.value)}
                  placeholder="AAPL"
                />
              </div>
              <div>
                <Label>Condition</Label>
                <div className="mt-1 grid grid-cols-3 gap-2" role="group" aria-label="Condition">
                  {STOCK_CONDITIONS.map((c) => (
                    <Button
                      key={c}
                      variant="outline"
                      type="button"
                      onClick={() => setStockCondition(c)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        stockCondition === c
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-foreground md:hover:bg-muted'
                      }`}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="stock-threshold">Threshold</Label>
                <Input
                  id="stock-threshold"
                  type="number"
                  step="0.01"
                  value={stockThreshold}
                  onChange={(e) => setStockThreshold(e.target.value)}
                  placeholder="150.00"
                />
              </div>
            </div>
          )}

          {type === 'weather' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="weather-location">Location</Label>
                <Input
                  id="weather-location"
                  value={weatherLocation}
                  onChange={(e) => setWeatherLocation(e.target.value)}
                  placeholder="New York"
                />
              </div>
              <div>
                <Label>Condition</Label>
                <div className="mt-1 grid grid-cols-3 gap-2" role="group" aria-label="Condition">
                  {WEATHER_CONDITIONS.map((c) => (
                    <Button
                      key={c}
                      variant="outline"
                      type="button"
                      onClick={() => setWeatherCondition(c)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        weatherCondition === c
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-foreground md:hover:bg-muted'
                      }`}
                    >
                      {c.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
              {isTemperatureCondition && (
                <div>
                  <Label htmlFor="weather-threshold">Threshold (F)</Label>
                  <Input
                    id="weather-threshold"
                    type="number"
                    value={weatherThreshold}
                    onChange={(e) => setWeatherThreshold(e.target.value)}
                    placeholder="85"
                  />
                </div>
              )}
            </div>
          )}

          {type === 'file_watch' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="file-path">Path</Label>
                <Input
                  id="file-path"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/path/to/watch"
                />
              </div>
              <div>
                <Label htmlFor="file-pattern">Pattern (optional)</Label>
                <Input
                  id="file-pattern"
                  value={filePattern}
                  onChange={(e) => setFilePattern(e.target.value)}
                  placeholder="*.log"
                />
              </div>
            </div>
          )}

          {type === 'webhook' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="webhook-path">Path</Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">/webhook/</span>
                  <Input
                    id="webhook-path"
                    value={webhookPath.replace(/^\/webhook\//, '')}
                    onChange={(e) => setWebhookPath(e.target.value)}
                    placeholder="my-hook"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="webhook-secret">Secret (optional)</Label>
                <Input
                  id="webhook-secret"
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Optional signing secret"
                />
              </div>
            </div>
          )}

          {type === 'custom' && (
            <div>
              <Label htmlFor="custom-json">Config (JSON)</Label>
              <Textarea
                id="custom-json"
                value={customJson}
                onChange={(e) => setCustomJson(e.target.value)}
                rows={5}
                className="font-mono text-xs"
                placeholder='{"key": "value"}'
              />
            </div>
          )}

          {/* Poll Interval */}
          <div>
            <Label>Poll Interval</Label>
            <div className="mt-1 grid grid-cols-6 gap-2" role="group" aria-label="Poll interval">
              {POLL_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  type="button"
                  onClick={() => setPollInterval(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    pollInterval === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground md:hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Status toggle */}
          <div>
            <Label>Status</Label>
            <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-label="Status">
              <Button
                variant="outline"
                type="button"
                onClick={() => setStatus('active')}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                  status === 'active'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground md:hover:bg-muted'
                }`}
              >
                Active
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setStatus('paused')}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                  status === 'paused'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground md:hover:bg-muted'
                }`}
              >
                Paused
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={submitMutation.isPending || !name.trim()}
            >
              {submitMutation.isPending
                ? 'Saving...'
                : editSource
                  ? 'Save Changes'
                  : 'Create Source'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
