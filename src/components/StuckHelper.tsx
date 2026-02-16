"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface StuckHelperProps {
  tabName: "map" | "search" | "calculator" | "saved" | "funding";
}

// Per-tab button labels — more contextual than generic "I'm still stuck"
const TAB_BUTTON_LABELS: Record<string, { title: string; subtitle: string }> = {
  map: {
    title: "Not sure where to start?",
    subtitle: "Get personalized help picking your first market",
  },
  search: {
    title: "Need help deciding?",
    subtitle: "Let our AI help you narrow down the right market",
  },
  calculator: {
    title: "Numbers not making sense?",
    subtitle: "Get help understanding your analysis results",
  },
  saved: {
    title: "Not sure what to do next?",
    subtitle: "Get guidance on your next steps as an investor",
  },
  funding: {
    title: "Still stuck on funding?",
    subtitle: "Let our AI match you with the right financing strategy",
  },
};

// Lightweight analytics helper — fires and forgets, never blocks UI
const trackStuckEvent = (event: string, tab: string, detail?: string) => {
  try {
    if (typeof window !== "undefined") {
      // Store events in sessionStorage for lightweight tracking
      const key = "edge_stuck_events";
      const existing = JSON.parse(sessionStorage.getItem(key) || "[]");
      existing.push({
        event,
        tab,
        detail: detail || null,
        timestamp: new Date().toISOString(),
      });
      // Keep last 50 events max
      if (existing.length > 50) existing.shift();
      sessionStorage.setItem(key, JSON.stringify(existing));

      // Also fire to /api/analytics if it exists (non-blocking)
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: `stuck_${event}`, tab, detail }),
      }).catch(() => {}); // silently fail
    }
  } catch {
    // Never let analytics break the UI
  }
};

// Tab-specific sticking points and suggested questions
const TAB_CONFIG: Record<
  string,
  {
    headline: string;
    stickingPoints: { label: string; question: string }[];
    resources: { label: string; href: string; emoji: string }[];
  }
