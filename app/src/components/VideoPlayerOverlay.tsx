import { useRef } from 'react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Download, X } from 'lucide-react';
import type { RemotionVideo } from '../types';

interface Props {
  videoId: string;
  videoUrl: string | null;
  videos: RemotionVideo[];
  onClose: () => void;
  onDownload: () => void;
}

export function VideoPlayerOverlay({ videoId, videoUrl, videos, onClose, onDownload }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = videos.find((v) => v.id === videoId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-3xl px-4"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="absolute -top-10 right-4 flex items-center gap-1">
          {videoUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onDownload}
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        <p className="mb-2 text-sm font-medium text-white">{video?.name}</p>
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            muted
            playsInline
            onPlay={() => {
              if (videoRef.current) videoRef.current.muted = false;
            }}
            className="w-full rounded-lg"
          >
            <track kind="captions" />
          </video>
        ) : null}
      </div>
    </div>
  );
}
