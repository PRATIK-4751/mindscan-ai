"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TextTab, { type TextTabResult } from "../../components/screening/TextTab";
import FaceTab, { type FaceTabResult } from "../../components/screening/FaceTab";
import VoiceTab, { type VoiceTabResult } from "../../components/screening/VoiceTab";
import PHQ9Tab, { type PHQ9TabResult } from "../../components/screening/PHQ9Tab";
import TabProgress from "../../components/screening/TabProgress";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { analyzeCombined } from "../../lib/api";
import type { AnalysisResult } from "../../lib/types";

type TabKey = "text" | "face" | "voice" | "phq9";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "text", label: "01_TEXT" },
  { key: "face", label: "02_FACE" },
  { key: "voice", label: "03_VOICE" },
  { key: "phq9", label: "04_PHQ-9" },
];

export default function ScreeningPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("text");
  const [textResult, setTextResult] = useState<TextTabResult | null>(null);
  const [faceResult, setFaceResult] = useState<FaceTabResult | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceTabResult | null>(null);
  const [phq9Result, setPhq9Result] = useState<PHQ9TabResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completed = useMemo(
    () => ({
      text: !!textResult,
      face: !!faceResult,
      voice: !!voiceResult,
      phq9: !!phq9Result,
    }),
    [textResult, faceResult, voiceResult, phq9Result]
  );

  const handleAnalyzeAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const combined = await analyzeCombined({
        text_score: textResult?.text_score ?? 0,
        face_score: faceResult?.face_score ?? 0,
        voice_score: voiceResult?.voice_score ?? 0,
        phq9_score: phq9Result?.phq9_score ?? 0,
      });
      const payload = {
        combined,
        textResult,
        faceResult,
        voiceResult,
        phq9Result,
      };
      window.sessionStorage.setItem("mindscan-result", JSON.stringify(payload));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run combined analysis.");
    } finally {
      setLoading(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "text":
        return <TextTab onComplete={setTextResult} value={textResult?.text ?? ""} />;
      case "face":
        return <FaceTab onComplete={setFaceResult} />;
      case "voice":
        return <VoiceTab onComplete={setVoiceResult} />;
      case "phq9":
        return <PHQ9Tab onComplete={setPhq9Result} />;
      default:
        return null;
    }
  };

  return (
    <main className="relative min-h-screen bg-[#1a0a08] text-[var(--cream)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[url('/notice.jpg')] bg-cover bg-center opacity-20" />
      <div className="border-t-[3px] border-[var(--amber-gold)]" />
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
                  active
                    ? "border-[var(--amber-gold)] bg-[var(--amber-gold)] text-black"
                    : "border-[var(--rust)] text-[var(--cream)] hover:border-[var(--cream)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {renderTab()}
        {loading && (
          <div className="mt-6 card-shell p-6">
            <LoadingSpinner />
          </div>
        )}
        {error && <div className="mt-6 border border-[var(--danger)] p-4 text-sm text-[var(--danger)]">{error}</div>}
      </section>
      <TabProgress completed={completed} onAnalyzeAll={handleAnalyzeAll} />
    </main>
  );
}
