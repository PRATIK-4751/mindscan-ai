"use client";
import { useEffect, useState, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, Repeat, Shuffle } from "lucide-react";

export default function AudioTherapy({ riskLevel }: { riskLevel: string }) {
  const [tracks, setTracks] = useState<{videoId: string, title: string}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Fake progress bar for visual effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 0.1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!iframeRef.current || tracks.length === 0) return;
    const msg = isPlaying ? '{"event":"command","func":"pauseVideo","args":""}' : '{"event":"command","func":"playVideo","args":""}';
    iframeRef.current.contentWindow?.postMessage(msg, '*');
    setIsPlaying(!isPlaying);
  };

  const skipTrack = (direction: 1 | -1) => {
    if (tracks.length === 0) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex >= tracks.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = tracks.length - 1;
    setCurrentIndex(nextIndex);
    setProgress(0);
    setIsPlaying(true);
  };

  if (tracks.length === 0) return null;
  const currentTrack = tracks[currentIndex];
  const thumbnailUrl = `https://img.youtube.com/vi/${currentTrack.videoId}/hqdefault.jpg`;

  return (
    <div className="relative mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl transition-all duration-500 hover:border-white/20">
      {/* Blurred Background Image (Samsung style) */}
      <div 
        className="absolute inset-0 opacity-30 blur-3xl saturate-150 transition-all duration-1000"
        style={{ backgroundImage: `url(${thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div className="relative z-10 flex flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--amber-gold)]">
            MindScan AI Therapist
          </span>
          <Volume2 size={16} className="text-white/40 hover:text-white transition-colors cursor-pointer" />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
          {/* Cover Art */}
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl shadow-2xl sm:h-24 sm:w-24">
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

          {/* Track Info & Controls */}
          <div className="flex w-full flex-col">
            <div className="text-center sm:text-left">
              <h4 className="font-display text-lg sm:text-xl text-white line-clamp-1">
                {currentTrack.title}
              </h4>
              <p className="font-body mt-1 text-sm text-white/50">
                Curated for {riskLevel}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 flex items-center gap-3">
              <span className="font-mono text-[10px] text-white/40">0:00</span>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[var(--amber-gold)] to-[var(--rust)] transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-white/40">-:-</span>
            </div>

            {/* Player Controls (Spotify style) */}
            <div className="mt-4 flex items-center justify-center sm:justify-between">
              <div className="hidden sm:flex items-center gap-4 text-white/40">
                <Shuffle size={18} className="hover:text-white cursor-pointer transition-colors" />
              </div>
              
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => skipTrack(-1)}
                  className="text-white/60 transition-colors hover:text-white"
                >
                  <SkipBack size={24} fill="currentColor" />
                </button>
                <button 
                  onClick={togglePlay}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
                <button 
                  onClick={() => skipTrack(1)}
                  className="text-white/60 transition-colors hover:text-white"
                >
                  <SkipForward size={24} fill="currentColor" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-white/40">
                <Repeat size={18} className="hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <iframe 
        key={currentTrack.videoId}
        ref={iframeRef}
        width="0" 
        height="0" 
        src={`https://www.youtube.com/embed/${currentTrack.videoId}?enablejsapi=1&controls=0&autoplay=${isPlaying ? 1 : 0}`} 
        allow="autoplay" 
        className="hidden"
      />
    </div>
  );
}