> = {
  map: {
    headline: "Not sure where to start on the map?",
    stickingPoints: [
      {
        label: "I don't know what the grades mean",
        question:
          "What do the STR grades on the map mean? How should I use them to pick a market?",
      },
      {
        label: "There are too many options — how do I pick?",
        question:
          "I'm overwhelmed by all the markets. What should I look for when choosing my first STR market?",
      },
      {
        label: "I found a green state but what's next?",
        question:
          "I found a state with a good STR grade. What should I do next to evaluate specific cities?",
      },
      {
        label: "What do the different map layers show?",
        question:
          "Can you explain the different map views like STR Grade, Appreciation, Home Value, and Migration? Which one matters most?",
      },
    ],
    resources: [
      {
        label: "Analyze a specific property",
        href: "/calculator",
        emoji: "🔢",
      },
      {
        label: "Search & filter markets",
        href: "/search",
        emoji: "🔍",
      },
      {
        label: "STR regulations by state",
        href: "https://www.proper.insure/regulations/",
        emoji: "📋",
      },
      {
        label: "Join the Teeco community",
        href: "https://login.circle.so/sign_up?request_host=teeco.circle.so&user%5Binvitation_token%5D=24bf3e259d3f754c41c323f1eda7eb88a49991b0-87b646d2-7efe-4bec-a0b8-a03098b44aa2#email",
        emoji: "👥",
      },
    ],
  },
  search: {
    headline: "Not sure how to narrow down your search?",
    stickingPoints: [
      {
        label: "Too many results — how do I filter?",
        question:
          "I'm seeing hundreds of cities. What filters or metrics should I focus on to find the best STR markets?",
      },
      {
        label: "What metrics matter most for beginners?",
        question:
          "As a first-time STR investor, which metrics should I prioritize — occupancy, ADR, cash-on-cash, or something else?",
      },
      {
        label: "I found a city I like — now what?",
        question:
          "I found a city with good numbers. What's my next step to evaluate it further before buying?",
      },
      {
        label: "How do I compare two markets?",
        question:
          "What's the best way to compare two STR markets side by side? What should I look at?",
      },
    ],
    resources: [
      {
        label: "Analyze a specific property",
        href: "/calculator",
        emoji: "🔢",
      },
      {
        label: "Explore the interactive map",
        href: "/",
        emoji: "🗺️",
      },
      {
        label: "STR regulations by state",
        href: "https://www.proper.insure/regulations/",
        emoji: "📋",
      },
      {
        label: "Coaching program",
        href: "https://teeco.co/before-after-photos",
        emoji: "🎓",
      },
    ],
  },
  calculator: {
    headline: "Numbers looking confusing?",
    stickingPoints: [
      {
        label: "I don't understand the results",
        question:
          "Can you explain what cash-on-cash return, ADR, and occupancy rate mean in simple terms? What numbers should I aim for?",
      },
      {
        label: "The expenses seem off — what's realistic?",
        question:
          "What are realistic monthly expenses for a rural STR? How much should I budget for cleaning, utilities, and maintenance?",
      },
      {
        label: "How do I know if this is a good deal?",
        question:
          "What cash-on-cash return should I target for a rural STR? At what point should I walk away from a deal?",
      },
      {
        label: "I found a deal — how do I fund it?",
        question:
          "I found a property I want to buy. What are the best financing options for a first-time STR investor?",
      },
      {
        label: "What do the comp listings mean?",
        question:
          "How should I interpret the comparable listings? What if my property is different from the comps shown?",
      },
    ],
    resources: [
      {
        label: "Funding options (45+ strategies)",
        href: "/funding",
        emoji: "💰",
      },
      {
        label: "STR regulations check",
        href: "https://www.proper.insure/regulations/",
        emoji: "📋",
      },
      {
        label: "Design & setup services",
        href: "https://teeco.co/before-after-photos",
        emoji: "🎨",
      },
      {
        label: "Coaching program",
        href: "https://teeco.co/before-after-photos",
        emoji: "🎓",
      },
    ],
  },
  saved: {
    headline: "Not sure what to do with your saved items?",
    stickingPoints: [
      {
        label: "I saved markets but don't know what's next",
        question:
          "I've saved some markets and cities. What should my next steps be to move from research to actually buying a property?",
      },
      {
        label: "How do I compare my saved markets?",
        question:
          "What's the best way to compare the markets I've saved? Should I focus on one or diversify?",
      },
      {
        label: "My saved analyses look different now",
        question:
          "Why might my saved property analyses show different numbers when I look at them again? Do market conditions change?",
      },
    ],
    resources: [
      {
        label: "Analyze another property",
        href: "/calculator",
        emoji: "🔢",
      },
      {
        label: "Explore more markets",
        href: "/search",
        emoji: "🔍",
      },
      {
        label: "Funding options",
        href: "/funding",
        emoji: "💰",
      },
      {
        label: "Get coaching help",
        href: "https://teeco.co/before-after-photos",
        emoji: "🎓",
      },
    ],
  },
  funding: {
    headline: "Gone through everything and still stuck?",
    stickingPoints: [
      {
        label: "I don't qualify for any of these",
        question:
          "I feel like I don't qualify for most funding options. What can someone with limited cash and average credit realistically do to get started?",
      },
      {
        label: "Which option is actually best for me?",
        question:
          "There are so many funding options. Can you help me figure out which 2-3 are most realistic for a first-time STR investor?",
      },
      {
        label: "I'm scared of the risk",
        question:
          "I'm nervous about taking on debt for an STR. How do experienced investors manage the risk? What's the worst case?",
      },
      {
        label: "I have the money but don't know the next step",
        question:
          "I have enough for a down payment but I'm paralyzed by all the options. What's the simplest path to buying my first rural STR?",
      },
      {
        label: "Can I really do this with a full-time job?",
        question:
          "Is it realistic to buy and manage a rural STR while working full-time? How much time does it actually take?",
      },
    ],
    resources: [
      {
        label: "Analyze a property",
        href: "/calculator",
        emoji: "🔢",
      },
      {
        label: "Coaching program (guided setup)",
        href: "https://teeco.co/before-after-photos",
        emoji: "🎓",
      },
      {
        label: "Design & setup services",
        href: "https://teeco.co/before-after-photos",
        emoji: "🎨",
      },
      {
        label: "Join the community",
        href: "https://login.circle.so/sign_up?request_host=teeco.circle.so&user%5Binvitation_token%5D=24bf3e259d3f754c41c323f1eda7eb88a49991b0-87b646d2-7efe-4bec-a0b8-a03098b44aa2#email",
        emoji: "👥",
      },
      {
        label: "STR insurance (Proper)",
        href: "https://www.proper.insure",
        emoji: "🛡️",
      },
      {
        label: "Email us directly",
        href: "mailto:hello@teeco.co",
        emoji: "✉️",
      },
    ],
  },
};

