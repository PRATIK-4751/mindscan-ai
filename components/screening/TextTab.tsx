"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageCircle, Brain } from "lucide-react";
import { analyzeText, sendChatMessage, type TextAnalysisResponse } from "../../lib/api";
import type { LimeWord, ShapValue } from "../../lib/types";

export interface TextTabResult {
  text: string;
  text_score: number;
  lime_words: LimeWord[];
  shap_values: ShapValue[];
  shap_method?: string;
  reply?: string;
  detected_emotions?: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface TextTabProps {
  onComplete: (data: {
    text: string;
    text_score: number;
    lime_words: LimeWord[];
    shap_values: ShapValue[];
    shap_method?: string;
    reply?: string;
    detected_emotions?: string[];
  }) => void;
  value?: string;
}

export default function TextTab({ onComplete, value = "" }: TextTabProps) {
  const [text, setText] = useState(value);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TextAnalysisResponse | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleAnalyze = async () => {
    const trimmed = text.trim();
    if (!trimmed || analyzing) return;
    setAnalyzing(true);
    try {
      const result = await analyzeText(trimmed);
      setAnalysisResult(result);
      setAnalysisDone(true);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-u`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-a`,
        role: "assistant",
        content: result.reply || "Thank you for sharing. I'm here to listen.",
        timestamp: Date.now() + 1,
      };
      setChatMessages([userMsg, assistantMsg]);

      onComplete({
        text: trimmed,
        text_score: result.text_score,
        lime_words: result.lime_words,
        shap_values: result.shap_values ?? [],
        shap_method: result.shap_method,
        reply: result.reply,
        detected_emotions: result.detected_emotions,
      });
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-e`,
        role: "assistant",
        content: "I'm having trouble connecting right now. Could you try again in a moment?",
        timestamp: Date.now(),
      };
      setChatMessages([errorMsg]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleChatSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-u`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const contextMessages = [
        ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: trimmed },
      ];

      const chatSystemPrompt = `You are MindScan AI, a compassionate mental health support companion. The user just shared their personal story and you've already responded warmly. Now they're asking a follow-up question.

CONTEXT: Your initial analysis found these emotions: ${analysisResult?.detected_emotions?.join(", ") || "neutral"} with a distress level of ${analysisResult ? Math.round(analysisResult.text_score * 100) : 0}%.

STRICT RULES:
- Never diagnose or label conditions
- Never prescribe or recommend specific treatments
- If crisis language is used (self-harm, suicide, wanting to die), immediately provide 988 Lifeline and Crisis Text Line (text HOME to 741741)
- Keep responses warm, concise (2-4 sentences), and conversational
- Use reflective listening — paraphrase and validate
- This is a safe, confidential space
- Do NOT share raw scores unless explicitly asked
- Match the user's language naturally
- Be genuinely helpful, not just polite`;

      const result = await sendChatMessage(contextMessages, chatSystemPrompt);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-a`,
        role: "assistant",
        content: result.reply || "I hear you. Could you tell me more?",
        timestamp: Date.now() + 1,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-e`,
        role: "assistant",
        content: "I'm experiencing a connection issue. Please try again.",
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const emotionLabels = analysisResult?.detected_emotions?.length
    ? analysisResult.detected_emotions.join(", ")
    : null;

  return (
    <div className="space-y-6">

      {!analysisDone && (
        <>
          <div className="border border-white/10 bg-[#efe4d2] p-6 text-black">
            <label className="font-display mb-3 block text-sm uppercase tracking-[0.3em] text-[var(--rust)]">
              Share your story
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write about how you've been feeling, what's been on your mind, or anything you'd like to share..."
              className="font-body h-64 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-black/30"
            />
            <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.3em]">
              <span className="text-black/40">{text.length} characters</span>
              <span className="text-black/40">No minimum — write as much or as little as you like</span>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || analyzing}
            className="font-display flex w-full items-center justify-center gap-3 border border-[var(--cream)] py-3 text-lg uppercase tracking-[0.4em] text-[var(--cream)] disabled:opacity-40"
          >
            {analyzing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Analyzing...
              </>
            ) : (
              <>
                <Brain size={18} />
                Analyze My Story
              </>
            )}
          </button>
        </>
      )}

      {analyzing && !analysisDone && (
        <div className="card-shell p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-[var(--amber-gold)]" size={20} />
            <p className="font-body text-sm text-[var(--cream)]">
              Listening to your story and analyzing emotional patterns...
            </p>
          </div>
        </div>
      )}

      {chatMessages.length > 0 && (
        <div className="space-y-4">

          {emotionLabels && (
            <div className="flex flex-wrap gap-2">
              {analysisResult?.detected_emotions?.map((emo) => (
                <span
                  key={emo}
                  className="border border-[var(--amber-gold)]/30 bg-[var(--amber-gold)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--amber-gold)]"
                >
                  {emo}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-4 border border-white/10 p-4">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  {msg.role === "user" ? "You" : "MindScan"}
                </p>
                <div
                  className={`text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "text-[var(--cream)]"
                      : "text-[var(--amber-gold)]"
                  }`}
                >
                  {msg.content.split("\n\n").map((para, i) => (
                    <p key={i} className="font-body whitespace-pre-wrap">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
              placeholder="Ask anything about your mental health..."
              className="w-full border border-white/10 bg-[var(--bg-secondary)] px-4 py-3 text-sm uppercase tracking-[0.2em] text-[var(--cream)] outline-none"
            />
            <button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || chatLoading}
              className="button-outline flex min-w-[100px] items-center justify-center gap-2 text-xs"
            >
              {chatLoading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              {chatLoading ? "" : "Send"}
            </button>
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="card-shell p-6">
          <div className="flex items-center gap-3">
            <MessageCircle size={16} className="text-[var(--amber-gold)]" />
            <h4 className="font-display text-sm uppercase tracking-[0.3em] text-[var(--cream)]">
              Analysis Summary
            </h4>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs uppercase tracking-[0.2em]">
            <div>
              <span className="text-[var(--text-muted)]">Distress Level</span>
              <div className="mt-1 text-[var(--cream)]">
                {(analysisResult.text_score * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Emotions Detected</span>
              <div className="mt-1 text-[var(--cream)]">
                {analysisResult.detected_emotions?.join(", ") || "Neutral"}
              </div>
            </div>
          </div>
          {analysisResult.summary && (
            <p className="font-body mt-4 text-sm text-[var(--text-muted)]">
              {analysisResult.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
