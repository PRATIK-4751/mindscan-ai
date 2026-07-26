"use client";

import { useEffect, useMemo, useState } from "react";
import RiskGauge from "../../components/results/RiskGauge";
import ScoreBreakdown from "../../components/results/ScoreBreakdown";
import ShapChart from "../../components/results/ShapChart";
import EmotionSummary from "../../components/results/EmotionSummary";
import Recommendations from "../../components/results/Recommendations";
import AudioTherapy from "../../components/results/AudioTherapy";
import PDFReport from "../../components/results/PDFReport";
import InsightChat from "../../components/results/InsightChat";
import SessionHistory from "../../components/results/SessionHistory";
import type { AnalysisResult, LimeWord, ShapValue } from "../../lib/types";

interface StoredResult {
  combined: AnalysisResult;
  textResult: { text_score: number; lime_words: LimeWord[]; shap_values?: ShapValue[]; shap_method?: string; text?: string; reply?: string; detected_emotions?: string[] } | null;
  faceResult: { face_score: number; detected_face_emotion: string; emotions?: Record<string, number> | null; dominant_emotion?: string | null; emotion_confidence?: number | null; google_labels?: string[] } | null;
  voiceResult: { voice_score: number; detected_voice_emotion: string; transcript?: string; shap_values?: ShapValue[]; shap_method?: string } | null;
  phq9Result: { phq9_score: number; phq9_total?: number; phq9_severity?: string } | null;
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
  const [shapValues, setShapValues] = useState<ShapValue[]>([]);
  const [shapMethod, setShapMethod] = useState<string>("unavailable");
  const [faceEmotion, setFaceEmotion] = useState("Neutral");
  const [voiceEmotion, setVoiceEmotion] = useState("Neutral");
  const [textReply, setTextReply] = useState<string | null>(null);
  const [textEmotions, setTextEmotions] = useState<string[]>([]);
  const [faceEmotions, setFaceEmotions] = useState<Record<string, number> | null>(null);
  const [faceLabels, setFaceLabels] = useState<string[]>([]);
  const [phq9Severity, setPhq9Severity] = useState("Minimal");
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("mindscan-result");
    if (!stored) {
      setDataLoaded(true);
      return;
    }
    try {
      const parsed: StoredResult = JSON.parse(stored);
      const combined = parsed.combined;
      if (combined) {
        setResult({
          ...defaultResult,
          ...combined,
          risk_level: combined.risk_level || "Low Risk",
        });
      }
      setLimeWords(parsed.textResult?.lime_words ?? combined?.lime_words ?? []);
      setShapValues(parsed.textResult?.shap_values ?? []);
      setShapMethod(parsed.textResult?.shap_method ?? "unavailable");
      setTextReply(parsed.textResult?.reply ?? null);
      setTextEmotions(parsed.textResult?.detected_emotions ?? []);
      setFaceEmotion(parsed.faceResult?.detected_face_emotion ?? combined?.detected_face_emotion ?? "Neutral");
      setVoiceEmotion(parsed.voiceResult?.detected_voice_emotion ?? combined?.detected_voice_emotion ?? "Neutral");
      setFaceEmotions(parsed.faceResult?.emotions ?? null);
      setFaceLabels(parsed.faceResult?.google_labels ?? []);
      setPhq9Severity(parsed.phq9Result?.phq9_severity ?? combined?.phq9_severity ?? "Minimal");
    } catch (e) {
      console.error("Failed to parse results:", e);
    } finally {
      setDataLoaded(true);
    }
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

  const hasData = result.text_score > 0 || result.face_score > 0 || result.voice_score > 0 || result.phq9_score > 0;

