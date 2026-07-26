"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import LoadingSpinner from "../shared/LoadingSpinner";
import { analyzeFace } from "../../lib/api";
import { useFaceDetection } from "../../hooks/useFaceDetection";
import {
  Camera, CameraOff, Upload, Square, Play, AlertTriangle,
  Activity, ScanEye, Heart, Brain, Sparkles, Zap,
  ChevronRight, Shield, Eye, Smile, Frown, Meh,
  Angry, Scan, Radio, CheckCircle2,
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

const EMOTION_CONFIG: Record<string, { color: string; gradient: string; icon: React.ReactNode; label: string }> = {
  Happy:     { color: "#10b981", gradient: "from-emerald-400 to-emerald-600", icon: <Smile size={20} />, label: "Joyful" },
  Sad:       { color: "#6366f1", gradient: "from-indigo-400 to-indigo-600", icon: <Frown size={20} />, label: "Sad" },
  Neutral:   { color: "#64748b", gradient: "from-slate-400 to-slate-600", icon: <Meh size={20} />, label: "Calm" },
  Angry:     { color: "#ef4444", gradient: "from-red-400 to-red-600", icon: <Angry size={20} />, label: "Tense" },
  Fear:      { color: "#f59e0b", gradient: "from-amber-400 to-amber-600", icon: <Eye size={20} />, label: "Anxious" },
  Surprise:  { color: "#8b5cf6", gradient: "from-violet-400 to-violet-600", icon: <Sparkles size={20} />, label: "Surprised" },
  Disgust:   { color: "#84cc16", gradient: "from-lime-400 to-lime-600", icon: <AlertTriangle size={20} />, label: "Distressed" },
};

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
};