// Extra system context injected into the AI for stuck-help conversations
const STUCK_SYSTEM_CONTEXT = `
You are now in "I'm Still Stuck" help mode. The user has been browsing Edge (edge.teeco.co) — a rural STR investing tool by Teeco — and is feeling overwhelmed or stuck.

YOUR GOAL: Diagnose what they're stuck on, give a clear and encouraging answer, and recommend the most relevant Edge feature or Teeco service.

EDGE FEATURES & RESOURCES YOU CAN RECOMMEND:
1. **Interactive Map** (Map tab) — Color-coded US map showing STR grades, appreciation, home values, and migration patterns for 1,000+ cities
2. **Market Search** (Search tab) — Filter and sort cities by occupancy, ADR, revenue, home price, and more
3. **Property Calculator** (Calculator tab) — Enter any US address to get revenue estimates, comps from real STR data, expense breakdown, and cash-on-cash return
4. **Saved Items** (Saved tab) — Save up to 10 cities, states, and property analyses for comparison
5. **Funding Options** (Funding tab) — 45+ financing strategies with a personalized quiz to match your situation
6. **Edge AI Assistant** (chat bubble, bottom-right) — Ask any STR investing question anytime

TEECO SERVICES & AFFILIATES:
- **Coaching Program** — 9 guided calls: Deal finding → Setup & Design → Live STR. Only ~3 hours/week once set up. Apply at teeco.co/before-after-photos
- **Design & Setup Services** — Professional in-house STR design and furnishing. 20% discount for Teeco students. See teeco.co/before-after-photos
- **Teeco Community (Circle)** — Private community of STR investors sharing deals, tips, and support
- **Proper Insurance** (proper.insure) — STR-specific insurance and regulation guides by state
- **STR Regulations** — Check rules at proper.insure/regulations/{state}
- **Contact** — hello@teeco.co for any questions

TONE: Be warm, encouraging, and specific. Don't overwhelm. Give 1-2 actionable next steps. If they seem ready to invest, mention coaching. Keep responses concise (2-3 paragraphs max).
`;

