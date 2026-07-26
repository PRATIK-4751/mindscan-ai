"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import LoadingSpinner from "../shared/LoadingSpinner";
import { analyzeVoice, analyzeText } from "../../lib/api";
import type { ShapValue } from "../../lib/types";

export interface VoiceTabResult {
  voice_score: number;
  detected_voice_emotion: string;
  audioUrl: string;
  duration: number;
  transcript?: string;
  shap_values?: ShapValue[];
  shap_method?: string;
}

interface VoiceTabProps {
  onComplete: (data: VoiceTabResult) => void;
}

const LANGUAGES = [
  { label: "English", value: "en-US" },
  { label: "Hindi", value: "hi-IN" },
  { label: "Spanish", value: "es-ES" },
  { label: "French", value: "fr-FR" },
  { label: "German", value: "de-DE" },
  { label: "Japanese", value: "ja-JP" },
  { label: "Arabic", value: "ar-SA" },
  { label: "Korean", value: "ko-KR" },
];

export default function VoiceTab({ onComplete }: VoiceTabProps) {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const [voiceScore, setVoiceScore] = useState(0);
  const [emotion, setEmotion] = useState("Neutral");
  const [language, setLanguage] = useState("en-US");
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const recordingTimeRef = useRef(0);
  const transcriptRef = useRef("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  useEffect(() => { recordingTimeRef.current = recordingTime; }, [recordingTime]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setLoading(true);
    setError(null);
    try {
      const file = new File([blob], "voice.webm", { type: blob.type || "audio/webm" });
      const finalTranscript = transcriptRef.current;
      const finalDuration = Math.min(recordingTimeRef.current || 1, 30);

      const voiceResult = await analyzeVoice(file, finalTranscript);
      setVoiceScore(voiceResult.voice_score);
      setEmotion(voiceResult.detected_voice_emotion);

      let textScore = 0;
      let detectedEmotions: string[] = [];
      let textSummary = "";
      if (finalTranscript && finalTranscript.trim().length > 10) {
        try {
          const textResult = await analyzeText(finalTranscript);
          textScore = textResult.text_score;
          detectedEmotions = textResult.detected_emotions || [];
          textSummary = textResult.summary || "";
        } catch {

        }
      }

      const combinedScore = finalTranscript && finalTranscript.trim().length > 10
        ? Math.min(Math.max(voiceResult.voice_score * 0.4 + textScore * 0.6, 0), 1)
        : voiceResult.voice_score;

      onComplete({
        voice_score: combinedScore,
        detected_voice_emotion: detectedEmotions.length > 0
          ? detectedEmotions.join(", ")
          : voiceResult.detected_voice_emotion,
        audioUrl: url,
        duration: finalDuration,
        transcript: finalTranscript,
        shap_values: voiceResult.shap_values ?? [],
        shap_method: voiceResult.shap_method ?? "unavailable",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze voice.");
    } finally {
      setLoading(false);
    }
  }, [onComplete]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript("");
      setIsPlaying(false);
      setPlaybackTime(0);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunksRef.current = [];

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language;
        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };
        recognitionRef.current.start();
      }

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        handleRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= 30) {

            if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
              mediaRecorder.current.stop();
            }
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 30;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied or not available. Please allow microphone permissions.");
    }
  }, [language, handleRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#f5a623",
      progressColor: "#c0392b",
      height: 100,
      barWidth: 3,
      barGap: 2,
      cursorWidth: 0,
      normalize: true,
      backend: "WebAudio" as any,
    });
    wavesurfer.current.load(audioUrl);
    
    wavesurfer.current.on("play", () => setIsPlaying(true));
    wavesurfer.current.on("pause", () => setIsPlaying(false));
    wavesurfer.current.on("finish", () => setIsPlaying(false));
    wavesurfer.current.on("audioprocess", () => {
      if (wavesurfer.current) {
        setPlaybackTime(wavesurfer.current.getCurrentTime());
      }
    });
    
    return () => {
      wavesurfer.current?.destroy();
      wavesurfer.current = null;
    };
  }, [audioUrl]);

  const togglePlayback = useCallback(() => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  }, []);

  const seekPlayback = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (wavesurfer.current) {
      const time = parseFloat(e.target.value);
      wavesurfer.current.seekTo(time / wavesurfer.current.getDuration());
      setPlaybackTime(time);
    }
  }, []);

  const metrics = useMemo(() => {
    const base = Math.min(Math.max(voiceScore, 0), 1);
    return [
      { label: "Energy", value: Math.round(base * 100) },
      { label: "Stability", value: Math.round((1 - base * 0.4) * 100) },
      { label: "Clarity", value: Math.round((0.6 + base * 0.4) * 100) },
    ];
  }, [voiceScore]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-white/10 bg-black/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className={`font-mono text-xs uppercase tracking-[0.3em] ${isRecording ? "text-red-400" : "text-[var(--cream)]"}`}>
                {isRecording ? "● REC" : "○ READY"}
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isRecording}
                className="cursor-pointer bg-transparent font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--cream)] disabled:opacity-40"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value} className="bg-zinc-900">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {isRecording ? `00:${recordingTime.toString().padStart(2, "0")}` : "00:00"}
            </span>
          </div>
          <div className="relative flex h-48 flex-col items-center justify-center border border-white/20">
            <div className={`absolute h-40 w-40 rounded-full border border-[var(--rust)] opacity-40 ${isRecording ? "ring-pulse" : ""}`} />
            <div className={`absolute h-28 w-28 rounded-full border border-[var(--rust)] opacity-60 ${isRecording ? "ring-pulse" : ""}`} />
            <div className={`absolute h-16 w-16 rounded-full border border-[var(--rust)] opacity-80 ${isRecording ? "ring-pulse" : ""}`} />
            
            <div className="relative z-10">
              <button
                onClick={() => (isRecording ? stopRecording() : startRecording())}
                disabled={loading}
                className="font-display border border-[var(--cream)] px-6 py-3 text-xs uppercase tracking-[0.35em] text-[var(--cream)] transition-all hover:bg-[var(--cream)] hover:text-black disabled:opacity-40"
              >
                {isRecording ? "Stop" : loading ? "Analyzing..." : "Record"}
              </button>
            </div>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Record up to 30 seconds — auto-stops at limit
          </p>
        </div>
        <div className="card-shell p-6">
          <h4 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)]">Vocal Features</h4>
          <div className="mt-6 space-y-4">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  <span>{metric.label}</span>
                  <span>{metric.value}%</span>
                </div>
                <div className="mt-2 h-[3px] w-full bg-[#1a1410]">
                  <div className="h-full bg-[var(--amber-gold)] transition-all duration-500" style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Detected: {emotion}
          </div>
          {transcript && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h5 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--cream)] mb-2">Transcript</h5>
              <p className="font-body text-xs text-[var(--text-muted)] max-h-24 overflow-y-auto">{transcript}</p>
            </div>
          )}
        </div>
      </div>
      <div className="card-shell p-6">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)]">Waveform</h4>
          {audioUrl && (
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {formatTime(playbackTime)} / {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
        <div className="mt-6">
          {audioUrl ? (
            <>
              <div ref={waveformRef} className="rounded bg-black/40 p-2" />
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={togglePlayback}
                  className="border border-[var(--amber-gold)] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--amber-gold)] hover:bg-[var(--amber-gold)] hover:text-black transition-colors"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={recordingTime}
                  value={playbackTime}
                  onChange={seekPlayback}
                  className="flex-1 h-1 bg-[var(--rust)] rounded cursor-pointer accent-[var(--amber-gold)]"
                />
              </div>
            </>
          ) : (
            <div className="flex h-24 items-center justify-center border border-dashed border-white/10 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Record audio to view waveform
            </div>
          )}
        </div>
      </div>
      {loading && (
        <div className="card-shell p-6">
          <LoadingSpinner />
        </div>
      )}
      {error && <div className="border border-[var(--danger)] p-4 text-sm text-[var(--danger)]">{error}</div>}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
