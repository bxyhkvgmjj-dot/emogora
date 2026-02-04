// app/chat/ChatClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatClientProps = {
  mode?: string;
};

type Message = {
  id?: string; // from DB
  role: "user" | "ai";
  text: string;
  createdAt?: string | null; // from DB
};

type ModeMeta = {
  title: string;
  subtitle: string;
  accent: string;
  emoji: string;
  chip: string;
};

type ConversationItem = {
  id: string;
  title?: string;
  preview: string;
  date: string;
};

type NoteItem = {
  id: string;
  mode: string;
  createdAt: string;
  content: string;
};

type ChatAction = "reply" | "regenerate" | "shorter" | "deeper" | "more_empathetic";

const MODE_LABELS: Record<string, ModeMeta> = {
  feel: {
    title: "Feel & Reflect",
    subtitle: "Gentle emotional support, self-reflection, and inner calm.",
    accent: "from-pink-500 to-rose-500",
    emoji: "💜",
    chip: "Emotional Space",
  },
  plan: {
    title: "Plan & Execute",
    subtitle: "Daily discipline, structure, and realistic next steps.",
    accent: "from-emerald-500 to-lime-400",
    emoji: "📅",
    chip: "Action Space",
  },
  grow: {
    title: "Grow My Career & Biz",
    subtitle: "Clarity, communication and confident moves for your work and business.",
    accent: "from-indigo-500 to-violet-400",
    emoji: "🚀",
    chip: "Growth Space",
  },
};

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupLabelFor(dateIso: string) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "Earlier";

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const t = startOfLocalDay(d);

  if (t >= todayStart) return "Today";
  if (t >= yesterdayStart) return "Yesterday";
  return "Earlier";
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">Typing</span>
      <span className="h-2 w-2 rounded-full bg-fuchsia-400/80 animate-bounce [animation-delay:-0.20s]" />
      <span className="h-2 w-2 rounded-full bg-violet-400/80 animate-bounce [animation-delay:-0.10s]" />
      <span className="h-2 w-2 rounded-full bg-rose-400/80 animate-bounce" />
    </div>
  );
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function readNotes(): NoteItem[] {
  try {
    const key = "emogora_notes_v1";
    return JSON.parse(window.localStorage.getItem(key) || "[]") as NoteItem[];
  } catch {
    return [];
  }
}

function writeNotes(next: NoteItem[]) {
  try {
    const key = "emogora_notes_v1";
    window.localStorage.setItem(key, JSON.stringify(next.slice(0, 200)));
  } catch {}
}

