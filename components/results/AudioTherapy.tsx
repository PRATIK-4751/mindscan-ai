"use client";
import { useEffect, useState, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import ReactPlayer from 'react-player';

export default function AudioTherapy({ riskLevel }: { riskLevel: string }) {
  const [tracks, setTracks] = useState<{videoId: string, title: string}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<ReactPlayer>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);

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
    if (!progressRef.current || !playerRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    if (percent < 0) percent = 0;
    if (percent > 1) percent = 1;
    setProgress(percent);
    if (apply) {
      playerRef.current.seekTo(percent, "fraction");
    }
  };

  const handleProgress = (state: { played: number, playedSeconds: number }) => {
    if (!isSeeking) {
      setProgress(state.played);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (tracks.length === 0) return null;
  const currentTrack = tracks[currentIndex];
  
  // Custom images mapped to tracks
  const customImages = [
    "/covers/1.jpg", 
    "/covers/2.jpg", 
    "/covers/3.jpg"
  ];
  const thumbnailUrl = customImages[currentIndex % customImages.length];

  return (
    <div 
      className="relative mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl transition-all duration-500 hover:border-white/20"
      onMouseUp={(e: any) => isSeeking && handleSeekMouseUp(e)}
      onMouseLeave={(e: any) => isSeeking && handleSeekMouseUp(e)}
    >
      <div 
        className="absolute inset-0 opacity-30 blur-3xl saturate-150 transition-all duration-1000"
        style={{ backgroundImage: `url(${thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div className="relative z-10 flex flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--amber-gold)]">
            MindScan AI Therapist
          </span>
          <Volume2 size={16} className="text-white/40 hover:text-white transition-colors cursor-pointer" />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl shadow-2xl sm:h-32 sm:w-32">
            <img 
              src={thumbnailUrl} 
              alt="Cover Art" 
              className={`h-full w-full object-cover transition-transform duration-1000 ${isPlaying ? 'scale-110' : 'scale-100'}`}
            />
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="flex items-end gap-1 h-6">
                  <span className="w-1.5 h-full bg-[var(--cream)] animate-[bounce_1s_infinite]"></span>
                  <span className="w-1.5 h-3/4 bg-[var(--cream)] animate-[bounce_1.2s_infinite]"></span>
                  <span className="w-1.5 h-full bg-[var(--cream)] animate-[bounce_0.8s_infinite]"></span>
                  <span className="w-1.5 h-1/2 bg-[var(--cream)] animate-[bounce_1.1s_infinite]"></span>
                </div>
              </div>
            )}
          </div>

          <div className="flex w-full flex-col justify-center">
            {/* Title & subtitle removed entirely as requested */}

            <div className="mt-2 flex flex-col items-center sm:items-start w-full">
              <button 
                onClick={togglePlay}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95 mb-6"
              >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
              
              {/* Seek Bar */}
              <div className="flex items-center gap-3 w-full max-w-md">
                <span className="font-mono text-[10px] text-white/40 w-8 text-right">
                  {formatTime(progress * duration)}
                </span>
                <div 
                  ref={progressRef}
                  onMouseDown={handleSeekMouseDown}
                  onMouseMove={handleSeekMouseMove}
                  className="relative h-3 w-full overflow-hidden rounded-full bg-white/10 cursor-pointer group"
                >
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-[var(--amber-gold)] to-[var(--rust)] transition-all duration-75 group-hover:from-[var(--cream)] group-hover:to-[var(--amber-gold)]"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-white/40 w-8">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden">
        <ReactPlayer 
          ref={playerRef}
          url={`https://www.youtube.com/watch?v=${currentTrack.videoId}`}
          playing={isPlaying}
          controls={false}
          onProgress={handleProgress}
          onDuration={(d) => setDuration(d)}
          width="0"
          height="0"
          config={{
            youtube: {
              playerVars: { showinfo: 0, modestbranding: 1 }
            }
          }}
        />
      </div>
    </div>
  );
}
