"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, SkipBack, SkipForward, AlertCircle } from "lucide-react";

const PLAYLIST = [
  { id: process.env.NEXT_PUBLIC_YT_TRACK_1 || "G8M8WJ10ITU", title: process.env.NEXT_PUBLIC_YT_TITLE_1 || "Deep Focus & Binaural Relaxation" },
  { id: process.env.NEXT_PUBLIC_YT_TRACK_2 || "NQL_Iqx-q2E",  title: process.env.NEXT_PUBLIC_YT_TITLE_2 || "Calming Ambient Soundscape" },
  { id: process.env.NEXT_PUBLIC_YT_TRACK_3 || "MzgMBrtrFc4",  title: process.env.NEXT_PUBLIC_YT_TITLE_3 || "Peaceful Healing Meditation" },
];

const ALBUM_ART = ["/assets/album1.jpg", "/assets/album2.jpg", "/assets/album3.jpg"];

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).YT?.Player) { resolve(); return; }
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    (window as any).onYouTubeIframeAPIReady = () => resolve();
  });
}

export default function AudioTherapy({ riskLevel }: { riskLevel: string }) {
  const [idx, setIdx]           = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError]       = useState<string | null>(null);
  const [seeking, setSeeking]   = useState(false);
  const [ready, setReady]       = useState(false);

  const ytPlayer    = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef      = useRef<HTMLDivElement>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const track    = PLAYLIST[idx];
  const albumArt = ALBUM_ART[idx % ALBUM_ART.length];

  useEffect(() => {
    let cancelled = false;

    loadYTApi().then(() => {
      if (cancelled) return;

      if (ytPlayer.current) {
        try { ytPlayer.current.destroy(); } catch {}
      }

      ytPlayer.current = new (window as any).YT.Player("yt-audio-frame", {
        height: "1",
        width: "1",
        videoId: track.id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            setDuration(ytPlayer.current.getDuration?.() || 0);
            setError(null);
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            const YT = (window as any).YT.PlayerState;
            if (e.data === YT.ENDED) skip(1);
            if (e.data === YT.PLAYING) {
              setDuration(ytPlayer.current.getDuration?.() || 0);
            }
          },
          onError: () => {
            if (cancelled) return;
            setError("This track can't be played. Try skipping.");
            setPlaying(false);
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => {
    if (!ready || !ytPlayer.current) return;
    try {
      if (playing) {
        ytPlayer.current.playVideo();
      } else {
        ytPlayer.current.pauseVideo();
      }
    } catch {}
  }, [playing, ready]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (playing && ready) {
      timerRef.current = setInterval(() => {
        if (!seeking && ytPlayer.current?.getCurrentTime) {
          const cur = ytPlayer.current.getCurrentTime() || 0;
          const dur = ytPlayer.current.getDuration() || 1;
          setProgress(cur / dur);
          setDuration(dur);
        }
      }, 500);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, ready, seeking]);

  const skip = useCallback((dir: 1 | -1) => {
    const next = (idx + dir + PLAYLIST.length) % PLAYLIST.length;
    setIdx(next);
    setProgress(0);
    setDuration(0);
    setError(null);
    setReady(false);
    setPlaying(true);
  }, [idx]);

  const pctFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return 0;
    const r = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };

  const onSeekDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setSeeking(true);
    setProgress(pctFromEvent(e));
  };
  const onSeekMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (seeking) setProgress(pctFromEvent(e));
  };
  const onSeekUp = (e: React.MouseEvent<HTMLDivElement>) => {
    setSeeking(false);
    const pct = pctFromEvent(e);
    setProgress(pct);
    if (ytPlayer.current?.seekTo) {
      const dur = ytPlayer.current.getDuration() || 0;
      ytPlayer.current.seekTo(pct * dur, true);
    }
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative mt-8 overflow-hidden border-2 border-white/20 bg-black shadow-[4px_4px_0px_rgba(255,255,255,0.1)] transition-all duration-500"
      onMouseUp={(e: any) => seeking && onSeekUp(e)}
      onMouseLeave={(e: any) => seeking && onSeekUp(e)}
    >
      <div className="absolute inset-0 bg-black z-[1]" />
      <div
        className="absolute inset-0 opacity-40 blur-xl saturate-150 transition-all duration-1000 z-[2]"
        style={{ backgroundImage: `url(${albumArt})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 bg-black/70 z-[2]" />
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50 z-[3]" />

      <div className="relative z-[5] flex flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--amber-gold)]">
            AI.AUDIO.PLAYER.exe
          </span>
          <Volume2 size={16} className="text-white/40 hover:text-white transition-colors cursor-pointer" />
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-200">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          <div className="relative h-48 w-48 shrink-0 overflow-hidden border border-white/20 shadow-[2px_2px_0px_rgba(255,255,255,0.2)] bg-black p-1 sm:h-40 sm:w-40">
            <img
              src={albumArt}
              alt="Cover Art"
              className={`h-full w-full object-cover transition-all duration-1000 ${
                playing && !error ? "scale-105 brightness-110" : "scale-100 grayscale-[30%]"
              }`}
            />
            {playing && !error && (
              <div className="absolute bottom-2 right-2 flex items-end gap-1 h-4 z-10">
                <span className="w-1 h-full bg-[var(--amber-gold)] animate-[bounce_0.8s_infinite]" />
                <span className="w-1 h-3/4 bg-[var(--amber-gold)] animate-[bounce_1.1s_infinite]" />
                <span className="w-1 h-full bg-[var(--amber-gold)] animate-[bounce_0.9s_infinite]" />
              </div>
            )}
          </div>

          <div className="flex w-full flex-col justify-center">
            <div className="flex flex-col items-center sm:items-start w-full">
              <div className="flex items-center gap-6 mb-8">
                <button onClick={() => skip(-1)} className="text-white/60 transition-all hover:text-white active:scale-95">
                  <SkipBack size={24} fill="currentColor" />
                </button>
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="flex h-16 w-16 items-center justify-center border-2 border-white bg-black/50 text-white transition-all hover:bg-white hover:text-black active:translate-y-1 shadow-[2px_2px_0px_rgba(255,255,255,0.5)]"
                >
                  {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={() => skip(1)} className="text-white/60 transition-all hover:text-white active:scale-95">
                  <SkipForward size={24} fill="currentColor" />
                </button>
              </div>

              <div className="flex items-center gap-3 w-full max-w-md">
                <span className="font-mono text-[10px] text-white/60 w-8 text-right">{fmt(progress * duration)}</span>
                <div
                  ref={barRef}
                  onMouseDown={onSeekDown}
                  onMouseMove={onSeekMove}
                  className="relative h-4 w-full border border-white/20 bg-black cursor-pointer group"
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-[var(--amber-gold)] transition-all duration-75 group-hover:bg-[var(--cream)]"
                    style={{ width: `${progress * 100}%` }}
                  />
                  <div className="absolute top-[-2px] bottom-[-2px] w-1 bg-white" style={{ left: `calc(${progress * 100}% - 2px)` }} />
                </div>
                <span className="font-mono text-[10px] text-white/60 w-8">{fmt(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1, overflow: "hidden", opacity: 0.01, pointerEvents: "none" }}
      >
        <div id="yt-audio-frame" />
      </div>
    </div>
  );
}
