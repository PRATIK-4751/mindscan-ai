"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import LoadingSpinner from "../shared/LoadingSpinner";
import { analyzeFace } from "../../lib/api";
import { useFaceDetection, FaceDetectionResult } from "../../hooks/useFaceDetection";
import {
  Camera, CameraOff, Upload, Square, Play, AlertTriangle,
  Activity, ScanEye, Crosshair, Radio, Zap, Eye, MonitorSpeaker,
} from "lucide-react";

export interface FaceTabResult {
  face_score: number;
  detected_face_emotion: string;
  imageUrl: string;
  emotions?: Record<string, number> | null;
  dominant_emotion?: string | null;
  emotion_confidence?: number | null;
  google_labels?: string[];
}

interface FaceTabProps {
  onComplete: (data: FaceTabResult) => void;
}

const EMOTION_COLORS: Record<string, string> = {
  Angry: "#ff3333",
  Disgust: "#ff8c00",
  Fear: "#ffd700",
  Happy: "#00ff88",
  Neutral: "#00ccff",
  Sad: "#6666ff",
  Surprise: "#ff33ff",
};

const EMOTION_ICONS: Record<string, React.ReactNode> = {
  Angry: <Zap size={14} />,
  Disgust: <AlertTriangle size={14} />,
  Fear: <Eye size={14} />,
  Happy: <Activity size={14} />,
  Neutral: <ScanEye size={14} />,
  Sad: <MonitorSpeaker size={14} />,
  Surprise: <Radio size={14} />,
};

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
};

