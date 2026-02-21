"use client";

import { useEffect, useMemo, useState } from "react";
import RiskGauge from "../../components/results/RiskGauge";
import ScoreBreakdown from "../../components/results/ScoreBreakdown";
import LIMEChart from "../../components/results/LIMEChart";
import EmotionSummary from "../../components/results/EmotionSummary";
import Recommendations from "../../components/results/Recommendations";
import PDFReport from "../../components/results/PDFReport";
import type { AnalysisResult, LimeWord } from "../../lib/types";

interface StoredResult {
  combined: AnalysisResult;
  textResult: { text_score: number; lime_words: LimeWord[] } | null;
  faceResult: { face_score: number; detected_face_emotion: string } | null;
  voiceResult: { voice_score: number; detected_voice_emotion: string } | null;
  phq9Result: { phq9_score: number } | null;
}

const defaultResult: AnalysisResult = {
  text_score: 0,
  face_score: 0,
  voice_score: 0,
  phq9_score: 0,
  final_score: 0,
  risk_level: "Low Risk",
  lime_words: [],
  detected_face_emotion: "Neutral",
  detected_voice_emotion: "Neutral",
  phq9_total: 0,
  phq9_severity: "Minimal",
};

export default function ResultsPage() {
  const [result, setResult] = useState<AnalysisResult>(defaultResult);
  const [limeWords, setLimeWords] = useState<LimeWord[]>([]);
  const [faceEmotion, setFaceEmotion] = useState("Neutral");
  const [voiceEmotion, setVoiceEmotion] = useState("Neutral");

  useEffect(() => {
    const stored = window.sessionStorage.getItem("mindscan-result");
    if (!stored) return;
    const parsed: StoredResult = JSON.parse(stored);
    setResult(parsed.combined ?? defaultResult);
    setLimeWords(parsed.textResult?.lime_words ?? []);
    setFaceEmotion(parsed.faceResult?.detected_face_emotion ?? parsed.combined?.detected_face_emotion ?? "Neutral");
    setVoiceEmotion(parsed.voiceResult?.detected_voice_emotion ?? parsed.combined?.detected_voice_emotion ?? "Neutral");
  }, []);

  const scores = useMemo(
    () => [
      { label: "Text", value: result.text_score ?? 0 },
      { label: "Face", value: result.face_score ?? 0 },
      { label: "Voice", value: result.voice_score ?? 0 },
      { label: "PHQ-9", value: result.phq9_score ?? 0 },
    ],
    [result]
  );

  return (
    <main className="relative min-h-screen text-[var(--cream)]">
      <div className="fixed inset-0 -z-10 bg-[url('/brain.jpg')] bg-cover bg-center opacity-10" />
      <div className="fixed inset-0 -z-10 bg-black/90" />
      <div id="results-report" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <RiskGauge score={result.final_score * 100} riskLevel={result.risk_level} />
          <ScoreBreakdown scores={scores} />
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="card-shell p-6">
            <LIMEChart data={limeWords} />
          </div>
          <EmotionSummary faceEmotion={faceEmotion} voiceEmotion={voiceEmotion} />
        </div>
        <div className="mt-12">
          <h3 className="font-display text-2xl uppercase tracking-[0.3em] text-[var(--cream)]">Recommendations</h3>
          <div className="mt-6">
            <Recommendations riskLevel={result.risk_level} />
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <PDFReport targetId="results-report" />
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--amber-gold)]">
              iCall 9152987821
            </p>
            <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Not a substitute for professional medical advice. If in crisis, contact a mental health professional.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
