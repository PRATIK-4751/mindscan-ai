"use client";
import { useEffect, useState, useRef } from "react";
import { Play, Pause, Music, SkipForward, SkipBack } from "lucide-react";

export default function AudioTherapy({ riskLevel }: { riskLevel: string }) {
  const [tracks, setTracks] = useState<{videoId: string, title: string}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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
    setIsPlaying(true);
  };

  if (tracks.length === 0) return null;
  const currentTrack = tracks[currentIndex];

  return (
    <div className="card-shell p-6 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/50 border border-[var(--amber-gold)]/30 backdrop-blur-md transition-all duration-300 hover:border-[var(--amber-gold)]/60">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full border border-[var(--amber-gold)] flex shrink-0 items-center justify-center bg-[#1a0a08] relative overflow-hidden">
          {isPlaying && (
            <div className="absolute inset-0 bg-[var(--amber-gold)]/20 animate-pulse rounded-full" />
          )}
          <Music size={20} className="text-[var(--amber-gold)] relative z-10" />
        </div>
        <div>
          <h4 className="font-display text-sm uppercase tracking-[0.2em] text-[var(--cream)] flex items-center gap-2">
            AI Therapist Audio
            {isPlaying && <span className="flex gap-0.5 items-end h-3">
              <span className="w-0.5 h-full bg-[var(--rust)] animate-[bounce_1s_infinite]"></span>
              <span className="w-0.5 h-2 bg-[var(--rust)] animate-[bounce_1.2s_infinite]"></span>
              <span className="w-0.5 h-3 bg-[var(--rust)] animate-[bounce_0.8s_infinite]"></span>
            </span>}
          </h4>
          <p className="font-mono mt-1 text-[10px] uppercase text-[var(--text-muted)] line-clamp-1 max-w-[200px] sm:max-w-[400px]">
            {currentTrack.title}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button 
          onClick={() => skipTrack(-1)}
          className="p-2 rounded-full hover:bg-[var(--rust)]/20 transition-all duration-300 text-[var(--cream)]/60 hover:text-[var(--cream)]"
        >
          <SkipBack size={16} />
        </button>
        <button 
          onClick={togglePlay}
          className="button-outline flex items-center justify-center w-12 h-12 rounded-full hover:bg-[var(--rust)]/20 transition-all duration-300"
        >
          {isPlaying ? <Pause size={18} className="text-[var(--cream)]" /> : <Play size={18} className="text-[var(--cream)] ml-0.5" />}
        </button>
        <button 
          onClick={() => skipTrack(1)}
          className="p-2 rounded-full hover:bg-[var(--rust)]/20 transition-all duration-300 text-[var(--cream)]/60 hover:text-[var(--cream)]"
        >
          <SkipForward size={16} />
        </button>
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
