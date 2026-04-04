import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { chatHooks } from '../hooks/useChat';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { DataFetchWrapper } from '@allsetlabs/reusable/components/DataFetchWrapper';
import { Plus, RefreshCw, Video, Menu } from 'lucide-react';
import { api } from '../lib/api';
import { SlideNav } from '../components/SlideNav';
import { RemotionVideoListItem } from '../components/RemotionVideoListItem';
import { VideoPlayerOverlay } from '../components/VideoPlayerOverlay';

const REMOTION_SYSTEM_PROMPT = `You are a Remotion video creator assistant. You work with the Remotion project located at modules/devbot/intro-video/.

## Project Structure
- Root composition: src/Root.tsx (registers compositions with Remotion)
- Main video: src/DevBotIntro.tsx (combines scenes with transitions)
- Scenes: src/scenes/ (LogoReveal, ThreePillars, ArchitectureFlow, FeatureHighlights, Closing)
- Components: src/components/ (GlowEffect, Icon)
- Constants: src/lib/constants.ts (colors, video settings, scene durations)

## Design System
- Background: #0f0f1a, Primary: #e8913a, Surface: #1a1a2e, Text: #f0f0f0
- Resolution: 1920x1080, FPS: 30
- Uses spring animations, interpolate for timing, TransitionSeries for scene transitions

## How to Create/Edit Videos
1. Create or modify scene components in src/scenes/
2. Register scenes in the main composition (DevBotIntro.tsx or a new composition)
3. Update Root.tsx if adding new compositions
4. Use constants from src/lib/constants.ts for consistent styling

## Rendering
- Preview: npm run dev (opens Remotion Studio)
- Render to MP4: npx remotion render <CompositionId> out/<filename>.mp4
- The output goes to modules/devbot/intro-video/out/

## Important
- Use React + Remotion APIs (useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill)
- All animations should use Remotion's interpolate() or spring() - no CSS animations
- Keep scene components modular and reusable

## CRITICAL: Video Completion Response
When you successfully render a video, you MUST output the following structured marker on its own line so the system can track it:

REMOTION_VIDEO_RESULT:{"name":"<descriptive video name>","videoPath":"modules/devbot/intro-video/out/<filename>.mp4"}

This marker MUST appear exactly as shown — the prefix REMOTION_VIDEO_RESULT: followed by valid JSON with "name" and "videoPath" fields. This is how the system knows the video was created successfully. Once detected, the chat will be automatically archived.

If the render fails, do NOT output this marker. Instead explain what went wrong.`;

export function RemotionVideos() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const {
    data: videos = [],
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['remotion-videos'],
    queryFn: () => api.listRemotionVideos(),
  });

  const createChatMutation = chatHooks.useCreateChat();
  const createMutation = useCrudMutation(
    async () => {
      const chat = await createChatMutation.mutateAsync({
        name: 'Remotion Video',
        systemPrompt: REMOTION_SYSTEM_PROMPT,
        type: 'remotion',
      });
      await api.createRemotionVideo({
        name: 'New Video',
        videoPath: '',
        chatId: chat.id,
      });
      return chat;
    },
    [['remotion-videos']],
    { onSuccess: (chat) => navigate(`/chat/${chat.id}`) }
  );

  const deleteMutation = useCrudMutation(
    (id: string) => api.deleteRemotionVideo(id),
    [['remotion-videos']]
  );

  const handlePlay = (videoId: string) => {
    setPlayingId(videoId);
    setVideoUrl(api.getRemotionVideoStreamUrl(videoId));
  };

  const handleClosePlayer = () => {
    setPlayingId(null);
    setVideoUrl(null);
  };

  const handleDownload = () => {
    if (!videoUrl || !playingId) return;
    const video = videos.find((v) => v.id === playingId);
    const filename = video?.videoPath.split('/').pop() ?? `${video?.name ?? 'video'}.mp4`;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = filename;
    a.click();
  };

  const error =
    fetchError instanceof Error
      ? fetchError.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : deleteMutation.error instanceof Error
          ? deleteMutation.error.message
          : null;

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Video className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Videos</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            {createMutation.isPending ? 'Creating...' : 'Create Video'}
          </Button>
        </div>
      </header>

      {error && (
        <div className="border-b border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <DataFetchWrapper
          isLoading={isLoading && videos.length === 0}
          error={null}
          isEmpty={videos.length === 0}
          emptyTitle="No Videos Yet"
          emptyMessage="Create a video using Remotion and Claude"
          emptyIcon={<Video className="h-16 w-16 text-muted-foreground/50" />}
          loadingMessage="Loading videos..."
        >
          <div className="divide-y divide-border">
            {videos.map((video) => (
              <RemotionVideoListItem
                key={video.id}
                video={video}
                onPlay={handlePlay}
                onEdit={(chatId) => navigate(`/chat/${chatId}`)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        </DataFetchWrapper>
      </main>

      {playingId && (
        <VideoPlayerOverlay
          videoId={playingId}
          videoUrl={videoUrl}
          videos={videos}
          onClose={handleClosePlayer}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
