"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { getMarketCounts } from "@/data/helpers";
import AuthModal from "@/components/AuthModal";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string; // base64 data URL for images
};

type ChatSession = {
  id: string;
  title: string;
  has_images: boolean;
  pinned?: boolean;
  created_at: string;
  updated_at: string;
};

const SUGGESTED_PROMPTS = [
  { label: "Best markets under $250K", question: "What are the best STR markets with home prices under $250K?" },
  { label: "Top cash-on-cash cities", question: "Show me the top cities with the highest cash-on-cash return for STR investing" },
  { label: "Compare two markets", question: "Compare Gatlinburg, TN vs Pigeon Forge, TN for short-term rental investing" },
  { label: "STR regulations", question: "What are the STR regulations and market data for Tennessee?" },
  { label: "How to get started", question: "I'm a complete beginner with $50K to invest. How do I get started with Airbnb investing?" },
  { label: "Hidden gem markets", question: "Find me hidden gem STR markets with low competition and high occupancy" },
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*]\s+/gm, "- ")
    .replace(/^\d+[\.\)]\s+/gm, (m) => m)
    .trim();
}

function formatResponse(text: string) {
  const cleaned = stripMarkdown(text);
  const parts = cleaned.split("\n");
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="space-y-1.5 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#2b2823" }}>
              <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#22c55e" }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  parts.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); return; }
    if (/^-\s/.test(trimmed)) { listItems.push(trimmed.replace(/^-\s*/, "")); return; }
    if (/^\d+[\.\)]\s/.test(trimmed)) { listItems.push(trimmed.replace(/^\d+[\.\)]\s*/, "")); return; }
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed my-1" style={{ color: "#4a4640" }}>
        {trimmed}
      </p>
    );
  });
  flushList();
  return elements;
}

// Helper to get auth email from localStorage
function getAuthEmail(): string | null {
  if (typeof window === "undefined") return null;
  const email = localStorage.getItem("edge_auth_email");
  const token = localStorage.getItem("edge_auth_token");
  const expiry = localStorage.getItem("edge_auth_expiry");
  if (email && token && expiry && Date.now() < parseInt(expiry, 10)) {
    return email;
  }
  return null;
}

