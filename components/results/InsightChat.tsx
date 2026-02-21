"use client";

import { useEffect, useMemo, useState } from "react";

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
      const data = await response.json();
      const reply: ChatMessage = {
        id: window.crypto?.randomUUID?.() ?? `${Date.now()}-a`,
        role: "assistant",
        content: data?.content ?? "No response.",
        timestamp: Date.now() + 1,
      };
      setMessages((prev) => [...prev, reply]);
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
        <button
          onClick={handleClear}
          className="border border-[var(--cream)] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-[var(--cream)]"
        >
          Clear Log
        </button>
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
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a question or how you feel..."
          className="w-full border border-white/10 bg-[var(--bg-secondary)] px-4 py-3 text-sm uppercase tracking-[0.2em] text-[var(--cream)] outline-none"
        />
        <button onClick={handleSend} className="button-outline text-xs" disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
