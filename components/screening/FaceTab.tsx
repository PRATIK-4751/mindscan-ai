"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Webcam from "react-webcam";
import LoadingSpinner from "../shared/LoadingSpinner";
import { analyzeFace } from "../../lib/api";

export interface FaceTabResult {
  face_score: number;
  detected_face_emotion: string;
  imageUrl: string;
}

interface FaceTabProps {
  onComplete: (data: FaceTabResult) => void;
}

const emotions = ["Neutral", "Sad", "Anxious", "Tense", "Calm"];

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
};

export default function FaceTab({ onComplete }: FaceTabProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceScore, setFaceScore] = useState(0);
  const [emotion, setEmotion] = useState("Neutral");

  const secureReady = typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices;

  const emotionBars = useMemo(() => {
    const confidence = Math.min(Math.max(faceScore, 0), 1);
    const rest = emotions.length > 1 ? (1 - confidence) / (emotions.length - 1) : 0;
    return emotions.map((name) => ({
      name,
      value: name === emotion ? confidence : rest,
    }));
  }, [emotion, faceScore]);

  const handleCapture = async () => {
    if (!webcamRef.current) return;
    const capture = webcamRef.current.getScreenshot();
    if (!capture) return;
    setImageUrl(capture);
    setLoading(true);
    setError(null);
    try {
      const file = await dataUrlToFile(capture, "capture.jpg");
      const result = await analyzeFace(file);
      setFaceScore(result.face_score);
      setEmotion(result.detected_face_emotion);
      onComplete({ face_score: result.face_score, detected_face_emotion: result.detected_face_emotion, imageUrl: capture });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze face.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeFace(file);
      setFaceScore(result.face_score);
      setEmotion(result.detected_face_emotion);
      onComplete({ face_score: result.face_score, detected_face_emotion: result.detected_face_emotion, imageUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze face.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-white/20 bg-black/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--cream)]">LIVE FEED ●</span>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {secureReady ? "HTTPS READY" : "HTTPS REQUIRED"}
            </span>
          </div>
          <div className="relative aspect-video border border-white/20 bg-black/40">
            {secureReady ? (
              <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Camera unavailable in insecure context
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 border border-white/20">
              <span className="absolute left-4 top-4 h-3 w-3 border-l border-t border-white/60" />
              <span className="absolute right-4 top-4 h-3 w-3 border-r border-t border-white/60" />
              <span className="absolute bottom-4 left-4 h-3 w-3 border-b border-l border-white/60" />
              <span className="absolute bottom-4 right-4 h-3 w-3 border-b border-r border-white/60" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleCapture}
              disabled={!secureReady || loading}
              className="font-display flex-1 border border-[var(--cream)] py-3 text-sm uppercase tracking-[0.3em] text-[var(--cream)] disabled:opacity-40"
            >
              Capture Frame
            </button>
            <label className="font-display flex-1 border border-[var(--rust)] py-3 text-center text-sm uppercase tracking-[0.3em] text-[var(--rust)]">
              Upload Image
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="hidden" />
            </label>
          </div>
        </div>
        <div className="card-shell p-6">
          <h4 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)]">Emotion Readout</h4>
          <p className="font-mono mt-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Detected: {emotion}
          </p>
          <div className="mt-6 space-y-3">
            {emotionBars.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  <span>{item.name}</span>
                  <span>{Math.round(item.value * 100)}%</span>
                </div>
                <div className="h-[3px] w-full bg-[#1a1410]">
                  <div className="h-full bg-[var(--amber-gold)]" style={{ width: `${item.value * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {imageUrl && (
            <div className="relative mt-6 h-48 w-full border border-white/10">
              <Image src={imageUrl} alt="Captured frame" fill className="object-cover" sizes="(min-width: 1024px) 360px, 100vw" />
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
