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
        "Great question! For STR investing, I recommend focusing on markets with an RPR (Revenue-to-Price Ratio) above 0.15. This means you'll earn at least 15% of the purchase price annually in gross revenue.",
        "The Hidden Gems filter shows markets with high income potential but low competition. These are often smaller towns near major attractions.",
        "When analyzing a market, look at three things: 1) Can you pay the bills? (DSI), 2) How much money do you make vs. price? (RPR), and 3) Is it legal to do STR there?",
        "Mountain and lake markets typically have the best RPR because property prices are lower but vacation demand is high. Beach markets look attractive but often have lower returns due to high property costs.",
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
        className={`fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all z-50 ${
          isOpen 
            ? "bg-slate-800 text-white rotate-0" 
            : "bg-gradient-to-br from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
        }`}
        style={{ boxShadow: isOpen ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(13,148,136,0.4)" }}
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
        <div className="fixed bottom-40 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4">
            <div className="flex items-center gap-3">
              {mode !== "menu" && (
                <button
                  onClick={resetChat}
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  title="Back to menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {mode === "menu" && (
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">🏠</span>
                </div>
              )}
              <div>
                <h3 className="font-semibold">Edge Assistant</h3>
                <p className="text-sm text-teal-100">
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
                  onClick={() => setMode("chat")}
                  className="w-full p-4 bg-slate-50 rounded-xl text-left hover:bg-slate-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      💬
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Ask a Question</div>
                      <div className="text-sm text-slate-500">Get help with STR investing</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => { setMode("survey"); setSurveyStep("budget"); }}
                  className="w-full p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl text-left hover:from-purple-100 hover:to-purple-150 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-200 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform flex-shrink-0">
                      🎓
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Mentorship Program</div>
                      <div className="text-sm text-purple-700 font-medium">Only ~3 hours/week once set up</div>
                      <div className="text-xs text-slate-500 mt-1">9 guided calls: Deal → Setup & Design → Live STR. We can set up your Airbnb remotely while you keep your job.</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => window.open("https://teeco.co", "_blank")}
                  className="w-full p-4 bg-slate-50 rounded-xl text-left hover:bg-slate-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      🏠
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Co-hosting Services</div>
                      <div className="text-sm text-slate-500">Professional property management</div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {mode === "chat" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {messages.length === 0 && (
                    <div className="text-center text-slate-400 py-8">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
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
                          ? "bg-teal-600 text-white ml-auto rounded-br-md"
                          : "bg-slate-100 text-slate-700 rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl rounded-bl-md max-w-[85%] text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-slate-100 bg-white">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type your question..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading}
                      className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={resetChat}
                    className="w-full mt-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
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
                    <h4 className="font-semibold text-slate-900">What&apos;s your investment budget?</h4>
                    {["Under $100k", "$100k-250k", "$250k-500k", "$500k+"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3.5 bg-slate-50 rounded-xl text-left text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-all font-medium"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "timeline" && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900">When are you looking to invest?</h4>
                    {["Ready now", "3-6 months", "6-12 months", "Just exploring"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3.5 bg-slate-50 rounded-xl text-left text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-all font-medium"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "experience" && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900">Your STR experience level?</h4>
                    {["First-time investor", "1-3 properties", "4+ properties"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3.5 bg-slate-50 rounded-xl text-left text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-all font-medium"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "email" && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900">Enter your email to continue</h4>
                    <input
                      type="email"
                      value={surveyData.email}
                      onChange={(e) => setSurveyData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleEmailSubmit}
                      className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {surveyStep === "complete" && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">🎉</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-2">Thanks for your interest!</h4>
                    {isQualified ? (
                      <div className="space-y-3">
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-left">
                          <p className="text-sm text-purple-800 font-medium mb-2">✅ You qualify for our Mentorship Program!</p>
                          <ul className="text-xs text-purple-700 space-y-1">
                            <li>• Full guided experience: 9 total calls</li>
                            <li>• Deal → Setup & Design → Live STR</li>
                            <li>• We can set up your Airbnb remotely</li>
                            <li>• Only ~3 hours/week to manage once live</li>
                          </ul>
                        </div>
                        <p className="text-sm text-slate-500">
                          Reach out to get started:
                        </p>
                        <a
                          href="mailto:hello@teeco.co"
                          className="block w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
                        >
                          Email hello@teeco.co
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        We&apos;ll send you helpful resources to get started with STR investing!
                      </p>
                    )}
                    <button
                      onClick={resetChat}
                      className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      ← Back to menu
                    </button>
                  </div>
                )}

                {surveyStep !== "complete" && surveyStep !== "email" && (
                  <button
                    onClick={resetChat}
                    className="w-full mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
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
