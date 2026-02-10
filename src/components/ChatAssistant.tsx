"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type SurveyStep = "none" | "budget" | "timeline" | "experience" | "email" | "complete";

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "chat" | "survey">("menu");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Survey state
  const [surveyStep, setSurveyStep] = useState<SurveyStep>("none");
  const [surveyData, setSurveyData] = useState({
    budget: "",
    timeline: "",
    experience: "",
    email: "",
  });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please try again in a moment, or reach out to hello@teeco.co for help!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurveyAnswer = (answer: string) => {
    if (surveyStep === "budget") {
      setSurveyData(prev => ({ ...prev, budget: answer }));
      setSurveyStep("timeline");
    } else if (surveyStep === "timeline") {
      setSurveyData(prev => ({ ...prev, timeline: answer }));
      setSurveyStep("experience");
    } else if (surveyStep === "experience") {
      setSurveyData(prev => ({ ...prev, experience: answer }));
      setSurveyStep("email");
    }
  };

  const handleEmailSubmit = async () => {
    if (!surveyData.email.includes("@")) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailSaving(true);
    setEmailError("");
    
    try {
      // Save to Supabase via API
      await fetch("/api/coaching-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: surveyData.email,
          budget: surveyData.budget,
          timeline: surveyData.timeline,
          experience: surveyData.experience,
          source: "assistant",
        }),
      });
    } catch (err) {
      console.error("Error saving coaching lead:", err);
      // Continue anyway - don't block the user
    } finally {
      setEmailSaving(false);
    }
    
    setSurveyStep("complete");
  };

  const isQualified = 
    (surveyData.budget === "$100k-250k" || surveyData.budget === "$250k-500k" || surveyData.budget === "$500k+") &&
    (surveyData.timeline === "Ready now" || surveyData.timeline === "3-6 months");

  const resetChat = () => {
    setMode("menu");
    setMessages([]);
    setSurveyStep("none");
    setSurveyData({ budget: "", timeline: "", experience: "", email: "" });
    setEmailError("");
  };

  // Suggested questions for new users
  const suggestedQuestions = [
    "What cash-on-cash return should I aim for?",
    "How do I find a good rural market?",
    "Can I really manage remotely?",
    "How much money do I need to start?",
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all z-50"
        style={{ 
          backgroundColor: isOpen ? '#9a9488' : '#787060',
          color: '#ffffff',
          boxShadow: '0 4px 20px rgba(120, 112, 96, 0.35)'
        }}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          "💬"
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-40 right-4 w-80 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden z-50 animate-scale-in"
          style={{ 
            backgroundColor: '#ffffff',
            boxShadow: '0 20px 60px -12px rgba(43, 40, 35, 0.25)',
            border: '1px solid #d8d6cd'
          }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }} className="p-4">
            <div className="flex items-center gap-3">
              {mode !== "menu" && (
                <button
                  onClick={resetChat}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                  title="Back to menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ffffff' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {mode === "menu" && (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <span className="text-xl">🏠</span>
                </div>
              )}
              <div>
                <h3 className="font-semibold" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Edge Assistant</h3>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  {mode === "menu" ? "How can I help you today?" : mode === "chat" ? "Powered by Jeff's STR expertise" : "Coaching Survey"}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`overflow-y-auto ${mode === "menu" ? "max-h-[80vh] sm:max-h-none sm:h-auto" : "h-80"}`}>
            {mode === "menu" && (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setMode("chat")}
                  className="w-full p-4 rounded-xl text-left transition-all group"
                  style={{ backgroundColor: '#e5e3da' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: 'rgba(43, 40, 35, 0.1)' }}
                    >
                      🤖
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: '#2b2823' }}>Ask Edge Assistant</div>
                      <div className="text-sm" style={{ color: '#787060' }}>Get personalized STR advice from our AI expert</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => { setMode("survey"); setSurveyStep("budget"); }}
                  className="w-full p-4 rounded-xl text-left transition-all group"
                  style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)', border: '1px solid #d8d6cd' }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 flex-shrink-0"
                      style={{ backgroundColor: 'rgba(43, 40, 35, 0.1)' }}
                    >
                      🎓
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: '#2b2823' }}>Coaching Program</div>
                      <div className="text-sm font-medium" style={{ color: '#2b2823' }}>Only ~3 hours/week once set up</div>
                      <div className="text-xs mt-1" style={{ color: '#787060' }}>9 guided calls: Deal → Setup & Design → Live STR. We can set up your Airbnb remotely while you keep your job.</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => window.open("https://teeco.co/before-after-photos", "_blank")}
                  className="w-full p-4 rounded-xl text-left transition-all group"
                  style={{ backgroundColor: '#e5e3da' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: 'rgba(43, 40, 35, 0.1)' }}
                    >
                      🎨
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: '#2b2823' }}>Design & Setup Services</div>
                      <div className="text-sm" style={{ color: '#787060' }}>Transform your property into a 5-star STR</div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {mode === "chat" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {messages.length === 0 && (
                    <div className="space-y-4">
                      <div className="text-center py-4" style={{ color: '#787060' }}>
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                          style={{ backgroundColor: '#e5e3da' }}
                        >
                          <span className="text-2xl">💭</span>
                        </div>
                        <p className="text-sm mb-4">Ask me anything about STR investing!</p>
                      </div>
                      {/* Suggested Questions */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium" style={{ color: '#787060' }}>Try asking:</p>
                        {suggestedQuestions.map((question, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setInput(question);
                              setTimeout(() => {
                                const fakeEvent = { key: "Enter" } as React.KeyboardEvent;
                                void fakeEvent;
                                setInput("");
                                const newMessages: Message[] = [{ role: "user", content: question }];
                                setMessages(newMessages);
                                setIsLoading(true);
                                fetch("/api/chat", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
                                }).then(res => res.json()).then(data => {
                                  setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
                                }).catch(() => {
                                  setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again!" }]);
                                }).finally(() => setIsLoading(false));
                              }, 50);
                            }}
                            className="w-full p-2.5 rounded-lg text-left text-sm transition-all"
                            style={{ backgroundColor: '#f5f5f0', border: '1px solid #e5e3da', color: '#2b2823' }}
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm"
                        style={{
                          backgroundColor: msg.role === "user" ? '#2b2823' : '#e5e3da',
                          color: msg.role === "user" ? '#ffffff' : '#2b2823',
                          borderBottomRightRadius: msg.role === "user" ? 4 : undefined,
                          borderBottomLeftRadius: msg.role === "assistant" ? 4 : undefined,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: '#e5e3da' }}>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#787060', animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#787060', animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#787060', animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t" style={{ borderColor: '#e5e3da' }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type your question..."
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: '#e5e3da', 
                        border: '1px solid #d8d6cd',
                        color: '#2b2823'
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading}
                      className="px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={resetChat}
                    className="w-full mt-2 text-sm transition-colors"
                    style={{ color: '#787060' }}
                  >
                    ← Back to menu
                  </button>
                </div>
              </div>
            )}

            {mode === "survey" && (
              <div className="p-4">
                {surveyStep === "budget" && (
                  <div className="space-y-3">
                    <h4 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>How much deployable cash do you have?</h4>
                    <p className="text-xs" style={{ color: '#787060' }}>This helps us recommend the right strategy for you.</p>
                    {["Under $100k", "$100k-250k", "$250k-500k", "$500k+"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3.5 rounded-xl text-left font-medium transition-all"
                        style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "timeline" && (
                  <div className="space-y-3">
                    <h4 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>When do you plan to launch your Airbnb?</h4>
                    {["Ready now", "3-6 months", "6-12 months", "Just exploring"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3.5 rounded-xl text-left font-medium transition-all"
                        style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "experience" && (
                  <div className="space-y-3">
                    <h4 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Your STR experience level?</h4>
                    {["First-time investor", "1-3 properties", "4+ properties"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3.5 rounded-xl text-left font-medium transition-all"
                        style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "email" && (
                  <div className="space-y-4">
                    <h4 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Enter your email to continue</h4>
                    <p className="text-xs" style={{ color: '#787060' }}>We&apos;ll send you personalized recommendations based on your answers.</p>
                    <input
                      type="email"
                      value={surveyData.email}
                      onChange={(e) => { setSurveyData(prev => ({ ...prev, email: e.target.value })); setEmailError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: '#e5e3da', 
                        border: emailError ? '2px solid #ef4444' : '1px solid #d8d6cd', 
                        color: '#2b2823' 
                      }}
                    />
                    {emailError && (
                      <p className="text-sm" style={{ color: '#ef4444' }}>{emailError}</p>
                    )}
                    <button
                      onClick={handleEmailSubmit}
                      disabled={emailSaving}
                      className="w-full py-3 rounded-xl font-semibold transition-colors"
                      style={{ 
                        backgroundColor: emailSaving ? '#9a9488' : '#2b2823', 
                        color: '#ffffff',
                        opacity: emailSaving ? 0.7 : 1
                      }}
                    >
                      {emailSaving ? 'Saving...' : 'Continue'}
                    </button>
                    <p className="text-xs text-center" style={{ color: '#9a9488' }}>
                      We&apos;ll never spam you. Unsubscribe anytime.
                    </p>
                  </div>
                )}

                {surveyStep === "complete" && (
                  <div className="text-center py-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: 'rgba(43, 40, 35, 0.08)' }}
                    >
                      <span className="text-3xl">🎉</span>
                    </div>
                    <h4 className="font-semibold mb-2" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Thanks for your interest!</h4>
                    {isQualified ? (
                      <div className="space-y-3">
                        <div 
                          className="rounded-xl p-3 text-left"
                          style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)', border: '1px solid #d8d6cd' }}
                        >
                          <p className="text-sm font-medium mb-2" style={{ color: '#2b2823' }}>✅ You qualify for our Coaching Program!</p>
                          <ul className="text-xs space-y-1" style={{ color: '#787060' }}>
                            <li>• Full guided experience: 9 total calls</li>
                            <li>• Deal → Setup & Design → Live STR</li>
                            <li>• We can set up your Airbnb remotely</li>
                            <li>• Only ~3 hours/week to manage once live</li>
                          </ul>
                        </div>
                        <p className="text-sm" style={{ color: '#787060' }}>
                          Reach out to get started:
                        </p>
                        <a
                          href="mailto:hello@teeco.co"
                          className="block w-full py-3 rounded-xl font-semibold transition-colors"
                          style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                        >
                          Email hello@teeco.co
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: '#787060' }}>
                        We&apos;ll send you helpful resources to get started with STR investing!
                      </p>
                    )}
                    <button
                      onClick={resetChat}
                      className="mt-4 text-sm transition-colors"
                      style={{ color: '#787060' }}
                    >
                      ← Back to menu
                    </button>
                  </div>
                )}

                {surveyStep !== "complete" && surveyStep !== "email" && (
                  <button
                    onClick={resetChat}
                    className="w-full mt-4 text-sm transition-colors"
                    style={{ color: '#787060' }}
                  >
                    ← Back to menu
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