// Compress image to reduce base64 size for API calls
function compressImage(file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AIChatHero() {
  const marketCounts = getMarketCounts();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll within the chat container only
  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      const container = chatContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, isLoading]);

  // Auto-save session after each assistant response
  const saveSession = useCallback(async (msgs: Message[], sessionId: string | null) => {
    const email = getAuthEmail();
    if (!email || msgs.length === 0) return null;

    const hasImages = msgs.some((m) => !!m.image);
    // Generate title from first user message
    const firstUserMsg = msgs.find((m) => m.role === "user");
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? "..." : "")
      : "New Chat";

    try {
      const res = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sessionId,
          title,
          messages: msgs.map((m) => ({ role: m.role, content: m.content, image: m.image ? "[image]" : undefined })),
          has_images: hasImages,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.session?.id || null;
      }
    } catch (err) {
      console.error("Failed to save chat session:", err);
    }
    return null;
  }, []);

  // Load sessions list
  const loadSessions = useCallback(async () => {
    const email = getAuthEmail();
    if (!email) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(`/api/chat-sessions?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Load a specific session
  const loadSession = useCallback(async (sessionId: string) => {
    const email = getAuthEmail();
    if (!email) return;
    try {
      const res = await fetch(`/api/chat-sessions?email=${encodeURIComponent(email)}&id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          const loadedMessages = (data.session.messages || []).map((m: { role: string; content: string; image?: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            image: m.image === "[image]" ? undefined : m.image,
          }));
          setMessages(loadedMessages);
          setCurrentSessionId(sessionId);
          setIsExpanded(true);
          setShowHistory(false);
        }
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  }, []);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    const email = getAuthEmail();
    if (!email) return;
    try {
      await fetch(`/api/chat-sessions?email=${encodeURIComponent(email)}&id=${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setMessages([]);
        setCurrentSessionId(null);
        setIsExpanded(false);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }, [currentSessionId]);

  // Pin/unpin a session
  const togglePin = useCallback(async (sessionId: string, currentlyPinned: boolean) => {
    const email = getAuthEmail();
    if (!email) return;
    try {
      const res = await fetch("/api/chat-sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessionId, pinned: !currentlyPinned }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error) alert(data.error);
        return;
      }
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId ? { ...s, pinned: !currentlyPinned } : s
        );
        // Sort: pinned first, then by updated_at
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      });
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  }, []);

  const sendMessage = async (content: string, imageData?: string) => {
    if ((!content.trim() && !imageData) || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: content.trim() || (imageData ? "Analyze this image" : ""),
      image: imageData,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingImage(null);
    setIsLoading(true);
    setIsExpanded(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.image ? { image: m.image } : {}),
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      const updatedMessages = [...newMessages, { role: "assistant" as const, content: data.message }];
      setMessages(updatedMessages);

      // Auto-save for logged-in users
      const newId = await saveSession(updatedMessages, currentSessionId);
      if (newId && !currentSessionId) {
        setCurrentSessionId(newId);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment, or use the Calculator tab to analyze a specific property." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, pendingImage || undefined);
  };

  const handlePromptClick = (question: string) => {
    sendMessage(question);
  };

  const handleNewChat = () => {
    setMessages([]);
    setIsExpanded(false);
    setInput("");
    setPendingImage(null);
    setCurrentSessionId(null);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate file type and size
    if (!file.type.startsWith("image/")) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("Image must be under 20MB");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
    } catch (err) {
      console.error("Failed to process image:", err);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleHistoryToggle = () => {
    if (!showHistory) {
      loadSessions();
    }
    setShowHistory(!showHistory);
  };

  const userEmail = getAuthEmail();
  const [loginBannerDismissed, setLoginBannerDismissed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showLoginNudge = !userEmail && userMessageCount >= 3 && !loginBannerDismissed && !isLoading;

  return (
    <>
    <div className="max-w-5xl mx-auto px-4 pt-1.5 sm:pt-4 pb-1">
      <div
        className="rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #d8d6cd",
          boxShadow: "0 2px 12px -2px rgba(43, 40, 35, 0.1)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{
            background: "linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="#22c55e" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ color: "#ffffff" }}>
                  Ask Edge AI
                </h2>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {`Powered by real data from ${marketCounts.withFullData.toLocaleString()}+ US markets`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* History button — only for logged-in users */}
              {userEmail && (
                <button
                  onClick={handleHistoryToggle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: showHistory ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.15)",
                    color: showHistory ? "#22c55e" : "rgba(255,255,255,0.8)",
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </button>
              )}
              {isExpanded && (
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat History Panel */}
        {showHistory && (
          <div
            className="px-5 py-3 overflow-y-auto"
            style={{ maxHeight: "300px", borderBottom: "1px solid #e5e3da", backgroundColor: "#faf9f7" }}
          >
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#c8c5bc", animation: "pulse 1.4s ease-in-out infinite" }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#c8c5bc", animation: "pulse 1.4s ease-in-out 0.2s infinite" }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#c8c5bc", animation: "pulse 1.4s ease-in-out 0.4s infinite" }} />
                </div>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "#9a958c" }}>
                No saved conversations yet. Start chatting and your history will appear here.
              </p>
            ) : (
              <div className="space-y-1">
                {/* Pinned section */}
                {sessions.some((s) => s.pinned) && (
                  <>
                    <div className="flex items-center gap-1.5 px-1 pb-1">
                      <svg className="w-3 h-3" fill="#d4a017" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a958c" }}>Pinned</span>
                    </div>
                  </>
                )}
                {sessions.map((session, idx) => {
                  // Add "Recent" header before first unpinned session
                  const showRecentHeader = !session.pinned && (idx === 0 || sessions[idx - 1]?.pinned);
                  return (
                    <div key={session.id}>
                      {showRecentHeader && sessions.some((s) => s.pinned) && (
                        <div className="flex items-center gap-1.5 px-1 pb-1 pt-2">
                          <svg className="w-3 h-3" fill="none" stroke="#9a958c" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a958c" }}>Recent</span>
                        </div>
                      )}
                      <div
                        className="flex items-center justify-between group rounded-lg px-3 py-2.5 cursor-pointer transition-all hover:bg-white"
                        style={{
                          backgroundColor: currentSessionId === session.id ? "#ffffff" : "transparent",
                          border: currentSessionId === session.id ? "1px solid #d8d6cd" : "1px solid transparent",
                        }}
                        onClick={() => loadSession(session.id)}
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center gap-1.5">
                            {session.pinned && (
                              <svg className="w-3 h-3 flex-shrink-0" fill="#d4a017" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            )}
                            {session.has_images && (
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#9a958c" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                              </svg>
                            )}
                            <p className="text-sm font-medium truncate" style={{ color: "#2b2823" }}>
                              {session.title}
                            </p>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: "#9a958c" }}>
                            {new Date(session.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(session.id, !!session.pinned); }}
                            className={`p-1.5 rounded transition-all ${session.pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            style={{ minWidth: 28, minHeight: 28 }}
                            title={session.pinned ? "Unpin conversation" : "Pin conversation"}
                            aria-label={session.pinned ? "Unpin conversation" : "Pin conversation"}
                          >
                            <svg className="w-3.5 h-3.5" fill={session.pinned ? "#d4a017" : "none"} stroke={session.pinned ? "#d4a017" : "#9a958c"} strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all hover:bg-red-50"
                            style={{ minWidth: 28, minHeight: 28 }}
                            title="Delete conversation"
                            aria-label="Delete conversation"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chat messages area */}
        {isExpanded && messages.length > 0 && !showHistory && (
          <div
            ref={chatContainerRef}
            className="px-5 py-4 overflow-y-auto"
            style={{ maxHeight: "400px", borderBottom: "1px solid #e5e3da" }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`mb-4 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[85%]">
                    {msg.image && (
                      <div className="mb-2 flex justify-end">
                        <img
                          src={msg.image}
                          alt="Uploaded"
                          className="rounded-xl max-h-48 max-w-full object-cover"
                          style={{ border: "2px solid #2b2823" }}
                        />
                      </div>
                    )}
                    <div
                      className="inline-block px-4 py-2.5 rounded-2xl rounded-br-md text-sm"
                      style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 max-w-full">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: "#f0fdf4" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="#22c55e" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      {formatResponse(msg.content)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 mb-4">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#f0fdf4" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="#22c55e" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 py-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#c8c5bc", animation: "pulse 1.4s ease-in-out infinite" }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#c8c5bc", animation: "pulse 1.4s ease-in-out 0.2s infinite" }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#c8c5bc", animation: "pulse 1.4s ease-in-out 0.4s infinite" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Soft login nudge — appears after 3 messages for non-logged-in users */}
        {showLoginNudge && (
          <div
            className="mx-5 mb-2 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
            role="alert"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "#15803d" }}>Save this conversation</p>
              <p className="text-xs" style={{ color: "#4ade80" }}>Sign in to keep your chat history and pick up where you left off.</p>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95 min-h-[44px] flex-shrink-0"
              style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
              aria-label="Sign in to save conversation"
            >
              Sign In
            </button>
            <button
              onClick={() => setLoginBannerDismissed(true)}
              className="p-1.5 rounded-lg transition-all hover:bg-green-100 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              aria-label="Dismiss sign in prompt"
            >
              <svg className="w-4 h-4" fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="px-5 py-4">
          {/* Pending image preview */}
          {pendingImage && (
            <div className="mb-3 flex items-start gap-2">
              <div className="relative">
                <img
                  src={pendingImage}
                  alt="Selected"
                  className="rounded-xl h-20 w-20 object-cover"
                  style={{ border: "2px solid #d8d6cd" }}
                />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: "#9a958c" }}>
                Add a message or tap send to analyze
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Photo button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-3 py-3 rounded-xl transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 flex-shrink-0"
              style={{ backgroundColor: "#f8f7f4", border: "1px solid #d8d6cd" }}
              title="Upload a photo"
            >
              <svg className="w-5 h-5" fill="none" stroke="#787060" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pendingImage ? "Describe this image..." : "Ask about any market or city..."}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-60"
              style={{
                backgroundColor: "#f8f7f4",
                border: "1px solid #d8d6cd",
                color: "#2b2823",
              }}
              onFocus={() => {
                if (inputRef.current) {
                  inputRef.current.style.borderColor = "#22c55e";
                  inputRef.current.style.boxShadow = "0 0 0 2px rgba(34, 197, 94, 0.15)";
                }
              }}
              onBlur={() => {
                if (inputRef.current) {
                  inputRef.current.style.borderColor = "#d8d6cd";
                  inputRef.current.style.boxShadow = "none";
                }
              }}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !pendingImage) || isLoading}
              className="px-4 py-3 rounded-xl font-medium text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>

          {/* Suggested prompts — show when no messages and not showing history */}
          {!isExpanded && !showHistory && (
            <div className="mt-3">
              <p className="text-xs mb-2" style={{ color: "#9a958c" }}>
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handlePromptClick(prompt.question)}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[44px] flex items-center"
                    style={{
                      backgroundColor: "#f8f7f4",
                      border: "1px solid #e5e3da",
                      borderLeft: "3px solid #22c55e",
                      color: "#3d3a34",
                    }}
                    aria-label={`Ask: ${prompt.label}`}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions when expanded */}
          {isExpanded && !isLoading && messages.length > 0 && !showHistory && (
            <div className="mt-3 flex items-center gap-3">
              <Link
                href="/calculator"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-80"
                style={{ color: "#22c55e" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.498-6h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm2.504-6h.006v.008h-.006v-.008zm0 2.25h.006v.008h-.006v-.008zm0 2.25h.006v.008h-.006v-.008zm0 2.25h.006v.008h-.006v-.008zm2.492-8.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008z" />
                </svg>
                Analyze a property
              </Link>
              <span className="text-xs" style={{ color: "#d8d6cd" }}>|</span>
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-80"
                style={{ color: "#787060" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Search markets
              </Link>
              <span className="text-xs" style={{ color: "#d8d6cd" }}>|</span>
              <Link
                href="/funding"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-80"
                style={{ color: "#787060" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Funding options
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Auth Modal for login nudge */}
    <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(email: string) => {
          setShowLoginModal(false);
          setLoginBannerDismissed(true);
          // Auto-save current conversation after login
          if (messages.length > 0) {
            saveSession(messages, currentSessionId).then((newId) => {
              if (newId) setCurrentSessionId(newId);
            });
          }
        }}
        title="Sign in to Edge"
        subtitle="Save your conversations and pick up where you left off. No password needed."
    />
    </>
  );
}
