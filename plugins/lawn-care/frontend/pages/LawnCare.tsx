import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCrudMutation } from '@devbot/app/hooks/useCrudMutation';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@allsetlabs/reusable/components/ui/dropdown-menu';
import {
  Menu,
  Leaf,
  Settings,
  RefreshCw,
  Loader2,
  DollarSign,
  Ruler,
  Droplets,
  Sun,
  AlertTriangle,
  Sprout,
  MapPin,
  Trash2,
  MessageCircle,
  ChevronDown,
  ExternalLink,
  ShoppingCart,
  Camera,
  Download,
  Copy,
} from 'lucide-react';
import { lawnCareApi } from '../api';
import { copyToClipboard } from '@devbot/app/lib/clipboard';
import { SlideNav } from '@devbot/app/components/SlideNav';
import { WeatherDashboard } from '@devbot/app/components/WeatherDashboard';
import type {
  LawnProfile,
  LawnPlan,
  LawnPlanData,
  LawnApplication,
  CreateLawnProfileRequest,
  ApplicationMethod,
} from '../types';

const GRASS_TYPES = [
  'Bermuda',
  'Fescue (Tall)',
  'Fescue (Fine)',
  'Kentucky Bluegrass',
  'Zoysia',
  'St. Augustine',
  'Ryegrass',
  'Buffalo',
  'Centipede',
  'Bahia',
];