export default function ChatClient({ mode }: ChatClientProps) {
  const space = mode ?? "feel";
  const modeMeta = MODE_LABELS[space] ?? MODE_LABELS["feel"];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [memory, setMemory] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [chatError, setChatError] = useState<string | null>(null);

  // toast / notes UI
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<NoteItem[]>([]);

  const chatRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const MEMORY_KEY = `emogora_memory_${space}`;
  const SUMMARY_EVERY = 10;

  // -------------------------
  // UI preference: show/hide tools under AI
  // -------------------------
  const TOOLS_KEY = `emogora_tools_visible_v1_${space}`;
  const [showTools, setShowTools] = useState(true);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(TOOLS_KEY);
      if (v === "0") setShowTools(false);
      if (v === "1") setShowTools(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TOOLS_KEY]);

  const toggleTools = () => {
    setShowTools((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(TOOLS_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1800) as unknown as number;
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // -------------------------
  // Logout
  // -------------------------
  const logout = async () => {
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      window.location.href = "/login";
    }
  };

  // -------------------------
  // Auth guard
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data } = await supabase.auth.getUser();
        if (!cancelled && !data.user) window.location.href = "/login";
      } catch {
        if (!cancelled) window.location.href = "/login";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------
  // Memory load per mode
  // -------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(MEMORY_KEY);
      setMemory(stored ? stored : null);
    } catch (e) {
      console.warn("Failed to read memory from localStorage", e);
      setMemory(null);
    }
  }, [MEMORY_KEY]);

  // -------------------------
  // Load one conversation messages
  // -------------------------
  const loadConversation = async (id: string) => {
    setConversationId(id);
    setIsLoadingHistory(true);
    setChatError(null);

    try {
      const res = await fetch(
        `/api/chat?mode=${encodeURIComponent(space)}&conversationId=${encodeURIComponent(id)}`
      );

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Failed to load conversation");

      const data: { messages?: Message[] } = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      console.error("Error loading conversation:", err);
      setMessages([]);
      setChatError("Could not load this conversation. Please try again.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // -------------------------
  // Fetch conversations list
  // -------------------------
  const refreshConversations = async (opts?: { selectLatestIfEmpty?: boolean }) => {
    setIsLoadingConversations(true);
    setChatError(null);

    try {
      const res = await fetch(`/api/history?mode=${encodeURIComponent(space)}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data: { conversations?: ConversationItem[] } = await res.json();
      const list = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(list);

      if (opts?.selectLatestIfEmpty && !conversationId) {
        if (list.length > 0) {
          await loadConversation(list[0].id);
        } else {
          setConversationId(null);
          setMessages([]);
          setIsLoadingHistory(false);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setChatError("Could not load your history. Please refresh the page.");
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    setConversationId(null);
    setMessages([]);
    setIsLoadingHistory(true);
    void refreshConversations({ selectLatestIfEmpty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space]);

  // -------------------------
  // New chat
  // -------------------------
  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setIsLoadingHistory(false);
    setChatError(null);
    setInput("");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  // -------------------------
  // Auto-scroll
  // -------------------------
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  // -------------------------
  // Typewriter effect
  // -------------------------
  const streamTimerRef = useRef<number | null>(null);

  function streamAiReply(fullText: string) {
    if (streamTimerRef.current) {
      window.clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    let index = 0;
    const step = 3;
    const delay = 14;

    setMessages((prev) => [...prev, { role: "ai", text: "" }]);

    const tick = () => {
      index += step;

      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const last = updated[lastIndex];
        if (!last || last.role !== "ai") return prev;
        updated[lastIndex] = { ...last, text: fullText.slice(0, index) };
        return updated;
      });

      if (index < fullText.length) {
        streamTimerRef.current = window.setTimeout(tick, delay) as unknown as number;
      } else {
        setIsTyping(false);
        streamTimerRef.current = null;
      }
    };

    tick();
  }

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) window.clearTimeout(streamTimerRef.current);
    };
  }, []);

  // -------------------------
  // Memory summarization
  // -------------------------
  const maybeUpdateMemory = async (fullMessages: Message[]) => {
    try {
      if (fullMessages.length < SUMMARY_EVERY) return;
      if (typeof window === "undefined") return;
      if (fullMessages.length % SUMMARY_EVERY !== 0) return;

      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: space,
          messages: fullMessages.slice(-SUMMARY_EVERY),
          previousSummary: memory ?? undefined,
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) return;

      const data: { summary?: string } = await res.json();
      if (!data.summary) return;

      setMemory(data.summary);
      window.localStorage.setItem(MEMORY_KEY, data.summary);
    } catch (err) {
      console.error("Failed to update memory:", err);
    }
  };

  // -------------------------
  // Smart suggestions
  // -------------------------
  const getSmartSuggestions = useMemo(() => {
    if (space === "plan")
      return ["✅ Turn this into a checklist", "🗓️ Make a 7-day plan", "⚠️ What’s the biggest risk here?"];
    if (space === "grow")
      return ["🎯 Give me 3 strategy options", "🧠 Ask 1 question to sharpen this", "✍️ Rewrite this as a message/email"];
    return ["🌿 Summarize in 3 bullets", "🧩 Give me 2 gentle next steps", "❓ Ask 1 question to understand me better"];
  }, [space]);

  // -------------------------
  // Message tools
  // -------------------------
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied ✓");
    } catch (e) {
      console.warn("Clipboard write failed:", e);
      showToast("Copy failed");
    }
  };

  const quoteSelectionIntoInput = () => {
    const sel = window.getSelection()?.toString()?.trim();
    if (!sel) return;
    setInput((prev) => (prev ? `${prev}\n\n> ${sel}` : `> ${sel}`));
    showToast("Quoted into input ✓");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const saveAsNote = (text: string) => {
    const next: NoteItem[] = [
      {
        id: window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
        mode: space,
        createdAt: new Date().toISOString(),
        content: text,
      },
      ...readNotes(),
    ];
    writeNotes(next);
    setNotes(next);
    showToast("Saved to Notes ✓");
  };

  const openNotes = () => {
    const list = readNotes();
    setNotes(list);
    setNotesOpen(true);
  };

  const deleteNote = (id: string) => {
    const next = readNotes().filter((n) => n.id !== id);
    writeNotes(next);
    setNotes(next);
    showToast("Note deleted");
  };

  // -------------------------
  // DELETE: conversation + message + turn
  // -------------------------
  const deleteConversation = async (id: string) => {
    const ok = window.confirm("Delete this conversation? This cannot be undone.");
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/conversation?mode=${encodeURIComponent(space)}&conversationId=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Delete conversation failed");
      }

      showToast("Conversation deleted ✓");

      const wasActive = conversationId === id;
      if (wasActive) {
        setConversationId(null);
        setMessages([]);
        setIsLoadingHistory(false);
      }

      await refreshConversations();

      if (wasActive) {
        const res2 = await fetch(`/api/history?mode=${encodeURIComponent(space)}`);
        if (res2.ok) {
          const data: { conversations?: ConversationItem[] } = await res2.json();
          const list = Array.isArray(data.conversations) ? data.conversations : [];
          if (list[0]?.id) void loadConversation(list[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      setChatError("Could not delete conversation. Please try again.");
    }
  };

  const deleteMessageById = async (id: string) => {
    try {
      const res = await fetch(
        `/api/message?mode=${encodeURIComponent(space)}&id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      if (res.status === 401) {
        window.location.href = "/login";
        return false;
      }
      if (!res.ok) return false;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const deleteTurnAt = async (aiIndex: number) => {
    const ai = messages[aiIndex];
    if (!ai || ai.role !== "ai") return;

    const ok = window.confirm("Delete this answer (and the question before it)?");
    if (!ok) return;

    let userIndex = -1;
    for (let i = aiIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userIndex = i;
        break;
      }
    }

    const idsToDelete: string[] = [];
    if (ai.id) idsToDelete.push(ai.id);
    if (userIndex !== -1 && messages[userIndex].id) idsToDelete.push(messages[userIndex].id!);

    setMessages((prev) => prev.filter((_, idx) => idx !== aiIndex && idx !== userIndex));
    for (const id of idsToDelete) await deleteMessageById(id);

    showToast("Deleted ✓");
    window.setTimeout(() => void refreshConversations(), 200);
  };

  // -------------------------
  // Improve using API action (updated to new actions)
  // -------------------------
  const improveLast = async (action: ChatAction) => {
    if (isTyping || isLoadingHistory) return;

    const lastAi = [...messages].reverse().find((m) => m.role === "ai");
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    let convId = conversationId;
    if (!convId) {
      convId =
        typeof window !== "undefined" && window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      setConversationId(convId);
    }

    setIsTyping(true);
    setChatError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: space,
          messages,
          memory,
          conversationId: convId,
          action,
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Request failed");

      const data: { reply?: string } = await res.json();
      const fullReply = data.reply ?? "Let’s try again.";

      // IMPORTANT: clear typing state and stream
      streamAiReply(fullReply);

      window.setTimeout(() => void refreshConversations(), 250);

      window.setTimeout(() => {
        if (convId) void loadConversation(convId);
      }, 650);

      void maybeUpdateMemory([...messages, { role: "ai", text: fullReply, id: lastAi?.id }]);
    } catch (e) {
      console.error("Improve failed:", e);
      setIsTyping(false);
      setChatError("Could not regenerate that message. Try again.");
    }
  };

  // -------------------------
  // Send message
  // -------------------------
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    if (isLoadingHistory) return;

    let convId = conversationId;
    if (!convId) {
      convId =
        typeof window !== "undefined" && window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      setConversationId(convId);
    }

    const userMessage: Message = { role: "user", text: trimmed };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    setChatError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: space,
          messages: newMessages,
          memory,
          conversationId: convId,
          action: "reply",
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Request failed");

      const data: { reply?: string } = await res.json();
      const fullReply = data.reply ?? "Let’s try again.";

      streamAiReply(fullReply);

      window.setTimeout(() => void refreshConversations(), 250);

      window.setTimeout(() => {
        if (convId) void loadConversation(convId);
      }, 650);

      void maybeUpdateMemory([...newMessages, { role: "ai", text: fullReply }]);
    } catch (error) {
      console.error("Error talking to Emogora API:", error);
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "ai", text: "Hmm — something went wrong on my side. Can you try again?" }]);
      setChatError("Message failed to send. Please try again.");
    }
  };

  // -------------------------
  // Sidebar grouping
  // -------------------------
  const grouped = useMemo(() => {
    const buckets: Record<string, ConversationItem[]> = { Today: [], Yesterday: [], Earlier: [] };
    for (const c of conversations) {
      const label = groupLabelFor(c.date);
      (buckets[label] ?? buckets.Earlier).push(c);
    }
    return buckets;
  }, [conversations]);

  // -------------------------
  // Markdown styling
  // -------------------------
  const aiProse =
    "prose prose-slate prose-base max-w-none leading-relaxed " +
    "prose-p:my-3 prose-p:leading-relaxed " +
    "prose-ul:my-3 prose-ol:my-3 " +
    "prose-li:my-1.5 " +
    "prose-strong:font-semibold prose-strong:text-slate-900 " +
    "prose-headings:my-3 prose-headings:font-semibold " +
    "prose-blockquote:my-3 prose-blockquote:border-l-fuchsia-300 prose-blockquote:bg-fuchsia-50/40 " +
    "prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-2xl " +
    "prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md " +
    "prose-pre:bg-slate-950 prose-pre:text-slate-50 prose-pre:rounded-2xl prose-pre:p-4 " +
    "prose-a:text-fuchsia-700 prose-a:no-underline hover:prose-a:underline";

  const hasAnyUserMessage = useMemo(() => messages.some((m) => m.role === "user"), [messages]);

  const lastAiIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "ai") return i;
    return -1;
  }, [messages]);

  // -------------------------
  // Mode-specific tool buttons (your spec)
  // Feel: regenerate, shorter, Deep dive, more_empathetic
  // Plan: regenerate, shorter, Deep dive
  // Grow: regenerate, shorter, Deep dive
  // -------------------------
  const refineButtons = useMemo(() => {
    const base = [
      {
        key: "regenerate" as const,
        label: "♻️ Regenerate",
        className:
          "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:from-fuchsia-400 hover:to-violet-400",
      },
      {
        key: "shorter" as const,
        label: "✂️ Shorter",
        className: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      },
      {
        key: "deeper" as const,
        label: "🧠 Deep dive",
        className: "border border-fuchsia-200 bg-fuchsia-50/70 text-fuchsia-700 hover:bg-fuchsia-50",
      },
    ];

    if (space === "feel") {
      return [
        ...base,
        {
          key: "more_empathetic" as const,
          label: "💜 More empathic",
          className: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        },
      ];
    }

    return base;
  }, [space]);

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <div className="relative min-h-screen bg-[#fdf7ff] overflow-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-95 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.16),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(circle_at_0%_100%,rgba(248,239,223,0.9),_transparent_55%)]" />

      {/* toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-700 shadow-lg backdrop-blur">
          {toast}
        </div>
      )}

      {/* notes modal */}
      {notesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNotesOpen(false)} />
          <div className="relative w-full max-w-[720px] rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <div className="text-sm font-semibold text-slate-900">Notes</div>
                <div className="text-xs text-slate-500">Saved snippets (localStorage)</div>
              </div>
              <button
                type="button"
                onClick={() => setNotesOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4 space-y-3">
              {notes.filter((n) => n.mode === space).length === 0 ? (
                <div className="text-sm text-slate-500">No notes yet. Use “Save” under an answer.</div>
              ) : (
                notes
                  .filter((n) => n.mode === space)
                  .map((n) => (
                    <div key={n.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-[11px] text-slate-500">{new Date(n.createdAt).toLocaleString()}</div>
                        <button
                          type="button"
                          onClick={() => deleteNote(n.id)}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                          title="Delete note"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="mt-2 text-sm text-slate-900 whitespace-pre-wrap">{n.content}</div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(n.content)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInput((prev) => (prev ? `${prev}\n\n${n.content}` : n.content));
                            setNotesOpen(false);
                            window.setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Insert to input
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-[1100px] px-3 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
          {/* SIDEBAR */}
          <aside className="hidden md:flex flex-col rounded-[28px] bg-white/90 backdrop-blur-xl border border-slate-100 shadow-[0_18px_50px_rgba(148,163,184,0.28)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-white/90 via-white to-rose-50/60">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs tracking-wide uppercase text-slate-500">Conversations</div>
                  <div className="text-sm font-semibold text-slate-900">{modeMeta.title}</div>
                </div>
                <div className="text-[11px] text-slate-500 whitespace-nowrap">Start fresh →</div>
              </div>
            </div>

            <div className="p-3 overflow-y-auto">
              {conversations.length === 0 && isLoadingConversations ? (
                <div className="text-xs text-slate-500 px-2 py-2">Loading conversations…</div>
              ) : conversations.length === 0 ? (
                <div className="text-xs text-slate-500 px-2 py-2">No previous chats yet.</div>
              ) : (
                <div className="space-y-4">
                  {(["Today", "Yesterday", "Earlier"] as const).map((section) => {
                    const list = grouped[section] ?? [];
                    if (list.length === 0) return null;

                    return (
                      <div key={section} className="space-y-2">
                        <div className="px-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {section}
                        </div>

                        <div className="space-y-2">
                          {list.map((c) => {
                            const active = c.id === conversationId;
                            const titleText = c.title?.trim() || c.preview?.trim() || "Conversation";

                            return (
                              <div
                                key={c.id}
                                className={classNames(
                                  "group relative w-full rounded-2xl border shadow-sm overflow-hidden transition",
                                  active
                                    ? "border-fuchsia-200 bg-fuchsia-50/60"
                                    : "border-slate-200 bg-white/70 hover:bg-slate-50"
                                )}
                              >
                                {active && (
                                  <div className="pointer-events-none absolute -inset-[2px] bg-gradient-to-br from-fuchsia-200/70 via-rose-200/60 to-violet-200/70 blur-xl opacity-70" />
                                )}

                                <button
                                  type="button"
                                  onClick={() => loadConversation(c.id)}
                                  className="relative w-full text-left px-3 py-2 rounded-2xl"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="text-[12px] font-semibold text-slate-900 line-clamp-2">
                                      {titleText}
                                    </div>

                                    {active && (
                                      <span className="shrink-0 rounded-full border border-fuchsia-200 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700">
                                        Active
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-1 text-[11px] text-slate-600 line-clamp-2">{c.preview || "—"}</div>

                                  <div className="mt-1 text-[11px] text-slate-500">{new Date(c.date).toLocaleString()}</div>
                                </button>

                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void deleteConversation(c.id);
                                    }}
                                    className="rounded-full border border-slate-200 bg-white/85 px-2 py-1 text-[11px] text-slate-600 hover:bg-white shadow-sm"
                                    title="Delete conversation"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-auto p-3 border-t border-slate-100 space-y-2">
              <a
                href="/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                <span className="text-sm">←</span>
                <span>Home</span>
              </a>

              <button
                onClick={logout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                <span className="text-sm">⎋</span>
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* MAIN CHAT */}
          <main className="relative rounded-[32px] bg-white/90 backdrop-blur-xl border border-slate-100 shadow-[0_22px_60px_rgba(148,163,184,0.35)] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-white/90 via-white to-rose-50/60">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs tracking-wide uppercase text-slate-500">{modeMeta.chip}</div>
                  <div className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span>{modeMeta.emoji}</span>
                    <span>{modeMeta.title}</span>
                  </div>
                  <div className="text-sm text-slate-600">{modeMeta.subtitle}</div>
                </div>

                <button
                  onClick={startNewChat}
                  className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-medium text-white shadow-lg bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-400 hover:to-violet-400 transition"
                >
                  ＋ New chat
                </button>
              </div>

              {chatError && (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {chatError}
                </div>
              )}
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-5">
              {isLoadingHistory ? (
                <div className="text-sm text-slate-500">Loading…</div>
              ) : messages.length === 0 ? (
                <div className="mx-auto mt-10 w-full max-w-xl rounded-3xl border border-fuchsia-100 bg-gradient-to-b from-white to-fuchsia-50/40 p-6 shadow-sm">
                  <div className="text-sm text-slate-500">Start a new chat</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">What’s on your mind today?</div>
                  <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                    Emogora is built for <span className="font-medium text-slate-900">clarity</span>,{" "}
                    <span className="font-medium text-slate-900">momentum</span>, and{" "}
                    <span className="font-medium text-slate-900">calm</span>.
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {getSmartSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setInput(s.replace(/^[^\w]+?\s*/, ""));
                          window.setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        className="rounded-full border border-fuchsia-200 bg-white/70 px-3 py-1.5 text-xs text-fuchsia-700 hover:bg-white transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isUser = m.role === "user";
                  const isLastAi = m.role === "ai" && idx === lastAiIndex;

                  const bubbleClass = isUser
                    ? "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white"
                    : "border border-fuchsia-100 bg-gradient-to-b from-white to-fuchsia-50/40 text-slate-900";

                  return (
                    <div key={`${m.id ?? "m"}_${idx}`} className="space-y-3">
                      <div
                        className={classNames(
                          "relative group",
                          "max-w-[92%] sm:max-w-[78%]",
                          isUser ? "ml-auto" : "mr-auto"
                        )}
                      >
                        <div className={classNames("rounded-3xl shadow-sm px-5 sm:px-6 py-4", bubbleClass)}>
                          {isUser ? (
                            <div className="whitespace-pre-wrap text-[13px] sm:text-sm leading-relaxed">{m.text}</div>
                          ) : (
                            <div className={aiProse}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                            </div>
                          )}
                        </div>

                        <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              if (m.role === "ai") {
                                void deleteTurnAt(idx);
                                return;
                              }

                              const ok = window.confirm("Delete this message?");
                              if (!ok) return;

                              setMessages((prev) => prev.filter((_, i) => i !== idx));
                              if (m.id) {
                                void (async () => {
                                  await deleteMessageById(m.id!);
                                  window.setTimeout(() => void refreshConversations(), 200);
                                })();
                              }
                            }}
                            className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-white shadow-sm"
                            title={m.role === "ai" ? "Delete this Q+A" : "Delete message"}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Tools under LAST AI only */}
                      {isLastAi && hasAnyUserMessage && showTools && (
                        <div className={classNames("mr-auto max-w-[92%] sm:max-w-[78%]", "space-y-3")}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(m.text)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-700 hover:bg-white transition"
                              >
                                📋 <span>Copy</span>
                              </button>
                              <button
                                type="button"
                                onClick={quoteSelectionIntoInput}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-700 hover:bg-white transition"
                              >
                                💬 <span>Quote</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => saveAsNote(m.text)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-700 hover:bg-white transition"
                              >
                                ⭐ <span>Save</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={toggleTools}
                              className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-white shadow-sm"
                              title="Hide extra tools"
                            >
                              🙈 Hide tools
                            </button>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white/70 p-2 shadow-sm">
                            <div className="flex flex-wrap gap-2">
                              {refineButtons.map((b) => (
                                <button
                                  key={b.key}
                                  type="button"
                                  onClick={() => improveLast(b.key)}
                                  className={classNames(
                                    "rounded-2xl px-3 py-2 text-xs font-medium transition",
                                    b.className
                                  )}
                                >
                                  {b.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <div className="w-full text-[11px] text-slate-500">Try next</div>
                            {getSmartSuggestions.map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  setInput(s.replace(/^[^\w]+?\s*/, ""));
                                  window.setTimeout(() => inputRef.current?.focus(), 50);
                                }}
                                className="rounded-full border border-fuchsia-200 bg-white/60 px-4 py-2 text-xs text-fuchsia-700 hover:bg-white transition"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {isTyping && (
                <div className="mr-auto max-w-[92%] sm:max-w-[78%] rounded-3xl px-5 sm:px-6 py-4 shadow-sm border border-fuchsia-100 bg-gradient-to-b from-white to-fuchsia-50/40 text-slate-900">
                  <div className="flex items-center gap-3">
                    <TypingDots />
                    <div className="text-sm text-slate-500">Thinking…</div>
                  </div>
                </div>
              )}
            </div>

            {/* INPUT */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white/80 backdrop-blur-xl">
              <div className="flex items-end gap-2">
                <div className="flex-1 rounded-3xl border border-slate-200 bg-white/90 shadow-sm focus-within:ring-2 focus-within:ring-fuchsia-200 focus-within:border-fuchsia-200 transition">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type your message…"
                    className="w-full bg-transparent px-5 py-4 text-[15px] leading-relaxed outline-none placeholder:text-slate-400"
                    disabled={isTyping || isLoadingHistory}
                  />
                </div>

                <button
                  type="button"
                  onClick={openNotes}
                  className="shrink-0 rounded-3xl px-4 py-4 text-sm border border-slate-200 bg-white/90 text-slate-700 hover:bg-white shadow-sm transition"
                  title="View Notes"
                >
                  ⭐ Notes
                </button>

                <button
                  type="button"
                  onClick={toggleTools}
                  className="shrink-0 rounded-3xl px-4 py-4 text-sm border border-slate-200 bg-white/90 text-slate-700 hover:bg-white shadow-sm transition"
                  title={showTools ? "Hide extra tools" : "Show extra tools"}
                >
                  {showTools ? "🙈 Tools" : "✨ Tools"}
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping || isLoadingHistory}
                  className={classNames(
                    "shrink-0 rounded-3xl px-6 py-4 text-sm font-medium text-white shadow-lg transition",
                    !input.trim() || isTyping || isLoadingHistory
                      ? "bg-slate-300 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-400 hover:to-violet-400"
                  )}
                >
                  Send
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Tip: balanced paragraphs + lists when needed.</span>
                <span className="hidden sm:inline">Enter to send</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
