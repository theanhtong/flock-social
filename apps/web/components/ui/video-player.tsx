'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, Settings, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoQualityOption {
  index: number;
  label: string;
  height: number;
}

export interface VideoPlayerProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'poster' | 'src'> {
  src?: string | null;
  hlsUrl?: string | null;
  poster?: string | null;
  status?: 'pending' | 'processing' | 'ready' | 'failed' | string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  hlsUrl,
  poster,
  status = 'ready',
  className,
  controls = true,
  autoPlay = false,
  muted = false,
  ...props
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isHlsActive, setIsHlsActive] = useState(false);
  const [isError, setIsError] = useState(false);
  const [levels, setLevels] = useState<VideoQualityOption[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(-1); // -1 = Auto
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    setIsError(false);
    setIsHlsActive(false);
    setLevels([]);
    setSelectedLevel(-1);

    const streamUrl = hlsUrl || (src?.endsWith('.m3u8') ? src : null);

    if (streamUrl) {
      if (Hls.isSupported()) {
        hls = new Hls({
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          backBufferLength: 90,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          setIsHlsActive(true);
          const parsedLevels: VideoQualityOption[] = data.levels.map((lvl, idx) => ({
            index: idx,
            label: lvl.height ? `${lvl.height}p` : `Option ${idx + 1}`,
            height: lvl.height || 0,
          }));
          setLevels(parsedLevels);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                hls?.destroy();
                setIsHlsActive(false);
                if (src && video.src !== src) {
                  video.src = src;
                }
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        if (video.src !== streamUrl) {
          video.src = streamUrl;
        }
        setIsHlsActive(true);
      } else if (src && video.src !== src) {
        video.src = src;
      }
    } else if (src && video.src !== src) {
      video.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, src]);

  const handleSelectQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setSelectedLevel(levelIndex);
    }
    setIsMenuOpen(false);
  };

  const isProcessing = (status === 'pending' || status === 'processing') && !hlsUrl && !src;
  const isFailed = status === 'failed';

  const currentQualityLabel =
    selectedLevel === -1
      ? 'Auto'
      : levels.find((l) => l.index === selectedLevel)?.label || 'Auto';

  return (
    <div className={cn("relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group", className)}>
      <video
        ref={videoRef}
        poster={poster || undefined}
        controls={controls && !isProcessing && !isFailed}
        autoPlay={autoPlay}
        muted={muted}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          const mediaError = (e.target as HTMLVideoElement)?.error;
          if (mediaError && mediaError.code === 1) {
            return;
          }
          if (!isProcessing) {
            setIsError(true);
          }
        }}
        className="w-full h-full object-cover rounded-xl bg-slate-950 bg-black"
        {...props}
      />

      {/* Processing Badge */}
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10">
          <Loader2 className="w-7 h-7 text-amber-400 animate-spin mb-2" />
          <span className="text-xs font-semibold text-amber-300">Initializing Video...</span>
        </div>
      )}

      {/* Failed Badge */}
      {(isFailed || isError) && !isProcessing && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-rose-950/90 text-rose-300 text-[11px] px-2 py-1 rounded border border-rose-800/60 pointer-events-none">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Playback error</span>
        </div>
      )}

      {/* HLS Quality Selector Menu */}
      {isHlsActive && !isProcessing && (
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg backdrop-blur transition-all cursor-pointer"
            title="HLS Video Quality Settings"
          >
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentQualityLabel}</span>
          </button>

          {/* Quality Options Dropdown */}
          {isMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 w-32 bg-slate-900/95 border border-slate-800 rounded-md shadow-2xl py-1 text-slate-200 text-xs backdrop-blur z-30 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800/80 tracking-wider">
                Resolution
              </div>

              <button
                type="button"
                onClick={() => handleSelectQuality(-1)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors',
                  selectedLevel === -1 && 'text-blue-400 font-semibold bg-blue-950/40'
                )}
              >
                <span>Auto</span>
                {selectedLevel === -1 && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>

              {levels.map((lvl) => (
                <button
                  key={lvl.index}
                  type="button"
                  onClick={() => handleSelectQuality(lvl.index)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors',
                    selectedLevel === lvl.index && 'text-blue-400 font-semibold bg-blue-950/40'
                  )}
                >
                  <span>{lvl.label}</span>
                  {selectedLevel === lvl.index && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