export default function FaceTab({ onComplete }: FaceTabProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emotion, setEmotion] = useState("Neutral");
  const [emotions, setEmotions] = useState<Record<string, number> | null>(null);
  const [dominantEmotion, setDominantEmotion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recTime, setRecTime] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [liveBox, setLiveBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const { modelsLoaded, loading: modelsLoading, error: modelsError, detect } = useFaceDetection();

  const secureReady = typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices;

  const currentEmotionConfig = EMOTION_CONFIG[dominantEmotion || emotion] || EMOTION_CONFIG.Neutral;

  const drawOverlay = useCallback((emotions: Record<string, number> | null, dominant: string | null, box: { x: number; y: number; width: number; height: number } | null) => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let x, y, boxW, boxH, cx, cy;

    if (box) {
      x = box.x;
      y = box.y;
      boxW = box.width;
      boxH = box.height;
      cx = x + boxW / 2;
      cy = y + boxH / 2;
    } else {
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      boxW = canvas.width * 0.45;
      boxH = canvas.height * 0.55;
      x = cx - boxW / 2;
      y = cy - boxH / 2;
    }

    const emotionColor = dominant ? (EMOTION_CONFIG[dominant]?.color || "#64748b") : "#64748b";

    const cornerLen = 30;
    ctx.strokeStyle = emotionColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = emotionColor;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + boxW - cornerLen, y);
    ctx.lineTo(x + boxW, y);
    ctx.lineTo(x + boxW, y + cornerLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + boxH - cornerLen);
    ctx.lineTo(x, y + boxH);
    ctx.lineTo(x + cornerLen, y + boxH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + boxW - cornerLen, y + boxH);
    ctx.lineTo(x + boxW, y + boxH);
    ctx.lineTo(x + boxW, y + boxH - cornerLen);
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = `${emotionColor}60`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy);
    ctx.lineTo(cx + 15, cy);
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx, cy + 15);
    ctx.stroke();

    if (dominant && emotions) {
      const label = EMOTION_CONFIG[dominant]?.label || dominant;
      const conf = emotions[dominant] ? Math.round(emotions[dominant] * 100) : 0;

      ctx.font = "bold 16px 'JetBrains Mono', monospace";
      ctx.fillStyle = emotionColor;
      ctx.textAlign = "center";
      ctx.shadowColor = emotionColor;
      ctx.shadowBlur = 8;
      ctx.fillText(`${label.toUpperCase()}  ${conf}%`, cx, y - 15);
      ctx.shadowBlur = 0;
    }

    if (scanning) {
      const scanY = (Date.now() % 3000) / 3000 * canvas.height;
      const gradient = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.5, `${emotionColor}30`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 30, canvas.width, 60);
    }
  }, [scanning]);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      drawOverlay(emotions, dominantEmotion, liveBox);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [emotions, dominantEmotion, liveBox, drawOverlay]);

  useEffect(() => {
    if (!modelsLoaded || !secureReady || showResults || recording || analyzing) {
      setLiveBox(null);
      return;
    }

    let active = true;
    let timerId: ReturnType<typeof setTimeout>;

    async function runDetection() {
      const video = webcamRef.current?.video;
      if (video && video.readyState === 4) {
        try {
          const res = await detect(video);
          if (active) {
            if (res.face_detected && res.box) {
              setLiveBox(res.box);
              setEmotions(res.emotions);
              setDominantEmotion(res.dominant_emotion);
              setConfidence(res.confidence);
              setEmotion(res.dominant_emotion);
            } else {
              setLiveBox(null);
            }
          }
        } catch (e) {
        }
      }
      if (active) {
        timerId = setTimeout(runDetection, 150);
      }
    }

    runDetection();

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [modelsLoaded, secureReady, showResults, recording, analyzing, detect]);

  const processVideoFrame = useCallback(async (videoEl: HTMLVideoElement, imageUrl: string) => {
    setLoading(true);
    setAnalyzing(true);
    setScanning(true);
    setScanProgress(0);
    setError(null);
    setShowResults(false);

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      setScanProgress(Math.min(progress, 90));
    }, 50);

    try {
      const faceResult = await detect(videoEl);
      setEmotions(faceResult.emotions);
      setDominantEmotion(faceResult.dominant_emotion);
      setConfidence(faceResult.confidence);

      const file = await dataUrlToFile(imageUrl, "capture.jpg");
      const apiResult = await analyzeFace(file, faceResult);

      clearInterval(progressInterval);
      setScanProgress(100);

      setEmotion(apiResult.detected_face_emotion);
      if (apiResult.emotions) setEmotions(apiResult.emotions);
      if (apiResult.dominant_emotion) setDominantEmotion(apiResult.dominant_emotion);
      if (apiResult.emotion_confidence !== undefined) setConfidence(apiResult.emotion_confidence);
      if (apiResult.google_labels) setLabels(apiResult.google_labels);

      setShowResults(true);
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
      setScanning(false);
      clearInterval(progressInterval);
    }
  }, [detect, onComplete]);

  const processUploadedImage = useCallback(async (file: File, imageUrl: string) => {
    setLoading(true);
    setAnalyzing(true);
    setScanning(true);
    setScanProgress(0);
    setError(null);
    setShowResults(false);

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      setScanProgress(Math.min(progress, 90));
    }, 50);

    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const faceResult = await detect(img);
      setEmotions(faceResult.emotions);
      setDominantEmotion(faceResult.dominant_emotion);
      setConfidence(faceResult.confidence);

      const apiResult = await analyzeFace(file, faceResult);

      clearInterval(progressInterval);
      setScanProgress(100);

      setEmotion(apiResult.detected_face_emotion);
      if (apiResult.emotions) setEmotions(apiResult.emotions);
      if (apiResult.dominant_emotion) setDominantEmotion(apiResult.dominant_emotion);
      if (apiResult.emotion_confidence !== undefined) setConfidence(apiResult.emotion_confidence);
      if (apiResult.google_labels) setLabels(apiResult.google_labels);

      setShowResults(true);
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
      setScanning(false);
      clearInterval(progressInterval);
    }
  }, [detect, onComplete]);

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    const capture = webcamRef.current.getScreenshot();
    if (!capture) return;
    setImageUrl(capture);
    const video = webcamRef.current.video;
    if (video) {
      await processVideoFrame(video, capture);
    } else {
      setError("Camera not ready. Please try again.");
    }
  }, [processVideoFrame]);

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
      const video = webcamRef.current?.video;
      if (!video || !webcamRef.current) return;
      const capture = webcamRef.current.getScreenshot();
      if (!capture) return;
      setImageUrl(capture);
      elapsed += 3;
      setRecTime(elapsed);

      try {
        const faceResult = await detect(video);
        setEmotions(faceResult.emotions);
        setDominantEmotion(faceResult.dominant_emotion);
        setConfidence(faceResult.confidence);
      } catch {  }

      if (elapsed >= maxDuration) {
        if (recIntervalRef.current) {
          clearInterval(recIntervalRef.current);
          recIntervalRef.current = null;
        }
        setRecording(false);
        await processVideoFrame(video, capture);
      }
    };

    doCapture();
    recIntervalRef.current = setInterval(doCapture, 3000);
  }, [recording, detect, processVideoFrame]);

  useEffect(() => {
    return () => {
      if (recIntervalRef.current) clearInterval(recIntervalRef.current);
    };
  }, []);

  const emotionBars = useMemo(() => {
    if (emotions) {
      return Object.entries(emotions)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([name, value]) => ({
          name,
          value: value as number,
          config: EMOTION_CONFIG[name] || { color: "#64748b", gradient: "from-slate-400 to-slate-600", icon: <Meh size={14} />, label: name },
        }));
    }
    return [];
  }, [emotions]);

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
            <Brain size={16} className="text-blue-400" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/80">
              Emotion Analysis
            </span>
          </div>
          {recording && (
            <div className="flex items-center gap-2 bg-red-500/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-red-500/20">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-red-400">
                REC {recTime}s
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-emerald-400" />
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
            Secure & Private
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">

        <div className="relative">
          <div 
            className="relative rounded-2xl overflow-hidden bg-black/60 backdrop-blur-md border transition-all duration-500 shadow-2xl shadow-black/80"
            style={{ 
              borderColor: dominantEmotion ? `${currentEmotionConfig.color}40` : "rgba(255,255,255,0.1)",
              boxShadow: dominantEmotion ? `0 0 40px ${currentEmotionConfig.color}15, inset 0 0 20px ${currentEmotionConfig.color}05` : "none"
            }}
          >
            <div className="relative aspect-video bg-neutral-950 overflow-hidden">
              {secureReady ? (
                <>
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="h-full w-full object-cover opacity-90"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none z-10"
                  />
                  {scanning && (
                    <div className="absolute inset-0 bg-gradient-to-b from-[var(--amber-gold)]/5 via-[var(--amber-gold)]/10 to-[var(--amber-gold)]/5 pointer-events-none z-20">
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--amber-gold)] to-transparent"
                        style={{
                          top: `${scanProgress}%`,
                          boxShadow: "0 0 25px 4px var(--amber-gold)",
                          transition: "top 0.1s ease-out",
                        }}
                      />
                    </div>
                  )}
                  {showResults && dominantEmotion && (
                    <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none">
                      <div className="bg-black/80 backdrop-blur-lg rounded-xl p-4 border border-white/10 shadow-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-500 hover:scale-105"
                            style={{ backgroundColor: `${currentEmotionConfig.color}20`, border: `1px solid ${currentEmotionConfig.color}40` }}
                          >
                            {currentEmotionConfig.icon}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white tracking-wide">
                              {currentEmotionConfig.label}
                            </div>
                            {confidence !== null && (
                              <div className="text-[10px] uppercase tracking-wider text-white/50">
                                {Math.round(confidence * 100)}% reliability
                              </div>
                            )}
                          </div>
                          <CheckCircle2 size={16} className="ml-auto text-emerald-400" />
                        </div>
                        <div className="grid grid-cols-4 gap-2 border-t border-white/5 pt-2.5">
                          {emotionBars.slice(0, 4).map((item) => (
                            <div key={item.name} className="text-center">
                              <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1">{item.name}</div>
                              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(item.value * 100, 5)}%`,
                                    backgroundColor: item.config.color,
                                  }}
                                />
                              </div>
                              <div className="text-[9px] font-mono text-white/60 mt-0.5">{Math.round(item.value * 100)}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 z-20">
                    <span className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-[var(--amber-gold)]/40 rounded-tl-md" />
                    <span className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-[var(--amber-gold)]/40 rounded-tr-md" />
                    <span className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-[var(--amber-gold)]/40 rounded-bl-md" />
                    <span className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-[var(--amber-gold)]/40 rounded-br-md" />
                  </div>
                  <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20">
                    <div className="flex items-center gap-2">
                      <Scan size={12} className="text-white/60" />
                      <span className="font-mono text-[9px] text-white/60 uppercase tracking-[0.2em]">
                        Neural Perception Stack
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/5">
                      <Radio size={10} className="text-[var(--amber-gold)] animate-pulse" />
                      <span className="font-mono text-[9px] text-[var(--amber-gold)] tracking-wider">LIVE</span>
                    </div>
                  </div>
                  {recording && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none z-20">
                      <div className="flex items-center gap-2 bg-red-950/80 backdrop-blur-sm rounded-full px-4 py-1.5 border border-red-500/30 shadow-lg">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-mono text-[9px] text-red-400 uppercase tracking-[0.25em]">
                          MONITORING {recTime}s / 15s
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <CameraOff size={28} className="text-white/30" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/60">Camera Offline</div>
                    <div className="text-[10px] text-white/35 uppercase tracking-widest mt-1">Requires HTTPS context</div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-black/80 p-4 border-t border-white/5">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCapture}
                  disabled={!secureReady || loading || modelsLoading || !modelsLoaded}
                  className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-[var(--rust)] bg-black/45 text-[var(--cream)] font-mono text-[10px] uppercase tracking-[0.25em] transition-all hover:bg-[var(--amber-gold)] hover:text-black hover:border-[var(--amber-gold)] hover:shadow-[0_0_15px_rgba(232,220,200,0.15)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {analyzing ? (
                    <>
                      <Activity size={12} className="animate-pulse" />
                      Analyzing
                    </>
                  ) : modelsLoading ? (
                    <>
                      <Activity size={12} className="animate-pulse" />
                      Loading
                    </>
                  ) : (
                    <>
                      <Camera size={12} />
                      Capture Frame
                    </>
                  )}
                </button>
                <button
                  onClick={handleAutoCapture}
                  disabled={!secureReady || loading || modelsLoading || !modelsLoaded}
                  className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border font-mono text-[10px] uppercase tracking-[0.25em] transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    recording
                      ? "bg-red-950/40 border-red-500/40 text-red-400 hover:bg-red-500 hover:text-black hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      : "bg-black/45 border-[var(--rust)] text-[var(--cream)] hover:bg-[var(--amber-gold)] hover:text-black hover:border-[var(--amber-gold)] hover:shadow-[0_0_15px_rgba(232,220,200,0.15)]"
                  }`}
                >
                  {recording ? (
                    <>
                      <Square size={12} />
                      Stop ({15 - recTime}s)
                    </>
                  ) : (
                    <>
                      <Play size={12} />
                      Auto Analyze
                    </>
                  )}
                </button>
                <label className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-[var(--rust)] bg-black/45 text-[var(--cream)] font-mono text-[10px] uppercase tracking-[0.25em] transition-all hover:bg-[var(--amber-gold)] hover:text-black hover:border-[var(--amber-gold)] hover:shadow-[0_0_15px_rgba(232,220,200,0.15)] cursor-pointer text-center">
                  <Upload size={12} />
                  Upload Image
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">

          {modelsLoading && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Activity size={14} className="text-blue-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-medium text-blue-400">Loading Models</div>
                  <div className="text-[10px] text-white/30">Initializing face detection...</div>
                </div>
              </div>
            </div>
          )}
          {modelsError && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-xs text-red-400">{modelsError}</span>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">
              Detected Emotion
            </div>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500"
                style={{
                  backgroundColor: `${currentEmotionConfig.color}15`,
                  border: `1px solid ${currentEmotionConfig.color}30`,
                  boxShadow: `0 0 30px ${currentEmotionConfig.color}10`,
                }}
              >
                <div style={{ color: currentEmotionConfig.color }}>
                  {currentEmotionConfig.icon}
                </div>
              </div>
              <div>
                <div className="text-xl font-semibold text-white">
                  {currentEmotionConfig.label}
                </div>
                {confidence !== null && (
                  <div className="text-sm text-white/50 mt-0.5">
                    {Math.round(confidence * 100)}% confidence
                  </div>
                )}
              </div>
            </div>
          </div>

          {emotionBars.length > 0 && (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">
                Emotion Spectrum
              </div>
              <div className="space-y-3">
                {emotionBars.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/60 flex items-center gap-2">
                        <span style={{ color: item.config.color }}>{item.config.icon}</span>
                        {item.config.label}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: item.config.color }}>
                        {Math.round(item.value * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.max(item.value * 100, 3)}%`,
                          backgroundColor: item.config.color,
                          boxShadow: item.value > 0.3 ? `0 0 12px ${item.config.color}40` : "none",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {labels.length > 0 && (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">
                Vision Analysis
              </div>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/60"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {imageUrl && (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">
                Captured Frame
              </div>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10">
                <img src={imageUrl} alt="Captured" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <LoadingSpinner />
            <div>
              <div className="text-sm font-medium text-blue-400 flex items-center gap-2">
                <Activity size={14} className="animate-pulse" />
                Processing Neural Analysis
              </div>
              <div className="text-xs text-white/30 mt-1">
                Running face detection + emotion classification + vision analysis
              </div>
            </div>
            <div className="ml-auto">
              <div className="text-xs font-mono text-blue-400">{scanProgress}%</div>
            </div>
          </div>
          <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-medium text-red-400">Error</div>
            <div className="text-sm text-red-300/80 mt-1">{error}</div>
          </div>
        </div>
      )}

      {!imageUrl && !loading && (
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">
            How It Works
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Camera size={16} />, label: "Capture", desc: "Take a photo or record 15s" },
              { icon: <Brain size={16} />, label: "Analyze", desc: "AI detects 7 emotions" },
              { icon: <Sparkles size={16} />, label: "Results", desc: "See your emotion spectrum" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  {step.icon}
                </div>
                <div>
                  <div className="text-xs font-medium text-white/80">{step.label}</div>
                  <div className="text-[10px] text-white/30">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
