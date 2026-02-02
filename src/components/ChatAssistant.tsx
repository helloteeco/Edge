"use client";

import { useState } from "react";

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
  
  // Survey state
  const [surveyStep, setSurveyStep] = useState<SurveyStep>("none");
  const [surveyData, setSurveyData] = useState({
    budget: "",
    timeline: "",
    experience: "",
    email: "",
  });

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response (in production, this would call your API)
    setTimeout(() => {
      const responses = [
        "Great question! For STR investing, I recommend focusing on markets with a Cash-on-Cash return above 15%. This means you'll earn at least 15% annually on your invested capital.",
        "The Hidden Gems filter shows markets with high income potential but low competition. These are often smaller towns near major attractions.",
        "When analyzing a market, look at three things: 1) Can you pay the bills? (positive cash flow), 2) What's your Cash-on-Cash return?, and 3) Is it legal to do STR there?",
        "Mountain and lake markets typically have the best Cash-on-Cash returns because property prices are lower but vacation demand is high. Beach markets look attractive but often have lower returns due to high property costs.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { role: "assistant", content: randomResponse }]);
      setIsLoading(false);
    }, 1000);
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

  const handleEmailSubmit = () => {
    if (!surveyData.email.includes("@")) return;
    setSurveyStep("complete");
    // In production, send this data to your backend/email service
    console.log("Survey completed:", surveyData);
  };

  const isQualified = 
    (surveyData.budget === "$100k-250k" || surveyData.budget === "$250k-500k" || surveyData.budget === "$500k+") &&
    (surveyData.timeline === "Ready now" || surveyData.timeline === "3-6 months");

  const resetChat = () => {
    setMode("menu");
    setMessages([]);
    setSurveyStep("none");
    setSurveyData({ budget: "", timeline: "", experience: "", email: "" });
  };

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
                  {mode === "menu" ? "How can I help you today?" : mode === "chat" ? "Ask me anything" : "Mentorship Survey"}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`overflow-y-auto ${mode === "menu" ? "max-h-[80vh] sm:max-h-none sm:h-auto" : "h-80"}`}>
            {mode === "menu" && (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => window.open("https://chatgpt.com/g/g-68963d578178819193ee01b12d9d94a7-jeff-chheuy-ai", "_blank")}
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
                      <div className="font-semibold" style={{ color: '#2b2823' }}>Chat with Jeff AI</div>
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
                      <div className="font-semibold" style={{ color: '#2b2823' }}>Mentorship Program</div>
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
                    <div className="text-center py-8" style={{ color: '#787060' }}>
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{ backgroundColor: '#e5e3da' }}
                      >
                        <span className="text-2xl">💭</span>
                      </div>
                      <p className="text-sm">Ask me anything about STR investing!</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl max-w-[85%] text-sm ${
                        msg.role === "user"
                          ? "ml-auto rounded-br-md"
                          : "rounded-bl-md"
                      }`}
                      style={{
                        backgroundColor: msg.role === "user" ? '#2b2823' : '#e5e3da',
                        color: msg.role === "user" ? '#ffffff' : '#2b2823'
                      }}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isLoading && (
                    <div 
                      className="p-3 rounded-2xl rounded-bl-md max-w-[85%] text-sm"
                      style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#787060', animationDelay: "0ms" }}></span>
                          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#787060', animationDelay: "150ms" }}></span>
                          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#787060', animationDelay: "300ms" }}></span>
                        </div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-white" style={{ borderTop: '1px solid #d8d6cd' }}>
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
                    <h4 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>What&apos;s your investment budget?</h4>
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
                    <h4 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>When are you looking to invest?</h4>
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
                    <input
                      type="email"
                      value={surveyData.email}
                      onChange={(e) => setSurveyData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2"
                      style={{ backgroundColor: '#e5e3da', border: '1px solid #d8d6cd', color: '#2b2823' }}
                    />
                    <button
                      onClick={handleEmailSubmit}
                      className="w-full py-3 rounded-xl font-semibold transition-colors"
                      style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                    >
                      Continue
                    </button>
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
                          <p className="text-sm font-medium mb-2" style={{ color: '#2b2823' }}>✅ You qualify for our Mentorship Program!</p>
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
