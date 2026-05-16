"use client";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import ReactPlayer from "react-player";

interface SimpleYouTubeAudioProps {
  url: string;
  isPlaying: boolean;
  onEnded?: () => void;
  onProgress?: (state: any) => void;
  onDuration?: (duration: number) => void;
  onError?: (e: any) => void;
  volume?: number;
}

export interface SimpleYouTubeAudioRef {
  seekTo: (amount: number, type?: "seconds" | "fraction") => void;
}

const SimpleYouTubeAudio = forwardRef<SimpleYouTubeAudioRef, SimpleYouTubeAudioProps>(({ 
  url, 
  isPlaying, 
  onEnded, 
  onProgress, 
  onDuration, 
  onError,
  volume = 1 
}, ref) => {
  const [isMounted, setIsMounted] = useState(false);
  const playerRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (amount: number, type?: "seconds" | "fraction") => {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(amount, type);
      }
    }
  }));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const Player = ReactPlayer as any;

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
      <Player 
        ref={playerRef}
        url={url}
        playing={isPlaying}
        volume={volume}
        muted={false}
        controls={false}
        onEnded={onEnded}
        onProgress={onProgress}
        onDuration={onDuration}
        onReady={() => {
          if (isPlaying && playerRef.current) {
            // Fallback to force play if ready event fires after state change
            playerRef.current.getInternalPlayer()?.playVideo?.();
          }
        }}
        onError={onError}
        width="100%"
        height="100%"
        config={{
          youtube: {
            playerVars: { 
              playsinline: 1, 
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              origin: typeof window !== 'undefined' ? window.location.origin : '' 
            }
          }
        }}
      />
    </div>
  );
});

export default SimpleYouTubeAudio;
