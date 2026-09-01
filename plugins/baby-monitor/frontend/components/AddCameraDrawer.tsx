import { useState } from 'react';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from '@allsetlabs/forge/components/ui/drawer';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Label } from '@allsetlabs/forge/components/ui/label';
import { Switch } from '@allsetlabs/forge/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@allsetlabs/forge/components/ui/select';
import { babyMonitorApi } from '../api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddCameraDrawer({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [location, setLocation] = useState('');
  const [transport, setTransport] = useState<'tcp' | 'udp'>('tcp');
  const [analysisInterval, setAnalysisInterval] = useState('60');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setRtspUrl('');
    setLocation('');
    setTransport('tcp');
    setAnalysisInterval('60');
    setUsername('');
    setPassword('');
    setEnabled(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !rtspUrl.trim()) {
      toast.error('Name and URL are required');
      return;
    }
    setSaving(true);
    try {
      await babyMonitorApi.createCamera({
        name: name.trim(),
        rtspUrl: rtspUrl.trim(),
        location: location.trim(),
        transport,
        analysisInterval: parseInt(analysisInterval, 10) || 60,
        username: username.trim(),
        password: password.trim(),
        enabled,
      });
      toast.success('Camera added');
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add camera');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Camera</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <div className="space-y-4 pb-6">
            <div>
              <Label htmlFor="cam-name">Camera Name *</Label>
              <Input
                id="cam-name"
                placeholder="Nursery Camera"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cam-url">Stream URL *</Label>
              <Input
                id="cam-url"
                placeholder="rtsp://192.168.1.100:554/stream"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                RTSP, HTTP, or HTTPS URL. For testing, use any image URL.
              </p>
            </div>
            <div>
              <Label htmlFor="cam-location">Location</Label>
              <Input
                id="cam-location"
                placeholder="Nursery, Bedroom, etc."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Transport</Label>
                <Select value={transport} onValueChange={(v) => setTransport(v as 'tcp' | 'udp')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cam-interval">Check Interval (s)</Label>
                <Input
                  id="cam-interval"
                  type="number"
                  min={10}
                  value={analysisInterval}
                  onChange={(e) => setAnalysisInterval(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cam-user">Username</Label>
                <Input
                  id="cam-user"
                  placeholder="Optional"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cam-pass">Password</Label>
                <Input
                  id="cam-pass"
                  type="password"
                  placeholder="Optional"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">Include in monitoring loop</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Adding…' : 'Add Camera'}
            </Button>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
