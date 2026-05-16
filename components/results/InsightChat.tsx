"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Mic, Volume2, Loader2 } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const STORAGE_KEY = "mindscan-chat-history";
const SYSTEM_PROMPT =
  "You are MindScan AI, a calm, supportive assistant. Provide short, non-clinical guidance, avoid diagnosis, and suggest seeking professional help if user mentions crisis, harm, or severe distress.";

// Format assistant messages with better structure and readability
function AssistantMessage({ content }: { content: string }) {
  // Split content into paragraphs by double newlines
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="font-body space-y-4 leading-relaxed text-[var(--amber-gold)]">
      {paragraphs.map((paragraph, idx) => {
        // Check if this paragraph is a table
        if (paragraph.includes("|") && paragraph.includes("---")) {
          return <TableContent key={idx} content={paragraph} />;
        }
        // Check if this paragraph is a numbered/ordered list
        if (/^\d+\./.test(paragraph.split("\n")[0] ?? "")) {
          return <OrderedListContent key={idx} content={paragraph} />;
        }
        // Check if this paragraph is a bullet list
        if (paragraph.includes("**") || paragraph.startsWith("-")) {
          return <BulletListContent key={idx} content={paragraph} />;
        }
        // Regular paragraph
        return <p key={idx} className="whitespace-pre-wrap">{paragraph}</p>;
      })}
    </div>
  );
}

// Render table content
function TableContent({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0]?.split("|").filter((h) => h.trim()) || [];
  const rows = lines.slice(2); // Skip header and separator

  return (
    <div className="my-4 overflow-hidden rounded border border-white/10">
      <table className="w-full text-left text-xs">
        <thead className="bg-[var(--rust)] text-[var(--cream)] uppercase tracking-[0.2em]">
          <tr>
            {headers.map((header, idx) => (
              <th key={idx} className="px-3 py-2 font-semibold">
                {header.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row, rowIdx) => {
            const cells = row.split("|").filter((c) => c.trim());
            return (
              <tr key={rowIdx} className="even:bg-black/20">
                {cells.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-[var(--text-muted)]">
                    {parseInlineFormatting(cell.trim())
                    }
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Parse inline formatting like bold text
function parseInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-semibold text-[var(--cream)]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Render ordered list content
function OrderedListContent({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim());

  return (
    <ol className="mt-4 space-y-3 pl-6 text-[var(--text-muted)]">
      {lines.map((line, idx) => {
        const cleanLine = line.replace(/^\d+\.\s*/, "").trim();
        return (
          <li key={idx} className="leading-relaxed">
            {parseInlineFormatting(cleanLine)}
          </li>
        );
      })}
    </ol>
  );
}

// Render bullet list content
function BulletListContent({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim());

  return (
    <ul className="mt-4 space-y-2 pl-6 text-[var(--text-muted)]">
      {lines.map((line, idx) => {
        const cleanLine = line.replace(/^[-*]\s*/, "").replace(/^\*\*.*?\*\*\s*/, "").trim();
        return (
          <li key={idx} className="leading-relaxed">
            {parseInlineFormatting(cleanLine)}
          </li>
        );
      })}
    </ul>
  );
}

export default function InsightChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playVoice = async (text: string) => {
    try {
      setSpeaking(true);
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      audio.play();
    } catch (e) {
      console.error(e);
      setSpeaking(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onerror = (e: any) => console.error(e);
    recognition.onend = () => setListening(false);
    
    recognition.start();
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    setMessages(JSON.parse(stored));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const ordered = useMemo(() => messages.sort((a, b) => a.timestamp - b.timestamp), [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMessage: ChatMessage = {
      id: window.crypto?.randomUUID?.() ?? `${Date.now()}-u`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          messages: [...messages, userMessage].map((item) => ({ role: item.role, content: item.content })),
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        // If Vercel timed out and returned an HTML 504 Gateway Timeout page
        throw new Error("I'm experiencing connection issues right now. Please try again later. Take a deep breath.");
      }

      const reply: ChatMessage = {
        id: window.crypto?.randomUUID?.() ?? `${Date.now()}-a`,
        role: "assistant",
        content: data?.content ?? "No response.",
        timestamp: Date.now() + 1,
      };
      setMessages((prev) => [...prev, reply]);
      
      // Auto-play the response using ElevenLabs
      if (data?.content) {
        playVoice(data.content);
      }
    } catch (error) {
      const reply: ChatMessage = {
        id: window.crypto?.randomUUID?.() ?? `${Date.now()}-a`,
        role: "assistant",
        content: error instanceof Error ? error.message : "Chat failed.",
        timestamp: Date.now() + 1,
      };
      setMessages((prev) => [...prev, reply]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    window.localStorage.removeItem(STORAGE_KEY);
    if (audioRef.current) {
      audioRef.current.pause();
      setSpeaking(false);
    }
  };

  return (
    <div className="card-shell p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl uppercase tracking-[0.3em] text-[var(--cream)]">Insight Chat</h3>
          <p className="font-mono mt-2 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            System Prompt: {SYSTEM_PROMPT}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {speaking && (
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--amber-gold)]">
              <Volume2 className="animate-pulse" size={14} /> Speaking...
            </div>
          )}
          <button
            onClick={handleClear}
            className="border border-[var(--cream)] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-[var(--cream)] hover:bg-[var(--cream)] hover:text-black transition-colors"
          >
            New Chat / Clear History
          </button>
        </div>
      </div>
      <div className="mt-6 space-y-4 border border-white/10 p-4">
        {ordered.length === 0 && (
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">No messages yet.</p>
        )}
        {ordered.map((message) => (
          <div key={message.id} className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {message.role === "user" ? "You" : "MindScan"}
            </p>
            <div className={`text-sm ${message.role === "user" ? "text-[var(--cream)]" : "text-[var(--amber-gold)]"}`}>
              {message.role === "assistant" ? (
                <AssistantMessage content={message.content} />
              ) : (
                <p className="font-body leading-relaxed">{message.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button 
          onClick={startListening} 
          className={`flex items-center justify-center border border-white/10 px-4 py-3 transition-colors ${listening ? 'bg-red-500/20 text-red-500' : 'bg-[var(--bg-secondary)] text-[var(--cream)] hover:bg-white/10'}`}
          title="Voice Input"
        >
          <Mic size={18} className={listening ? "animate-pulse" : ""} />
        </button>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={listening ? "Listening..." : "Type a question or how you feel..."}
          className="w-full border border-white/10 bg-[var(--bg-secondary)] px-4 py-3 text-sm uppercase tracking-[0.2em] text-[var(--cream)] outline-none"
        />
        <button onClick={handleSend} className="button-outline text-xs min-w-[100px] flex items-center justify-center gap-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={14} /> : "Send"}
        </button>
      </div>
    </div>
  );
}