export default function FaceTab({ onComplete }: FaceTabProps) {
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceScore, setFaceScore] = useState(0);
  const [emotion, setEmotion] = useState("Neutral");
  const [emotions, setEmotions] = useState<Record<string, number> | null>(null);
  const [dominantEmotion, setDominantEmotion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recTime, setRecTime] = useState(0);
  const [crtMode, setCrtMode] = useState<"green" | "blue" | "off">("green");

  const { modelsLoaded, loading: modelsLoading, error: modelsError, detect } = useFaceDetection();

  // Store the webcam video element ref for face detection
  useEffect(() => {
    if (webcamRef.current) {
      const video = webcamRef.current.video;
      if (video) {
        videoRef.current = video;
      }
    }
  });

  // Also try to get video ref after webcam mounts
  const getVideoElement = useCallback(() => {
    if (videoRef.current) return videoRef.current;
    if (webcamRef.current?.video) {
      videoRef.current = webcamRef.current.video;
      return videoRef.current;
    }
    return null;
  }, []);

  const secureReady = typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices;

  const emotionBars = useMemo(() => {
    if (emotions) {
      return Object.entries(emotions)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([name, value]) => ({
          name,
          value: value as number,
          color: EMOTION_COLORS[name] || "#888",
          icon: EMOTION_ICONS[name] || <ScanEye size={14} />,
        }));
    }
    const conf = Math.min(Math.max(faceScore, 0), 1);
    const emotionsList = ["Neutral", "Sad", "Anxious", "Tense", "Calm"];
    const rest = emotionsList.length > 1 ? (1 - conf) / (emotionsList.length - 1) : 0;
    return emotionsList.map((name) => ({
      name,
      value: name === emotion ? conf : rest,
      color: name === emotion ? "#00ccff" : "#555",
      icon: <ScanEye size={14} />,
    }));
  }, [emotion, faceScore, emotions]);

  // Run face detection on a video element, then call the vision API for Google Vision labels
  const processVideoFrame = useCallback(async (videoEl: HTMLVideoElement, imageUrl: string) => {
    setLoading(true);
    setAnalyzing(true);
    setError(null);
    try {
      // Step 1: Client-side face detection + emotion prediction
      const faceResult = await detect(videoEl);

      // Step 2: Send to vision API for Google Vision labels (with client emotions)
      const file = await dataUrlToFile(imageUrl, "capture.jpg");
      const apiResult = await analyzeFace(file, faceResult);

      // Merge results
      setFaceScore(apiResult.face_score);
      setEmotion(apiResult.detected_face_emotion);
      if (apiResult.emotions) setEmotions(apiResult.emotions);
      if (apiResult.dominant_emotion) setDominantEmotion(apiResult.dominant_emotion);
      if (apiResult.emotion_confidence !== undefined) setConfidence(apiResult.emotion_confidence);
      if (apiResult.google_labels) setLabels(apiResult.google_labels);

      onComplete({
        face_score: apiResult.face_score,
        detected_face_emotion: apiResult.detected_face_emotion,
        imageUrl,
        emotions: apiResult.emotions,
        dominant_emotion: apiResult.dominant_emotion,
        emotion_confidence: apiResult.emotion_confidence,
        google_labels: apiResult.google_labels,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze face.");
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }, [detect, onComplete]);

  // Process an uploaded image file
  const processUploadedImage = useCallback(async (file: File, imageUrl: string) => {
    setLoading(true);
    setAnalyzing(true);
    setError(null);
    try {
      // Create an offscreen image element for face detection
      const img = new Image();
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const faceResult = await detect(img);
      const apiResult = await analyzeFace(file, faceResult);

      setFaceScore(apiResult.face_score);
      setEmotion(apiResult.detected_face_emotion);
      if (apiResult.emotions) setEmotions(apiResult.emotions);
      if (apiResult.dominant_emotion) setDominantEmotion(apiResult.dominant_emotion);
      if (apiResult.emotion_confidence !== undefined) setConfidence(apiResult.emotion_confidence);
      if (apiResult.google_labels) setLabels(apiResult.google_labels);

      onComplete({
        face_score: apiResult.face_score,
        detected_face_emotion: apiResult.detected_face_emotion,
        imageUrl,
        emotions: apiResult.emotions,
        dominant_emotion: apiResult.dominant_emotion,
        emotion_confidence: apiResult.emotion_confidence,
        google_labels: apiResult.google_labels,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze face.");
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }, [detect, onComplete]);

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    const capture = webcamRef.current.getScreenshot();
    if (!capture) return;
    setImageUrl(capture);
    const videoEl = getVideoElement();
    if (videoEl) {
      await processVideoFrame(videoEl, capture);
    } else {
      setError("Camera not ready. Please try again.");
    }
  }, [processVideoFrame, getVideoElement]);

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    await processUploadedImage(file, url);
  }, [processUploadedImage]);

  const handleAutoCapture = useCallback(() => {
    if (recording) {
      if (recIntervalRef.current) {
        clearInterval(recIntervalRef.current);
        recIntervalRef.current = null;
      }
      setRecording(false);
      setRecTime(0);
      return;
    }

    setRecording(true);
    setRecTime(0);
    let elapsed = 0;
    const maxDuration = 15;

    const doCapture = async () => {
      const videoEl = getVideoElement();
      if (!videoEl || !webcamRef.current) return;
      const capture = webcamRef.current.getScreenshot();
      if (!capture) return;
      setImageUrl(capture);
      elapsed += 3;
      setRecTime(elapsed);

      // Run client-side face detection on each frame (fast, no API call)
      try {
        const faceResult = await detect(videoEl);
        setFaceScore(faceResult.face_detected ? (faceResult.confidence > 0.5 ? 0.7 : 0.3) : 0.2);
        setEmotion(faceResult.dominant_emotion);
        setEmotions(faceResult.emotions);
        setDominantEmotion(faceResult.dominant_emotion);
        setConfidence(faceResult.confidence);
      } catch { /* ignore per-frame errors */ }

      if (elapsed >= maxDuration) {
        if (recIntervalRef.current) {
          clearInterval(recIntervalRef.current);
          recIntervalRef.current = null;
        }
        setRecording(false);
        // Final capture: send to API for Google Vision labels
        await processVideoFrame(videoEl, capture);
      }
    };

    doCapture();
    recIntervalRef.current = setInterval(() => {
      doCapture();
    }, 3000);
  }, [recording, detect, processVideoFrame, getVideoElement]);

  const cycleCrt = () => {
    if (crtMode === "green") setCrtMode("blue");
    else if (crtMode === "blue") setCrtMode("off");
    else setCrtMode("green");
  };

  const crtOverlayClass =
    crtMode === "green"
      ? "bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.03)_50%)] bg-[length:100%_2px]"
      : crtMode === "blue"
      ? "bg-[linear-gradient(transparent_50%,rgba(0,100,255,0.03)_50%)] bg-[length:100%_2px]"
      : "";

  const crtBorderColor =
    crtMode === "green" ? "border-[#00ff88]/20" : crtMode === "blue" ? "border-[#00ccff]/20" : "border-[#333]";

  const crtGlow =
    crtMode === "green"
      ? "shadow-[0_0_40px_rgba(0,255,136,0.08)]"
      : crtMode === "blue"
      ? "shadow-[0_0_40px_rgba(0,204,255,0.08)]"
      : "";

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--cream)]">
            MINDSCAN IMAGING v3.0
          </span>
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-400">
            {recording ? `REC ${recTime}s` : "STANDBY"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={cycleCrt}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 border border-[var(--cream)]/30 text-[var(--cream)]/60 hover:text-[var(--cream)] hover:border-[var(--cream)]/60 transition"
          >
            <MonitorSpeaker size={12} />
            CRT: {crtMode.toUpperCase()}
          </button>
          {crtMode !== "off" && (
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
              PHOSPHOR: {crtMode === "green" ? "P31" : "P22"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Camera Panel */}
        <div className="relative">
          <div className={`bg-[#0a0e08] rounded-lg border-2 ${crtBorderColor} p-1 ${crtGlow} transition-all duration-500`}>
            {/* Bezel top */}
            <div className="bg-[#111] rounded-t-md px-4 py-2 flex items-center justify-between border-b border-[#222]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_4px_#ff0000]" />
                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_4px_#ffff00]" />
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_#00ff00]" />
              </div>
              <div className="flex items-center gap-3">
                <Crosshair size={12} className="text-[#00ff88]/40" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00ff88]/80">
                  FACIAL DIAGNOSTIC IMAGING
                </span>
                <Crosshair size={12} className="text-[#00ff88]/40" />
              </div>
              <span className="font-mono text-[10px] text-[#444]">DICOM 3.0</span>
            </div>

            {/* Screen */}
            <div className="relative aspect-video bg-black overflow-hidden">
              {secureReady ? (
                <>
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className={`h-full w-full object-cover ${
                      crtMode === "green"
                        ? "brightness-110 saturate-50 hue-rotate-[80deg]"
                        : crtMode === "blue"
                        ? "brightness-110 saturate-75 hue-rotate-[200deg]"
                        : ""
                    }`}
                  />
                  {/* CRT scanlines */}
                  {crtMode !== "off" && (
                    <div className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px)" }} />
                  )}
                  {/* CRT phosphor grid */}
                  {crtMode !== "off" && (
                    <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "3px 3px" }} />
                  )}
                  {/* Medical crosshair overlay */}
                  <div className="pointer-events-none absolute inset-0">
                    {/* Corner brackets */}
                    <span className="absolute left-3 top-3 h-8 w-8 border-l-2 border-t-2 border-[#00ff88]/50" />
                    <span className="absolute right-3 top-3 h-8 w-8 border-r-2 border-t-2 border-[#00ff88]/50" />
                    <span className="absolute bottom-3 left-3 h-8 w-8 border-b-2 border-l-2 border-[#00ff88]/50" />
                    <span className="absolute bottom-3 right-3 h-8 w-8 border-b-2 border-r-2 border-[#00ff88]/50" />
                    {/* Center crosshair */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="h-6 w-px bg-[#00ff88]/30" />
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-6 bg-[#00ff88]/30" />
                    </div>
                    {/* Horizontal guide lines */}
                    <div className="absolute left-0 right-0 top-[30%] h-px bg-[#00ff88]/10" />
                    <div className="absolute left-0 right-0 top-[70%] h-px bg-[#00ff88]/10" />
                    {/* Vertical guide lines */}
                    <div className="absolute top-0 bottom-0 left-[30%] w-px bg-[#00ff88]/10" />
                    <div className="absolute top-0 bottom-0 left-[70%] w-px bg-[#00ff88]/10" />
                  </div>
                  {/* Medical metadata overlay */}
                  <div className="pointer-events-none absolute inset-0 p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="font-mono text-[9px] text-[#00ff88]/70">MINDSCAN MEDICAL IMAGING</div>
                        <div className="font-mono text-[8px] text-[#00ff88]/40">MODALITY: FACIAL EMOTION DETECTION</div>
                        <div className="font-mono text-[8px] text-[#00ff88]/40">PROTOCOL: NEURO-AFFECTIVE SCREENING</div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="font-mono text-[8px] text-[#00ff88]/40">
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })}
                        </div>
                        <div className="font-mono text-[8px] text-[#00ff88]/40">
                          {new Date().toLocaleTimeString("en-US", { hour12: false })}
                        </div>
                        <div className="font-mono text-[8px] text-[#00ff88]/40">SLICE: 1/1</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="font-mono text-[8px] text-[#00ff88]/40">
                        W: 640 H: 480窗宽: 255 窗位: 127
                      </div>
                      <div className="font-mono text-[8px] text-[#00ff88]/40">
                        FOV: 480mm 像素: 0.75mm
                      </div>
                    </div>
                  </div>
                  {/* Recording indicator */}
                  {recording && (
                    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/70 px-3 py-1 border border-red-500/30">
                      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-mono text-[10px] text-red-400 uppercase tracking-wider">
                        REC {recTime}s / 15s
                      </span>
                    </div>
                  )}
                  {/* Scan beam animation */}
                  {crtMode !== "off" && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 h-px opacity-30"
                      style={{
                        background: crtMode === "green" ? "#00ff88" : "#00ccff",
                        animation: "scanBeam 4s linear infinite",
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                  <CameraOff size={40} className="text-[#555]" />
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#00ccff]">
                    CAMERA UNAVAILABLE
                  </span>
                  <span className="font-mono text-[10px] text-[#666] max-w-[200px]">
                    Requires HTTPS context. Try uploading an image instead.
                  </span>
                </div>
              )}
            </div>

            {/* Bezel bottom with controls */}
            <div className="bg-[#111] rounded-b-md px-4 py-3 border-t border-[#222]">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleCapture}
                  disabled={!secureReady || loading || modelsLoading || !modelsLoaded}
                  className="retro-btn retro-btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <Activity size={14} className="animate-pulse" />
                      ANALYZING...
                    </>
                  ) : modelsLoading ? (
                    <>
                      <Activity size={14} className="animate-pulse" />
                      LOADING MODELS...
                    </>
                  ) : (
                    <>
                      <Camera size={14} />
                      CAPTURE
                    </>
                  )}
                </button>
                <button
                  onClick={handleAutoCapture}
                  disabled={!secureReady || loading || modelsLoading || !modelsLoaded}
                  className={`retro-btn flex-1 flex items-center justify-center gap-2 ${
                    recording ? "retro-btn-danger" : "retro-btn-secondary"
                  }`}
                >
                  {recording ? (
                    <>
                      <Square size={14} />
                      STOP ({15 - recTime}s)
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      AUTO (15s)
                    </>
                  )}
                </button>
                <label className="retro-btn retro-btn-accent flex-1 flex items-center justify-center gap-2 text-center cursor-pointer">
                  <Upload size={14} />
                  UPLOAD
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Emotion Readout Panel */}
        <div className="space-y-4">
          {/* Model Status */}
          {modelsLoading && (
            <div className="bg-[#0a0a1a] border border-yellow-500/30 rounded-lg p-3 shadow-[0_0_20px_rgba(255,200,0,0.05)]">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-yellow-400 animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-yellow-400">
                  Loading face detection models...
                </span>
              </div>
            </div>
          )}
          {modelsError && (
            <div className="bg-[#0a0a1a] border border-red-500/30 rounded-lg p-3 shadow-[0_0_20px_rgba(255,0,0,0.05)]">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-red-400">
                  {modelsError}
                </span>
              </div>
            </div>
          )}

          {/* Dominant Emotion Display */}
          <div className="bg-[#0a0a1a] border border-[#00ccff]/30 rounded-lg p-4 shadow-[0_0_20px_rgba(0,204,255,0.05)]">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ccff]/60 mb-2">
              DETECTED EMOTION
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center border border-[#00ccff]/30 bg-[#00ccff]/5 text-[#00ccff]">
                {EMOTION_ICONS[dominantEmotion || emotion] || <ScanEye size={20} />}
              </div>
              <div>
                <div className="font-display text-2xl uppercase tracking-wider text-[var(--cream)]">
                  {dominantEmotion || emotion}
                </div>
                {confidence !== null && (
                  <div className="font-mono text-xs text-[#00ccff]">
                    {Math.round(confidence * 100)}% confidence
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Emotion Bars */}
          <div className="bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--cream)]/60 mb-3">
              EMOTION SPECTRUM
            </div>
            <div className="space-y-2">
              {emotionBars.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--cream)]/80 flex items-center gap-1.5">
                      <span className="text-[var(--cream)]/40">{item.icon}</span>
                      {item.name}
                    </span>
                    <span className="font-mono text-[10px] text-[#00ccff]">
                      {Math.round(item.value * 100)}%
                    </span>
                  </div>
                  <div className="h-[6px] w-full bg-[#1a1a2e] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.max(item.value * 100, 2)}%`,
                        backgroundColor: item.color,
                        boxShadow: item.value > 0.3 ? `0 0 8px ${item.color}40` : "none",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vision Labels */}
          {labels.length > 0 && (
            <div className="bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--cream)]/60 mb-2">
                VISION LABELS
              </div>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <span key={label} className="font-mono text-[10px] px-2 py-1 bg-[#1a1a2e] border border-[#333] text-[#00ccff] rounded">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Captured Frame Preview */}
          {imageUrl && (
            <div className="bg-[#0a0a1a] border border-[#333] rounded-lg p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--cream)]/60 mb-2">
                CAPTURED FRAME
              </div>
              <div className="relative aspect-video w-full border border-[#333] rounded overflow-hidden">
                <img src={imageUrl} alt="Captured frame" className="h-full w-full object-cover" />
                {crtMode !== "off" && (
                  <div className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)" }} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-[#0a0a1a] border border-[#00ccff]/30 rounded-lg p-6 shadow-[0_0_20px_rgba(0,204,255,0.05)]">
          <div className="flex items-center gap-4">
            <LoadingSpinner />
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-[#00ccff] flex items-center gap-2">
                <Activity size={14} className="animate-pulse" />
                PROCESSING...
              </div>
              <div className="font-mono text-[10px] text-[var(--cream)]/40 mt-1">
                Running client-side emotion model + Google Vision analysis
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="border border-red-500/50 bg-red-500/10 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-red-400">ERROR</div>
            <div className="font-mono text-sm text-red-300 mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!imageUrl && !loading && (
        <div className="bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--cream)]/60 mb-2">
            PROTOCOL INSTRUCTIONS
          </div>
          <ul className="space-y-1.5 font-mono text-[11px] text-[var(--cream)]/50">
            <li className="flex items-start gap-2">
              <Crosshair size={10} className="mt-1 shrink-0 text-[#00ff88]/40" />
              Position your face clearly in the camera frame
            </li>
            <li className="flex items-start gap-2">
              <Camera size={10} className="mt-1 shrink-0 text-[#00ff88]/40" />
              Click CAPTURE for a single frame analysis
            </li>
            <li className="flex items-start gap-2">
              <Play size={10} className="mt-1 shrink-0 text-[#00ff88]/40" />
              Click AUTO for continuous 15-second monitoring
            </li>
            <li className="flex items-start gap-2">
              <Upload size={10} className="mt-1 shrink-0 text-[#00ff88]/40" />
              Or UPLOAD a photo from your device
            </li>
            <li className="flex items-start gap-2">
              <Activity size={10} className="mt-1 shrink-0 text-[#00ff88]/40" />
              Emotion detection runs in your browser (no server needed)
            </li>
            <li className="flex items-start gap-2">
              <ScanEye size={10} className="mt-1 shrink-0 text-[#00ff88]/40" />
              Google Vision provides supplementary label analysis
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
