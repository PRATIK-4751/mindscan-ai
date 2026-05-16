"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import LoadingSpinner from "../shared/LoadingSpinner";
import { analyzeVoice } from "../../lib/api";

export interface VoiceTabResult {
  voice_score: number;
  detected_voice_emotion: string;
  audioUrl: string;
  duration: number;
}

interface VoiceTabProps {
  onComplete: (data: VoiceTabResult) => void;
}

export default function VoiceTab({ onComplete }: VoiceTabProps) {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceScore, setVoiceScore] = useState(0);
  const [emotion, setEmotion] = useState("Neutral");
  
  // Native MediaRecorder state
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        handleRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop()); // cleanup microphone
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied or not available. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setLoading(true);
    setError(null);
    try {
      const file = new File([blob], "voice.webm", { type: blob.type || "audio/webm" });
      const result = await analyzeVoice(file);
      setVoiceScore(result.voice_score);
      setEmotion(result.detected_voice_emotion);
      onComplete({
        voice_score: result.voice_score,
        detected_voice_emotion: result.detected_voice_emotion,
        audioUrl: url,
        duration: Math.min(recordingTime || 1, 30),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze voice.");
    } finally {
      setLoading(false);
    }
  }, [onComplete, recordingTime]);

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#f5a623",
      progressColor: "#c0392b",
      height: 80,
      barWidth: 2,
      cursorWidth: 0,
    });
    wavesurfer.current.load(audioUrl);
    return () => {
      wavesurfer.current?.destroy();
      wavesurfer.current = null;
    };
  }, [audioUrl]);

  const metrics = useMemo(() => {
    const base = Math.min(Math.max(voiceScore, 0), 1);
    return [
      { label: "Energy", value: Math.round(base * 100) },
      { label: "Stability", value: Math.round((1 - base * 0.4) * 100) },
      { label: "Clarity", value: Math.round((0.6 + base * 0.4) * 100) },
    ];
  }, [voiceScore]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-white/10 bg-black/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--cream)]">REC ●</span>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {isRecording ? `00:${recordingTime.toString().padStart(2, "0")}` : "00:00"}
            </span>
          </div>
          <div className="relative flex h-48 items-center justify-center border border-white/20">
            <div className={`absolute h-40 w-40 rounded-full border border-[var(--rust)] opacity-40 ${isRecording ? "ring-pulse" : ""}`} />
            <div className={`absolute h-28 w-28 rounded-full border border-[var(--rust)] opacity-60 ${isRecording ? "ring-pulse" : ""}`} />
            <div className={`absolute h-16 w-16 rounded-full border border-[var(--rust)] opacity-80 ${isRecording ? "ring-pulse" : ""}`} />
            <button
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              className="font-display border border-[var(--cream)] px-6 py-3 text-xs uppercase tracking-[0.35em] text-[var(--cream)]"
            >
              {isRecording ? "Stop" : "Record"}
            </button>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Record up to 30 seconds
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
                  <div className="h-full bg-[var(--amber-gold)]" style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Detected: {emotion}
          </div>
        </div>
      </div>
      <div className="card-shell p-6">
        <h4 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)]">Waveform</h4>
        <div className="mt-6">
          <div ref={waveformRef} />
          {!audioUrl && (
            <div className="mt-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
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
