"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

const EMOTION_MAP: Record<string, string> = {
  neutral: "Neutral",
  happy: "Happy",
  sad: "Sad",
  angry: "Angry",
  fearful: "Fear",
  disgusted: "Disgust",
  surprised: "Surprise",
};

export interface FaceDetectionResult {
  emotions: Record<string, number>;
  dominant_emotion: string;
  confidence: number;
  face_detected: boolean;
}

interface UseFaceDetectionOptions {
  minConfidence?: number;
}

export function useFaceDetection(options?: UseFaceDetectionOptions) {
  const minConfidence = options?.minConfidence ?? 0.5;
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef<faceapi.TinyFaceDetectorOptions | null>(null);
  const loadingRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await (faceapi.nets.tinyFaceDetector as any).loadFromUri(MODEL_URL);
        await (faceapi.nets.faceExpressionNet as any).loadFromUri(MODEL_URL);
        optionsRef.current = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.4,
        });
        if (!cancelled) {
          setModelsLoaded(true);
          setLoading(false);
          loadingRef.current = false;
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load face detection models.");
          setLoading(false);
          loadingRef.current = false;
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const detect = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetectionResult> => {
    if (!optionsRef.current) {
      return {
        emotions: { Neutral: 1.0 },
        dominant_emotion: "Neutral",
        confidence: 0,
        face_detected: false,
      };
    }

    const detection = await faceapi
      .detectSingleFace(input, optionsRef.current)
      .withFaceExpressions();

    if (!detection) {
      return {
        emotions: { Neutral: 1.0 },
        dominant_emotion: "Neutral",
        confidence: 0,
        face_detected: false,
      };
    }

    const rawExpressions = detection.expressions;
    const emotions: Record<string, number> = {};
    let bestName = "Neutral";
    let bestScore = 0;

    for (const [key, value] of Object.entries(rawExpressions)) {
      const mapped = EMOTION_MAP[key] || key;
      emotions[mapped] = Math.round(value * 100) / 100;
      if (value > bestScore) {
        bestScore = value;
        bestName = mapped;
      }
    }

    return {
      emotions,
      dominant_emotion: bestName,
      confidence: Math.round(bestScore * 100) / 100,
      face_detected: true,
    };
  }, []);

  return { modelsLoaded, loading, error, detect };
}
