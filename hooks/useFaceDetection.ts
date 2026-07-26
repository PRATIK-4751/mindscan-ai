"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

export interface FaceDetectionResult {
  emotions: Record<string, number>;
  dominant_emotion: string;
  confidence: number;
  face_detected: boolean;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface UseFaceDetectionOptions {
  minConfidence?: number;
}

export function useFaceDetection(options?: UseFaceDetectionOptions) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef<any>(null);

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
        }
      } catch (err) {
        console.error("[FaceDetection] Load error:", err);
        if (!cancelled) {
          setError("Failed to load face detection models.");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const detect = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetectionResult> => {
    const empty: FaceDetectionResult = {
      emotions: { Neutral: 1.0 },
      dominant_emotion: "Neutral",
      confidence: 0,
      face_detected: false,
    };

    if (!optionsRef.current) return empty;

    try {
      const detection = await faceapi
        .detectSingleFace(input, optionsRef.current)
        .withFaceExpressions();

      if (!detection) return empty;

      const rawExpressions = detection.expressions;
      const emotions: Record<string, number> = {};
      let bestName = "Neutral";
      let bestScore = 0;

      for (const [key, value] of Object.entries(rawExpressions)) {
        emotions[key] = Math.round(value * 100) / 100;
        if (value > bestScore) {
          bestScore = value;
          bestName = key;
        }
      }

      bestName = bestName.charAt(0).toUpperCase() + bestName.slice(1);
      const { x, y, width, height } = detection.detection.box;
      return {
        emotions,
        dominant_emotion: bestName,
        confidence: Math.round(bestScore * 100) / 100,
        face_detected: true,
        box: { x, y, width, height },
      };
    } catch (err) {
      console.error("[FaceDetection] Detection error:", err);
      return empty;
    }
  }, []);

  return { modelsLoaded, loading, error, detect };
}