export function StuckHelper({ tabName }: StuckHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const config = TAB_CONFIG[tabName];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setChatMode(true);

    trackStuckEvent("message_sent", tabName, content.trim().slice(0, 100));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `[CONTEXT: User is on the ${tabName.toUpperCase()} tab of Edge. ${STUCK_SYSTEM_CONTEXT}]\n\n${content.trim()}`,
            },
            ...newMessages.slice(1).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Try the 💬 chat button in the bottom-right, or email hello@teeco.co — we're happy to help!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStickingPoint = (label: string, question: string) => {
    trackStuckEvent("question_tapped", tabName, label);
    sendMessage(question);
  };

  const resetHelper = () => {
    setChatMode(false);
    setMessages([]);
    setInput("");
  };

  const buttonLabel = TAB_BUTTON_LABELS[tabName] || TAB_BUTTON_LABELS.map;

  if (!isOpen) {
    return (
      <div className="mt-4 mb-4">
        <button
          onClick={() => {
            setIsOpen(true);
            trackStuckEvent("opened", tabName);
          }}
          className="w-full rounded-2xl p-5 text-left transition-all hover:scale-[1.005] active:scale-[0.995]"
          style={{
            backgroundColor: "rgba(43, 40, 35, 0.04)",
            border: "1px dashed #c8c5bc",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#f5f0e8" }}
            >
              <span className="text-lg">🤔</span>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold text-sm"
                style={{ color: "#2b2823" }}
              >
                {buttonLabel.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#787060" }}>
                {buttonLabel.subtitle}
              </p>
            </div>
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="#787060"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 mb-4">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #d8d6cd",
          boxShadow: "0 4px 16px -4px rgba(43, 40, 35, 0.1)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
            >
              <span className="text-base">🤔</span>
            </div>
            <div>
              <h3
                className="font-semibold text-sm"
                style={{
                  color: "#ffffff",
                  fontFamily: "Source Serif Pro, Georgia, serif",
                }}
              >
                {chatMode ? "Edge Help" : config.headline}
              </h3>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                {chatMode
                  ? "Ask anything about STR investing"
                  : "Tap what you're stuck on"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              resetHelper();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="#ffffff"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        {!chatMode ? (
          <div className="p-4 space-y-2">
            {/* Sticking points */}
            {config.stickingPoints.map((sp, i) => (
              <button
                key={i}
                onClick={() => handleStickingPoint(sp.label, sp.question)}
                className="w-full px-4 py-3 rounded-xl text-left text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-3"
                style={{
                  backgroundColor: "#f5f5f0",
                  border: "1px solid #e5e3da",
                  color: "#2b2823",
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "#e5e3da", color: "#787060" }}
                >
                  {i + 1}
                </span>
                <span className="flex-1">{sp.label}</span>
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="#9a9488"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}

            {/* Or ask your own */}
            <div className="pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder="Or type your own question..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "#f5f5f0",
                    border: "1px solid #e5e3da",
                    color: "#2b2823",
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="px-3 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick resource links */}
            <div className="pt-3">
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "#9a9488" }}
              >
                Or jump to a resource:
              </p>
              <div className="flex flex-wrap gap-2">
                {config.resources.map((r, i) => {
                  const isExternal = r.href.startsWith("http");
                  return (
                    <a
                      key={i}
                      href={r.href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        backgroundColor: "#f5f0e8",
                        color: "#2b2823",
                        border: "1px solid #e5e3da",
                      }}
                    >
                      <span>{r.emoji}</span>
                      {r.label}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Chat messages */}
            <div
              className="p-4 space-y-3 overflow-y-auto"
              style={{ maxHeight: "320px" }}
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      backgroundColor:
                        msg.role === "user" ? "#2b2823" : "#f5f5f0",
                      color: msg.role === "user" ? "#ffffff" : "#2b2823",
                      borderBottomRightRadius:
                        msg.role === "user" ? 4 : undefined,
                      borderBottomLeftRadius:
                        msg.role === "assistant" ? 4 : undefined,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="px-4 py-3 rounded-2xl"
                    style={{ backgroundColor: "#f5f5f0" }}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: "#787060",
                          animationDelay: "0ms",
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: "#787060",
                          animationDelay: "150ms",
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: "#787060",
                          animationDelay: "300ms",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Resource links after AI response */}
            {messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" &&
              !isLoading && (
                <div
                  className="px-4 pb-2"
                  style={{ borderTop: "1px solid #f0ede6" }}
                >
                  <p
                    className="text-xs font-medium mt-3 mb-2"
                    style={{ color: "#9a9488" }}
                  >
                    Helpful resources:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {config.resources.slice(0, 4).map((r, i) => {
                      const isExternal = r.href.startsWith("http");
                      return (
                        <a
                          key={i}
                          href={r.href}
                          target={isExternal ? "_blank" : undefined}
                          rel={
                            isExternal ? "noopener noreferrer" : undefined
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all hover:scale-[1.02]"
                          style={{
                            backgroundColor: "#f5f0e8",
                            color: "#2b2823",
                            border: "1px solid #e5e3da",
                          }}
                        >
                          <span>{r.emoji}</span>
                          {r.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Input */}
            <div
              className="p-3"
              style={{ borderTop: "1px solid #e5e3da" }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder="Ask a follow-up..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "#f5f5f0",
                    border: "1px solid #e5e3da",
                    color: "#2b2823",
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="px-3 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
              <button
                onClick={resetHelper}
                className="w-full mt-2 text-xs transition-colors"
                style={{ color: "#787060" }}
              >
                ← Back to common questions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
