"use client";
import { useEffect, useState, useRef } from "react";
import { Play, Pause, Volume2, SkipBack, SkipForward, AlertCircle } from "lucide-react";
import ReactPlayer from 'react-player';

export default function AudioTherapy({ riskLevel }: { riskLevel: string }) {
  const [tracks, setTracks] = useState<{videoId: string, title: string}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [duration, setDuration] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let query = "relaxing meditation music";
    if (riskLevel === "High Risk" || riskLevel.includes("Silent Distress")) query = "binaural beats anxiety relief calm";
    if (riskLevel === "Medium Risk") query = "stress relief soft piano music";
    
    fetch(`/api/youtube?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => {
        if (d.tracks) setTracks(d.tracks);
      });
  }, [riskLevel]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const skipTrack = (direction: 1 | -1) => {
    if (tracks.length === 0) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex >= tracks.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = tracks.length - 1;
    setCurrentIndex(nextIndex);
    setProgress(0);
    setPlayerError(null);
    setIsPlaying(true);
  };

  const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsSeeking(true);
    updateSeek(e);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSeeking) {
      updateSeek(e);
    }
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsSeeking(false);
    updateSeek(e, true);
  };

  const updateSeek = (e: React.MouseEvent<HTMLDivElement>, apply: boolean = false) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    if (percent < 0) percent = 0;
    if (percent > 1) percent = 1;
    setProgress(percent);
    
    if (apply && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(percent, "fraction");
    }
  };

  const handleProgress = (state: any) => {
    if (!isSeeking) {
      setProgress(state.played);
    }
    setPlayerError(null);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (tracks.length === 0) return null;
  const currentTrack = tracks[currentIndex];
  
  // Custom user assets
  const customImages = [
    "/assets/album1.jpg", 
    "/assets/album2.jpg", 
    "/assets/album3.jpg"
  ];
  const thumbnailUrl = customImages[currentIndex % customImages.length];

  return (
    <div 
      className="relative mt-8 overflow-hidden border-2 border-white/20 bg-black shadow-[4px_4px_0px_rgba(255,255,255,0.1)] transition-all duration-500"
      onMouseUp={(e: any) => isSeeking && handleSeekMouseUp(e)}
      onMouseLeave={(e: any) => isSeeking && handleSeekMouseUp(e)}
    >
      <div 
        className="absolute inset-0 opacity-40 blur-xl saturate-150 transition-all duration-1000 z-0"
        style={{ backgroundImage: `url(${thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      
      <div className="absolute inset-0 bg-black/70 z-0" />

      {/* Retro scanlines effect */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50 z-10"></div>

      <div className="relative z-20 flex flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--amber-gold)]">
            AI.AUDIO.PLAYER.exe
          </span>
          <Volume2 size={16} className="text-white/40 hover:text-white transition-colors cursor-pointer" />
        </div>

        {playerError && (
          <div className="mb-4 flex items-center gap-2 rounded border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-200">
            <AlertCircle size={14} />
            <span>{playerError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          <div className="relative h-48 w-48 shrink-0 overflow-hidden border border-white/20 shadow-[2px_2px_0px_rgba(255,255,255,0.2)] bg-black p-1 sm:h-40 sm:w-40 z-30">
            <img 
              src={thumbnailUrl} 
              alt="Cover Art" 
              className={`relative z-10 h-full w-full object-cover transition-all duration-1000 ${isPlaying && !playerError ? 'scale-105 brightness-110' : 'scale-100 grayscale-[30%]'}`}
            />
            {isPlaying && !playerError && (
              <div className="absolute bottom-2 right-2 flex items-end gap-1 h-4 z-40">
                <span className="w-1 h-full bg-[var(--amber-gold)] animate-[bounce_0.8s_infinite]"></span>
                <span className="w-1 h-3/4 bg-[var(--amber-gold)] animate-[bounce_1.1s_infinite]"></span>
                <span className="w-1 h-full bg-[var(--amber-gold)] animate-[bounce_0.9s_infinite]"></span>
              </div>
            )}
          </div>

          <div className="flex w-full flex-col justify-center">
            <div className="flex flex-col items-center sm:items-start w-full">
              
              <div className="flex items-center gap-6 mb-8 z-30 relative">
                <button 
                  onClick={() => skipTrack(-1)}
                  className="text-white/60 transition-all hover:text-white active:scale-95"
                >
                  <SkipBack size={24} fill="currentColor" />
                </button>
                
                <button 
                  onClick={togglePlay}
                  className="flex h-16 w-16 items-center justify-center border-2 border-white bg-black/50 text-white transition-all hover:bg-white hover:text-black active:translate-y-1 shadow-[2px_2px_0px_rgba(255,255,255,0.5)]"
                >
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                  onClick={() => skipTrack(1)}
                  className="text-white/60 transition-all hover:text-white active:scale-95"
                >
                  <SkipForward size={24} fill="currentColor" />
                </button>
              </div>
              
              {/* Retro Seek Bar */}
              <div className="flex items-center gap-3 w-full max-w-md z-30 relative">
                <span className="font-mono text-[10px] text-white/60 w-8 text-right">
                  {formatTime(progress * duration)}
                </span>
                <div 
                  ref={progressRef}
                  onMouseDown={handleSeekMouseDown}
                  onMouseMove={handleSeekMouseMove}
                  className="relative h-4 w-full border border-white/20 bg-black cursor-pointer group"
                >
                  <div 
                    className="absolute left-0 top-0 h-full bg-[var(--amber-gold)] transition-all duration-75 group-hover:bg-[var(--cream)]"
                    style={{ width: `${progress * 100}%` }}
                  />
                  {/* Tape play head indicator */}
                  <div 
                    className="absolute top-[-2px] bottom-[-2px] w-1 bg-white"
                    style={{ left: `calc(${progress * 100}% - 2px)` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-white/60 w-8">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 w-full h-full z-[-1] overflow-hidden opacity-[0.01] pointer-events-none">
        {isMounted && (() => {
          const Player = ReactPlayer as any;
          return (
            <Player 
              ref={playerRef}
              url={`https://www.youtube.com/watch?v=${currentTrack.videoId}`}
              playing={isPlaying}
              controls={false}
              onProgress={handleProgress}
              onDuration={(d: number) => setDuration(d)}
              onError={(e: any) => {
                console.error("Player Error:", e);
                setPlayerError("YouTube blocked embedding for this specific audio track. Please skip to the next track.");
                setIsPlaying(false);
              }}
              width="100%"
              height="100%"
              config={{
                youtube: {
                  playerVars: { autoplay: 1, playsinline: 1, origin: typeof window !== 'undefined' ? window.location.origin : '' }
                }
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}
