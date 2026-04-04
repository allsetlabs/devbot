import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '@devbot/app/hooks/useCrudMutation';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Input } from '@allsetlabs/reusable/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import {
  Menu,
  Camera,
  ArrowLeft,
  Loader2,
  Trash2,
  X,
  Columns2,
  Plus,
  ImageIcon,
  Calendar,
  Tag,
} from 'lucide-react';
import { lawnCareApi, getPhotoUrl } from '../api';
import { SlideNav } from '@devbot/app/components/SlideNav';
import type { LawnPhoto, LawnApplication } from '../types';

// --- Photo Card ---
function PhotoCard({
  photo,
  applications,
  onSelect,
  selected,
  compareMode,
  onEdit,
}: {
  photo: LawnPhoto;
  applications: LawnApplication[];
  onSelect: () => void;
  selected: boolean;
  compareMode: boolean;
  onEdit: () => void;
}) {
  const linkedApp = photo.applicationOrder
    ? applications.find((a) => a.order === photo.applicationOrder)
    : null;

  return (
    <button
      onClick={compareMode ? onSelect : onEdit}
      className={`relative w-full overflow-hidden rounded-xl border text-left transition-all ${
        selected ? 'border-primary ring-primary/30 ring-2' : 'border-border hover:border-primary/40'
      }`}
    >
      <img
        src={getPhotoUrl(photo.fileUrl)}
        alt={photo.caption || 'Lawn photo'}
        className="aspect-[4/3] w-full object-cover"
        loading="lazy"
      />

      {/* Selection indicator for compare mode */}
      {compareMode && (
        <div
          className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-white bg-black/40 text-white'
          }`}
        >
          {selected && <span className="text-xs font-bold">&#10003;</span>}
        </div>
      )}

      {/* Photo info overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
        <p className="text-xs font-medium text-white">
          {new Date(photo.takenAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        {photo.caption && <p className="mt-0.5 truncate text-xs text-white/80">{photo.caption}</p>}
        {linkedApp && (
          <div className="bg-primary/80 text-primary-foreground mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium">
            <Tag className="h-2.5 w-2.5" />
            {linkedApp.name}
          </div>
        )}
      </div>
    </button>
  );
}

// --- Compare View ---
function CompareView({ photos, onClose }: { photos: [LawnPhoto, LawnPhoto]; onClose: () => void }) {
  const [before, after] =
    new Date(photos[0].takenAt) <= new Date(photos[1].takenAt)
      ? [photos[0], photos[1]]
      : [photos[1], photos[0]];

  const daysBetween = Math.round(
    (new Date(after.takenAt).getTime() - new Date(before.takenAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Columns2 className="text-primary h-5 w-5" />
          <h2 className="text-foreground font-semibold">Before & After</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Comparison */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-muted-foreground mb-1 text-center text-xs font-medium">BEFORE</p>
            <div className="border-border overflow-hidden rounded-xl border">
              <img
                src={getPhotoUrl(before.fileUrl)}
                alt="Before"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <p className="text-muted-foreground mt-1 text-center text-xs">
              {new Date(before.takenAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-center text-xs font-medium">AFTER</p>
            <div className="border-border overflow-hidden rounded-xl border">
              <img
                src={getPhotoUrl(after.fileUrl)}
                alt="After"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <p className="text-muted-foreground mt-1 text-center text-xs">
              {new Date(after.takenAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="bg-primary/5 mt-3 rounded-lg p-3 text-center">
          <p className="text-primary text-sm font-medium">{daysBetween} days apart</p>
          {before.caption && (
            <p className="text-muted-foreground mt-1 text-xs">Before: {before.caption}</p>
          )}
          {after.caption && (
            <p className="text-muted-foreground mt-0.5 text-xs">After: {after.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export function LawnPhotoJournal() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [navOpen, setNavOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<LawnPhoto | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch profile
  const profilesQuery = useQuery({
    queryKey: ['lawn-profiles'],
    queryFn: () => lawnCareApi.listLawnProfiles(),
  });
  const profile = profilesQuery.data?.[0] ?? null;

  // Fetch photos
  const photosQuery = useQuery({
    queryKey: ['lawn-photos', profile?.id],
    queryFn: () => lawnCareApi.listLawnPhotos(profile!.id),
    enabled: !!profile?.id,
  });
  const photos = photosQuery.data ?? [];

  // Fetch plan for application labels
  const plansQuery = useQuery({
    queryKey: ['lawn-plans', profile?.id],
    queryFn: () => lawnCareApi.listLawnPlans(profile!.id),
    enabled: !!profile?.id,
  });
  const plan = plansQuery.data?.[0] ?? null;
  const applications =
    plan?.status === 'completed' && plan.planData
      ? ((plan.planData as { applications: LawnApplication[] }).applications ?? [])
      : [];

  // Mutations
  const uploadMutation = useCrudMutation(
    (data: { profileId: string; photo: File }) => lawnCareApi.uploadLawnPhoto(data),
    [['lawn-photos']]
  );

  const updateMutation = useCrudMutation(
    ({ id, data }: { id: string; data: { caption?: string } }) =>
      lawnCareApi.updateLawnPhoto(id, data),
    [['lawn-photos']],
    { onSuccess: () => setEditingPhoto(null) }
  );

  const deleteMutation = useCrudMutation(
    (id: string) => lawnCareApi.deleteLawnPhoto(id),
    [['lawn-photos']],
    { onSuccess: () => setEditingPhoto(null) }
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadMutation.mutateAsync({
          profileId: profile.id,
          photo: files[i],
        });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleCompareSelection = (photoId: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(photoId)) return prev.filter((id) => id !== photoId);
      if (prev.length >= 2) return [prev[1], photoId];
      return [...prev, photoId];
    });
  };

  const openEdit = (photo: LawnPhoto) => {
    setEditingPhoto(photo);
    setEditCaption(photo.caption ?? '');
  };

  const handleSaveCaption = () => {
    if (!editingPhoto) return;
    updateMutation.mutate({
      id: editingPhoto.id,
      data: { caption: editCaption.trim() || undefined },
    });
  };

  // Compare photos resolved
  const comparePhotos =
    compareSelection.length === 2
      ? (compareSelection.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as [
          LawnPhoto,
          LawnPhoto,
        ])
      : null;

  // Show compare view
  if (comparePhotos) {
    return (
      <div className="flex h-full flex-col">
        <CompareView
          photos={comparePhotos}
          onClose={() => {
            setCompareSelection([]);
            setCompareMode(false);
          }}
        />
      </div>
    );
  }

  const loading = profilesQuery.isLoading || photosQuery.isLoading;

  // Group photos by month
  const photosByMonth = photos.reduce<Record<string, LawnPhoto[]>>((acc, photo) => {
    const d = new Date(photo.takenAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});

  const sortedMonths = Object.keys(photosByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex h-full flex-col">
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="safe-area-top border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/lawn-care')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Camera className="text-primary h-5 w-5" />
          <h1 className="text-foreground text-lg font-semibold">Photo Journal</h1>
        </div>
        <div className="flex items-center gap-1">
          {photos.length >= 2 && (
            <Button
              variant={compareMode ? 'default' : 'ghost'}
              size="icon"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareSelection([]);
              }}
            >
              <Columns2 className="h-5 w-5" />
            </Button>
          )}
          {profile && (
            <Button
              variant="ghost"
              size="icon"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Compare mode banner */}
      {compareMode && (
        <div className="bg-primary/10 flex items-center justify-between px-4 py-2">
          <p className="text-primary text-sm font-medium">
            Select 2 photos to compare ({compareSelection.length}/2)
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCompareMode(false);
              setCompareSelection([]);
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        )}

        {!loading && !profile && (
          <div className="flex flex-col items-center justify-center p-8">
            <ImageIcon className="text-muted-foreground mb-4 h-12 w-12" />
            <h2 className="text-foreground text-lg font-semibold">No Lawn Profile</h2>
            <p className="text-muted-foreground mt-2 text-center text-sm">
              Set up your lawn profile first to start tracking photos.
            </p>
            <Button className="mt-4" onClick={() => navigate('/lawn-care')}>
              Go to Lawn Care
            </Button>
          </div>
        )}

        {!loading && profile && photos.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8">
            <Camera className="text-muted-foreground mb-4 h-12 w-12" />
            <h2 className="text-foreground text-lg font-semibold">Start Your Photo Journal</h2>
            <p className="text-muted-foreground mt-2 text-center text-sm">
              Take photos of your lawn to track progress over time. Tap the + button to add your
              first photo.
            </p>
            <Button
              className="mt-4"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Add First Photo
                </>
              )}
            </Button>
          </div>
        )}

        {!loading && photos.length > 0 && (
          <div className="p-4">
            {sortedMonths.map((monthKey) => {
              const monthPhotos = photosByMonth[monthKey];
              const [year, month] = monthKey.split('-');
              const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
                undefined,
                { month: 'long', year: 'numeric' }
              );

              return (
                <div key={monthKey} className="mb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <h3 className="text-foreground text-sm font-semibold">{label}</h3>
                    <span className="text-muted-foreground text-xs">
                      ({monthPhotos.length} photo{monthPhotos.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {monthPhotos.map((photo) => (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        applications={applications}
                        onSelect={() => toggleCompareSelection(photo.id)}
                        selected={compareSelection.includes(photo.id)}
                        compareMode={compareMode}
                        onEdit={() => openEdit(photo)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Photo Drawer */}
      <Drawer open={!!editingPhoto} onOpenChange={(open) => !open && setEditingPhoto(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Photo Details</DrawerTitle>
          </DrawerHeader>
          {editingPhoto && (
            <div className="px-4 pb-8">
              <img
                src={getPhotoUrl(editingPhoto.fileUrl)}
                alt={editingPhoto.caption || 'Lawn photo'}
                className="mb-4 w-full rounded-xl object-cover"
              />

              <p className="text-muted-foreground mb-1 text-xs">
                Taken{' '}
                {new Date(editingPhoto.takenAt).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-foreground mb-1 text-sm font-medium">Caption</p>
                  <Input
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="Add a caption..."
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveCaption}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Caption'
                  )}
                </Button>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => deleteMutation.mutate(editingPhoto.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Photo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
