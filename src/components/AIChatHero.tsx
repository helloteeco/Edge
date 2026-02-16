"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_PROMPTS = [
  { label: "Best markets under $250K", question: "What are the best STR markets with home prices under $250K?" },
  { label: "Top cash-on-cash cities", question: "Show me the top cities with the highest cash-on-cash return for STR investing" },
  { label: "Compare two markets", question: "Compare Gatlinburg, TN vs Pigeon Forge, TN for short-term rental investing" },
  { label: "STR regulations", question: "What are the STR regulations and market data for Tennessee?" },
  { label: "How to get started", question: "I'm a complete beginner with $50K to invest. How do I get started with Airbnb investing?" },
  { label: "Hidden gem markets", question: "Find me hidden gem STR markets with low competition and high occupancy" },
];

// Simple markdown-like formatting for AI responses
function formatResponse(text: string) {
  // Split into paragraphs
  const parts = text.split("\n");
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
              <span dangerouslySetInnerHTML={{ __html: boldify(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const boldify = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#2b2823">$1</strong>');

  parts.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    // Bullet point
    if (/^[-•*]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-•*\d\.\)]+\s*/, ""));
      return;
    }
    flushList();
    // Heading-like (starts with # or all caps short line)
    if (trimmed.startsWith("#")) {
      const headingText = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h4 key={`h-${i}`} className="font-semibold text-sm mt-3 mb-1" style={{ color: "#2b2823" }}>
          {headingText}
        </h4>
      );
      return;
    }
    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed my-1" style={{ color: "#4a4640" }} dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />
    );
  });
  flushList();
  return elements;
}

export function AIChatHero() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setIsExpanded(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
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
    sendMessage(input);
  };

  const handlePromptClick = (question: string) => {
    sendMessage(question);
  };

  const handleNewChat = () => {
    setMessages([]);
    setIsExpanded(false);
    setInput("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-2">
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
                  Powered by real data from 600+ US markets
                </p>
              </div>
            </div>
            {isExpanded && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New chat
              </button>
            )}
          </div>
        </div>

        {/* Chat messages area */}
        {isExpanded && messages.length > 0 && (
          <div
            className="px-5 py-4 overflow-y-auto"
            style={{ maxHeight: "400px", borderBottom: "1px solid #e5e3da" }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`mb-4 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                {msg.role === "user" ? (
                  <div
                    className="inline-block px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-sm"
                    style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                  >
                    {msg.content}
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

        {/* Input area */}
        <div className="px-5 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any market, city, or STR strategy..."
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
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 rounded-xl font-medium text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>

          {/* Suggested prompts — show when no messages */}
          {!isExpanded && (
            <div className="mt-3">
              <p className="text-xs mb-2" style={{ color: "#9a958c" }}>
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handlePromptClick(prompt.question)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: "#f8f7f4",
                      border: "1px solid #e5e3da",
                      color: "#4a4640",
                    }}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions when expanded */}
          {isExpanded && !isLoading && messages.length > 0 && (
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
  );
}