function ApplicationCard({
  app,
  expanded,
  onToggle,
}: {
  app: LawnApplication;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      {/* Header - always visible, clickable */}
      <Button
        variant="ghost"
        onClick={onToggle}
        className="bg-primary/5 flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          {app.order}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground font-semibold">{app.name}</p>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>{app.date}</span>
            <span>·</span>
            <span>${(app.applicationCost ?? 0).toFixed(2)}</span>
          </div>
        </div>
        <ChevronDown
          className={`text-muted-foreground h-5 w-5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </Button>

      {/* Collapsible details */}
      {expanded && (
        <Fragment>
          {/* Description */}
          <div className="border-border border-t px-4 py-3">
            <p className="text-foreground text-sm">{app.description}</p>
          </div>

          {/* Product & Cost */}
          <div className="border-border border-t px-4 py-3">
            <div className="flex items-start gap-2">
              <Sprout className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="text-foreground text-sm font-medium">{app.product}</p>
                {app.store && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    <ShoppingCart className="mr-1 inline h-3 w-3" />
                    {app.store}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <DollarSign className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground text-sm">
                    ${(app.applicationCost ?? 0).toFixed(2)}
                    {app.productCovers > 1 && (
                      <span className="ml-1 text-xs">
                        (product: ${(app.productPrice ?? 0).toFixed(2)} / {app.productCovers} apps)
                      </span>
                    )}
                  </span>
                </div>
                {app.productUrl && (
                  <a
                    href={app.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary/10 text-primary mt-2 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {app.store || 'Open in Store'}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* How to Apply */}
          <div className="border-border space-y-2 border-t px-4 py-3">
            <div className="flex items-start gap-2">
              <Ruler className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">Amount</p>
                <p className="text-foreground text-sm">{app.amount}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Settings className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Spreader Setting
                </p>
                <p className="text-foreground text-sm">{app.howToApply}</p>
              </div>
            </div>
            {app.walkingPace && (
              <div className="flex items-start gap-2">
                <Sprout className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">
                    Walking Pace
                  </p>
                  <p className="text-foreground text-sm">{app.walkingPace}</p>
                </div>
              </div>
            )}
            {app.overlap && (
              <div className="flex items-start gap-2">
                <Leaf className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">Overlap</p>
                  <p className="text-foreground text-sm">{app.overlap}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tips, Watering, Warnings */}
          <div className="border-border space-y-2 border-t px-4 py-3">
            {app.tips && (
              <div className="flex items-start gap-2">
                <Sun className="text-warning mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-foreground text-sm">{app.tips}</p>
              </div>
            )}
            {app.watering && (
              <div className="flex items-start gap-2">
                <Droplets className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-foreground text-sm">{app.watering}</p>
              </div>
            )}
            {app.warnings && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-foreground text-sm">{app.warnings}</p>
              </div>
            )}
          </div>
        </Fragment>
      )}
    </div>
  );
}

export function LawnCare() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [navOpen, setNavOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Profile form state
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formGrassType, setFormGrassType] = useState('');
  const [formSqft, setFormSqft] = useState('');
  const [formApplicationMethod, setFormApplicationMethod] = useState<ApplicationMethod | ''>('');
  const [formEquipmentModel, setFormEquipmentModel] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  // Profiles query
  const profilesQuery = useQuery({
    queryKey: ['lawn-profiles'],
    queryFn: () => lawnCareApi.listLawnProfiles(),
  });

  const profile: LawnProfile | null = profilesQuery.data?.[0] ?? null;
  const profileId = profile?.id;

  // Plans query — only enabled when we have a profile
  const plansQuery = useQuery({
    queryKey: ['lawn-plans', profileId],
    queryFn: () => lawnCareApi.listLawnPlans(profileId!),
    enabled: !!profileId,
  });

  const plan: LawnPlan | null = plansQuery.data?.[0] ?? null;

  const loading = profilesQuery.isLoading;

  const populateForm = useCallback((p: LawnProfile | null) => {
    setFormAddress(p?.address || '');
    setFormCity(p?.city || '');
    setFormState(p?.state || '');
    setFormZip(p?.zipCode || '');
    setFormGrassType(p?.grassType || '');
    setFormSqft(p?.sqft ? String(p.sqft) : '');
    setFormApplicationMethod(p?.applicationMethod || '');
    setFormEquipmentModel(p?.equipmentModel || '');
    setFormNotes(p?.notes || '');
  }, []);

  const createProfileMutation = useCrudMutation(
    (data: CreateLawnProfileRequest) => lawnCareApi.createLawnProfile(data),
    [['lawn-profiles']]
  );

  const updateProfileMutation = useCrudMutation(
    ({ id, data }: { id: string; data: CreateLawnProfileRequest }) =>
      lawnCareApi.updateLawnProfile(id, data),
    [['lawn-profiles']]
  );

  const deleteProfileMutation = useCrudMutation(
    (id: string) => lawnCareApi.deleteLawnProfile(id),
    [['lawn-profiles'], ['lawn-plans']]
  );

  const generatePlanMutation = useMutation({
    mutationFn: (pid: string) => lawnCareApi.generateLawnPlan(pid),
    onSuccess: (newPlan) => {
      queryClient.setQueryData(['lawn-plans', profileId], [newPlan]);
    },
  });

  // Derive generating and saving states from mutations and server data
  const generating = generatePlanMutation.isPending || plan?.status === 'generating';
  const saving = createProfileMutation.isPending || updateProfileMutation.isPending;

  // Generation status polling — only active while plan is generating
  const statusQuery = useQuery({
    queryKey: ['lawn-plan-status', plan?.id],
    queryFn: () => lawnCareApi.getLawnPlanStatus(plan!.id),
    enabled: !!plan?.id && plan?.status === 'generating',
    refetchInterval: plan?.status === 'generating' ? 3000 : false,
  });

  // When polling detects the plan is no longer generating, refresh plan + profile data
  useEffect(() => {
    if (plan?.status !== 'generating') return;
    const status = statusQuery.data?.status;
    if (status && status !== 'generating') {
      void queryClient.invalidateQueries({ queryKey: ['lawn-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['lawn-profiles'] });
    }
  }, [statusQuery.data?.status, plan?.status, queryClient]);

  const handleSaveProfile = async () => {
    if (!formAddress.trim() || !formGrassType.trim()) return;

    try {
      const data: CreateLawnProfileRequest = {
        address: formAddress.trim(),
        city: formCity.trim() || null,
        state: formState.trim() || null,
        zipCode: formZip.trim() || null,
        grassType: formGrassType.trim(),
        sqft: formSqft ? parseInt(formSqft, 10) : null,
        applicationMethod: formApplicationMethod || null,
        equipmentModel: formEquipmentModel.trim() || null,
        notes: formNotes.trim() || null,
      };

      let savedProfile: LawnProfile;
      if (profile) {
        savedProfile = await updateProfileMutation.mutateAsync({ id: profile.id, data });
      } else {
        savedProfile = await createProfileMutation.mutateAsync(data);
      }

      setDrawerOpen(false);

      // Auto-generate plan for new profiles
      if (!profile) {
        generatePlanMutation.mutate(savedProfile.id);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const handleGeneratePlan = (overrideProfileId?: string) => {
    const pid = overrideProfileId || profileId;
    if (!pid) return;

    generatePlanMutation.mutate(pid);
  };

  const handleDeleteProfile = () => {
    if (!profile) return;
    setDrawerOpen(false);
    deleteProfileMutation.mutate(profile.id);
  };

  const planData: LawnPlanData | null =
    plan?.status === 'completed' && plan.planData ? (plan.planData as LawnPlanData) : null;

  const buildPlanText = (): string => {
    if (!profile || !planData) return '';

    const year = plan?.generatedAt
      ? new Date(plan.generatedAt).getFullYear()
      : new Date().getFullYear();
    const lines: string[] = [];

    lines.push(`🌱 LAWN CARE PLAN – ${year}`);
    lines.push('');

    // Property Overview
    lines.push('📍 Property Overview');
    const addressParts = [profile.address, profile.city, profile.state, profile.zipCode].filter(
      Boolean
    );
    lines.push(`Address: ${addressParts.join(', ')}`);
    lines.push(`Grass Type: ${profile.grassType}`);
    if (profile.sqft) lines.push(`Lawn Size: ${profile.sqft.toLocaleString()} sq ft`);
    if (profile.sunExposure) lines.push(`Sun Exposure: ${profile.sunExposure.replace(/_/g, ' ')}`);
    if (profile.equipmentModel) lines.push(`Equipment: ${profile.equipmentModel}`);
    else if (profile.applicationMethod)
      lines.push(`Application Method: ${profile.applicationMethod}`);
    lines.push('');

    // Key Conditions (notes)
    if (profile.notes) {
      lines.push('⚠️ Key Lawn Conditions');
      lines.push(profile.notes);
      lines.push('');
    }

    // Plan Summary
    lines.push('📊 Plan Summary');
    if (profile.climateZone) lines.push(`Zone: ${profile.climateZone}`);
    lines.push(`Applications: ${planData.applications.length} per year`);
    if (planData.totalCost > 0) lines.push(`Total Cost: $${planData.totalCost.toFixed(2)}`);
    if (planData.store) lines.push(`Store: ${planData.store}`);
    lines.push('');

    // Applications
    lines.push('📅 APPLICATION SCHEDULE');

    const seasonEmoji = (order: number) => {
      const emojis = ['🌿', '🌱', '☀️', '🍂', '❄️'];
      return emojis[(order - 1) % emojis.length];
    };

    const sorted = [...planData.applications].sort((a, b) => a.order - b.order);
    for (const app of sorted) {
      lines.push('');
      lines.push(`${seasonEmoji(app.order)} Application ${app.order} — ${app.name}`);
      lines.push('');
      lines.push(`📆 ${app.date} | 💰 $${(app.applicationCost ?? 0).toFixed(2)}`);
      lines.push('');

      // Purpose / description
      lines.push('🎯 Purpose');
      for (const sentence of app.description
        .split(/[.\n]/)
        .map((s) => s.trim())
        .filter(Boolean)) {
        lines.push(`- ${sentence}`);
      }
      lines.push('');

      // Product
      lines.push('🧪 Product');
      lines.push(`- ${app.product}`);
      if (app.store) lines.push(`- Available at: ${app.store}`);
      if (app.productPrice) {
        const priceNote =
          app.productCovers > 1
            ? ` (product: $${app.productPrice.toFixed(2)} / ${app.productCovers} apps)`
            : ` ($${app.productPrice.toFixed(2)})`;
        lines.push(
          `- Price per application: $${(app.applicationCost ?? 0).toFixed(2)}${priceNote}`
        );
      }
      if (app.productUrl) lines.push(`- URL: ${app.productUrl}`);
      lines.push('');

      // How to Apply
      lines.push('⚙️ Application');
      lines.push(`- Amount: ${app.amount}`);
      lines.push(`- Spreader: ${app.howToApply}`);
      if (app.walkingPace) lines.push(`- Walking Pace: ${app.walkingPace}`);
      if (app.overlap) lines.push(`- Overlap: ${app.overlap}`);
      lines.push('');

      // Watering
      if (app.watering) {
        lines.push('💧 Watering');
        lines.push(`- ${app.watering}`);
        lines.push('');
      }

      // Tips + Warnings
      const hasNotes = app.tips || app.warnings;
      if (hasNotes) {
        lines.push('⚠️ Notes');
        if (app.tips) {
          for (const tip of app.tips
            .split(/[.\n]/)
            .map((s) => s.trim())
            .filter(Boolean)) {
            lines.push(`- ${tip}`);
          }
        }
        if (app.warnings) {
          for (const warn of app.warnings
            .split(/[.\n]/)
            .map((s) => s.trim())
            .filter(Boolean)) {
            lines.push(`- ${warn}`);
          }
        }
        lines.push('');
      }

      lines.push('─'.repeat(48));
    }

    // Quick Checklist
    lines.push('✅ Quick Checklist');
    for (const app of sorted) {
      lines.push(`☐ ${app.name} (${app.date})`);
    }
    lines.push('');
    lines.push(
      `Plan generated on: ${plan?.generatedAt ? new Date(plan.generatedAt).toLocaleDateString() : 'unknown date'}`
    );

    return lines.join('\n');
  };

  const handleDownloadPlan = () => {
    if (!profile || !planData) return;
    const content = buildPlanText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lawn-care-plan-${profile.address.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPlan = () => {
    copyToClipboard(buildPlanText());
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      {/* Header */}
      <div className="safe-area-top border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Leaf className="text-primary h-5 w-5" />
          <h1 className="text-foreground text-lg font-semibold">Lawn Care</h1>
        </div>
        {profile && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/lawn-care/photos')}>
              <Camera className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                populateForm(profile);
                setDrawerOpen(true);
              }}
            >
              <Settings className="h-5 w-5" />
            </Button>
            {!generating && plan?.status === 'completed' && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Download className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadPlan}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyPlan}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={() => handleGeneratePlan()}>
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* No Profile - Setup Form */}
        {!profile && (
          <div className="p-4">
            <div className="mb-6 text-center">
              <Leaf className="text-primary mx-auto mb-3 h-12 w-12" />
              <h2 className="text-foreground text-xl font-semibold">Set Up Your Lawn</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Enter your details and we&apos;ll create a personalized care plan
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Street Address *</p>
                <Input
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <p className="text-foreground mb-1 text-sm font-medium">City</p>
                  <Input
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="col-span-1">
                  <p className="text-foreground mb-1 text-sm font-medium">State</p>
                  <Input
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    placeholder="TX"
                  />
                </div>
                <div className="col-span-1">
                  <p className="text-foreground mb-1 text-sm font-medium">Zip</p>
                  <Input
                    value={formZip}
                    onChange={(e) => setFormZip(e.target.value)}
                    placeholder="75001"
                  />
                </div>
              </div>

              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Grass Type *</p>
                <div className="flex flex-wrap gap-2">
                  {GRASS_TYPES.map((type) => (
                    <Button
                      key={type}
                      variant={formGrassType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormGrassType(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Lawn Size (sqft)</p>
                <Input
                  type="number"
                  value={formSqft}
                  onChange={(e) => setFormSqft(e.target.value)}
                  placeholder="Leave blank — we'll look it up"
                />
              </div>

              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Application Method</p>
                <div className="flex gap-2">
                  <Button
                    variant={formApplicationMethod === 'spreader' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormApplicationMethod('spreader')}
                  >
                    Spreader
                  </Button>
                  <Button
                    variant={formApplicationMethod === 'sprayer' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormApplicationMethod('sprayer')}
                  >
                    Sprayer
                  </Button>
                </div>
              </div>

              {formApplicationMethod && (
                <div>
                  <p className="text-foreground mb-1 text-sm font-medium">
                    Your {formApplicationMethod === 'spreader' ? 'Spreader' : 'Sprayer'} Model
                  </p>
                  <Input
                    value={formEquipmentModel}
                    onChange={(e) => setFormEquipmentModel(e.target.value)}
                    placeholder={
                      formApplicationMethod === 'spreader'
                        ? 'e.g., Sta-Green broadcast spreader'
                        : 'e.g., Chapin 20V backpack sprayer'
                    }
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    We&apos;ll use this to provide specific settings for your equipment
                  </p>
                </div>
              )}

              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Notes</p>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Shady backyard, slopes on south side, etc."
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                disabled={!formAddress.trim() || !formGrassType.trim() || saving}
                onClick={handleSaveProfile}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sprout className="mr-2 h-4 w-4" />
                    Generate My Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Generating State */}
        {profile && generating && (
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
            <h2 className="text-foreground text-lg font-semibold">Researching Your Lawn...</h2>
            <p className="text-muted-foreground mt-2 text-center text-sm">
              Claude is looking up your property, climate zone, and finding the best products for
              your {profile.grassType} lawn.
            </p>
            <p className="text-muted-foreground mt-1 text-center text-xs">
              This may take a few minutes
            </p>
            {plan?.chatId && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate(`/chat/${plan.chatId}`)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                View Chat
              </Button>
            )}
          </div>
        )}

        {/* Failed State */}
        {profile && !generating && plan?.status === 'failed' && (
          <div className="flex flex-col items-center justify-center p-8">
            <AlertTriangle className="text-destructive mb-4 h-12 w-12" />
            <h2 className="text-foreground text-lg font-semibold">Plan Generation Failed</h2>
            <p className="text-muted-foreground mt-2 text-center text-sm">
              {plan.errorMessage || 'Something went wrong. Please try again.'}
            </p>
            <Button className="mt-4" onClick={() => handleGeneratePlan()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* Plan Display */}
        {profile && !generating && planData && (
          <div className="p-4">
            {/* Weather Dashboard */}
            {profile.zipCode && (
              <WeatherDashboard
                zipCode={profile.zipCode}
                grassType={profile.grassType}
                locationName={[profile.city, profile.state].filter(Boolean).join(', ') || undefined}
              />
            )}

            {/* Summary Header */}
            <div className="border-border bg-card mb-4 rounded-xl border p-4">
              <p className="text-foreground text-sm">{planData.summary}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {profile.sqft && (
                  <div className="text-muted-foreground flex items-center gap-1 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{profile.sqft.toLocaleString()} sqft</span>
                  </div>
                )}
                {profile.climateZone && (
                  <div className="text-muted-foreground flex items-center gap-1 text-sm">
                    <Sun className="h-3.5 w-3.5" />
                    <span>Zone {profile.climateZone}</span>
                  </div>
                )}
                <div className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Leaf className="h-3.5 w-3.5" />
                  <span>{profile.grassType}</span>
                </div>
                {planData.totalCost > 0 && (
                  <div className="text-primary flex items-center gap-1 text-sm font-medium">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>${planData.totalCost.toFixed(2)} / year</span>
                  </div>
                )}
              </div>
            </div>

            {/* Application Cards */}
            <div className="space-y-3">
              {planData.applications
                .sort((a, b) => a.order - b.order)
                .map((app) => (
                  <ApplicationCard
                    key={app.order}
                    app={app}
                    expanded={expandedCards.has(app.order)}
                    onToggle={() =>
                      setExpandedCards((prev) => {
                        const next = new Set(prev);
                        if (next.has(app.order)) next.delete(app.order);
                        else next.add(app.order);
                        return next;
                      })
                    }
                  />
                ))}
            </div>

            {/* Footer */}
            <p className="text-muted-foreground mt-4 text-center text-xs">
              Plan generated on{' '}
              {plan?.generatedAt ? new Date(plan.generatedAt).toLocaleDateString() : 'unknown date'}
            </p>
          </div>
        )}

        {/* Profile exists but no plan yet and not generating */}
        {profile && !generating && !plan && (
          <div className="flex flex-col items-center justify-center p-8">
            <Leaf className="text-muted-foreground mb-4 h-12 w-12" />
            <h2 className="text-foreground text-lg font-semibold">No Plan Yet</h2>
            <p className="text-muted-foreground mt-2 text-center text-sm">
              Generate a personalized lawn care plan for your {profile.grassType} lawn.
            </p>
            <Button className="mt-4" onClick={() => handleGeneratePlan()}>
              <Sprout className="mr-2 h-4 w-4" />
              Generate Plan
            </Button>
          </div>
        )}
      </div>

      {/* Edit Profile Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Lawn Profile</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[70vh] overflow-y-auto px-4 pb-8">
            <div className="space-y-4">
              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Street Address *</p>
                <Input
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <p className="text-foreground mb-1 text-sm font-medium">City</p>
                  <Input
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="col-span-1">
                  <p className="text-foreground mb-1 text-sm font-medium">State</p>
                  <Input
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    placeholder="TX"
                  />
                </div>
                <div className="col-span-1">
                  <p className="text-foreground mb-1 text-sm font-medium">Zip</p>
                  <Input
                    value={formZip}
                    onChange={(e) => setFormZip(e.target.value)}
                    placeholder="75001"
                  />
                </div>
              </div>

              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Grass Type *</p>
                <div className="flex flex-wrap gap-2">
                  {GRASS_TYPES.map((type) => (
                    <Button
                      key={type}
                      variant={formGrassType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormGrassType(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Lawn Size (sqft)</p>
                <Input
                  type="number"
                  value={formSqft}
                  onChange={(e) => setFormSqft(e.target.value)}
                  placeholder="Leave blank — we'll look it up"
                />
              </div>

              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Application Method</p>
                <div className="flex gap-2">
                  <Button
                    variant={formApplicationMethod === 'spreader' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormApplicationMethod('spreader')}
                  >
                    Spreader
                  </Button>
                  <Button
                    variant={formApplicationMethod === 'sprayer' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormApplicationMethod('sprayer')}
                  >
                    Sprayer
                  </Button>
                </div>
              </div>

              {formApplicationMethod && (
                <div>
                  <p className="text-foreground mb-1 text-sm font-medium">
                    Your {formApplicationMethod === 'spreader' ? 'Spreader' : 'Sprayer'} Model
                  </p>
                  <Input
                    value={formEquipmentModel}
                    onChange={(e) => setFormEquipmentModel(e.target.value)}
                    placeholder={
                      formApplicationMethod === 'spreader'
                        ? 'e.g., Sta-Green broadcast spreader'
                        : 'e.g., Chapin 20V backpack sprayer'
                    }
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    We&apos;ll use this to provide specific settings for your equipment
                  </p>
                </div>
              )}

              <div>
                <p className="text-foreground mb-1 text-sm font-medium">Notes</p>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Shady backyard, slopes on south side, etc."
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                disabled={!formAddress.trim() || !formGrassType.trim() || saving}
                onClick={handleSaveProfile}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>

              <Button variant="destructive" className="w-full" onClick={handleDeleteProfile}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Profile
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