  if (!dataLoaded) {
    return (
      <main className="relative min-h-screen text-[var(--cream)]">
        <div className="fixed inset-0 -z-10 bg-[url('/brain.jpg')] bg-cover bg-center opacity-10" />
        <div className="fixed inset-0 -z-10 bg-black/90" />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="font-display text-lg uppercase tracking-[0.3em] text-[var(--amber-gold)]">
              Loading results...
            </div>
            <div className="font-mono mt-2 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Processing screening data
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-[var(--cream)]">
      <div className="fixed inset-0 -z-10 bg-[url('/brain.jpg')] bg-cover bg-center opacity-10" />
      <div className="fixed inset-0 -z-10 bg-black/90" />
      <div id="results-report" className="mx-auto w-full max-w-6xl px-6 pt-32 pb-16">

        {!hasData && (
          <div className="mb-8 border border-[var(--amber-gold)]/30 bg-[var(--amber-gold)]/5 p-6 text-center">
            <div className="font-display text-lg uppercase tracking-[0.3em] text-[var(--amber-gold)]">
              No screening data found
            </div>
            <p className="font-mono mt-2 text-xs text-[var(--text-muted)]">
              Complete at least one screening tab to see results here. Go back to start a screening session.
            </p>
            <a
              href="/screening"
              className="font-display mt-4 inline-block border border-[var(--cream)] px-6 py-2 text-xs uppercase tracking-[0.3em] text-[var(--cream)] hover:bg-[var(--cream)] hover:text-black transition-colors"
            >
              Start Screening
            </a>
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <RiskGauge score={result.final_score * 100} riskLevel={result.risk_level} />
          <ScoreBreakdown
            scores={scores}
            finalScore={result.final_score}
            riskLevel={result.risk_level}
          />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="card-shell p-6">
            {shapValues.length > 0 ? (
              <ShapChart data={shapValues} title="SHAP EXPLAINABILITY" />
            ) : (
              <ShapChart data={limeWords.map(w => ({ feature: w.word, value: w.score, shap_value: w.score, contribution: w.score }))} title="LINGUISTIC EVIDENCE" />
            )}
            {shapMethod && shapMethod !== "unavailable" && (
              <div className="mt-2 text-right">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                  Method: {shapMethod}
                </span>
              </div>
            )}
            {textReply && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] mb-2">
                  AI Analysis Summary
                </div>
                <p className="font-body text-sm leading-relaxed text-[var(--cream)]/80">
                  {textReply}
                </p>
              </div>
            )}
            {textEmotions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {textEmotions.map((emo) => (
                  <span
                    key={emo}
                    className="border border-[var(--amber-gold)]/30 bg-[var(--amber-gold)]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-[var(--amber-gold)]"
                  >
                    {emo}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <EmotionSummary faceEmotion={faceEmotion} voiceEmotion={voiceEmotion} />

            {faceEmotions && (
              <div className="bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--cream)]/60 mb-3">
                  Facial Emotion Breakdown
                </div>
                <div className="space-y-2">
                  {Object.entries(faceEmotions)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([name, value]) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--cream)]/70 w-16">
                          {name}
                        </span>
                        <div className="flex-1 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max((value as number) * 100, 2)}%`,
                              backgroundColor: name === dominantEmotionColor(faceEmotions) ? "#00ccff" : "#555",
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[#00ccff] w-10 text-right">
                          {Math.round((value as number) * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {faceLabels.length > 0 && (
              <div className="bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--cream)]/60 mb-2">
                  Vision Labels
                </div>
                <div className="flex flex-wrap gap-2">
                  {faceLabels.map((label) => (
                    <span
                      key={label}
                      className="font-mono text-[10px] px-2 py-1 bg-[#1a1a2e] border border-[#333] text-[#00ccff] rounded"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12">
          {phq9Severity !== "Minimal" && (
            <div className="mb-6 border border-[var(--rust)]/30 bg-[var(--rust)]/5 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--rust)]">
                PHQ-9 Severity: {phq9Severity}
              </div>
            </div>
          )}
          <h3 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--cream)] sm:text-2xl">
            Recommendations
          </h3>
          <div className="mt-6">
            <Recommendations riskLevel={result.risk_level} />
            <AudioTherapy riskLevel={result.risk_level} />
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <InsightChat />
          <SessionHistory />
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

function dominantEmotionColor(emotions: Record<string, number>): string {
  let best = "";
  let bestVal = -1;
  for (const [k, v] of Object.entries(emotions)) {
    if ((v as number) > bestVal) {
      bestVal = v as number;
      best = k;
    }
  }
  return best;
}
