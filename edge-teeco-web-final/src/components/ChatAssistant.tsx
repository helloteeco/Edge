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
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:bg-primary-dark transition-colors z-50"
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-border overflow-hidden z-50">
          {/* Header */}
          <div className="bg-primary text-white p-4">
            <h3 className="font-semibold">Edge Assistant</h3>
            <p className="text-sm opacity-90">How can I help you today?</p>
          </div>

          {/* Content */}
          <div className="h-80 overflow-y-auto">
            {mode === "menu" && (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setMode("chat")}
                  className="w-full p-4 bg-surface rounded-xl text-left hover:bg-border transition-colors"
                >
                  <div className="font-medium text-foreground">💬 Ask a Question</div>
                  <div className="text-sm text-muted">Get help with STR investing</div>
                </button>
                <button
                  onClick={() => { setMode("survey"); setSurveyStep("budget"); }}
                  className="w-full p-4 bg-surface rounded-xl text-left hover:bg-border transition-colors"
                >
                  <div className="font-medium text-foreground">🎓 Mentorship Program</div>
                  <div className="text-sm text-muted">1:1 guidance from experts</div>
                </button>
                <button
                  onClick={() => window.open("https://teeco.co", "_blank")}
                  className="w-full p-4 bg-surface rounded-xl text-left hover:bg-border transition-colors"
                >
                  <div className="font-medium text-foreground">🏠 Co-hosting Services</div>
                  <div className="text-sm text-muted">Professional property management</div>
                </button>
              </div>
            )}

            {mode === "chat" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {messages.length === 0 && (
                    <div className="text-center text-muted py-8">
                      <p>Ask me anything about STR investing!</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl max-w-[85%] ${
                        msg.role === "user"
                          ? "bg-primary text-white ml-auto"
                          : "bg-surface text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="bg-surface text-muted p-3 rounded-xl max-w-[85%]">
                      Thinking...
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type your question..."
                      className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                  <button
                    onClick={resetChat}
                    className="w-full mt-2 text-sm text-muted hover:text-foreground"
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
                    <h4 className="font-medium">What&apos;s your investment budget?</h4>
                    {["Under $100k", "$100k-250k", "$250k-500k", "$500k+"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3 bg-surface rounded-lg text-left hover:bg-border transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "timeline" && (
                  <div className="space-y-3">
                    <h4 className="font-medium">When are you looking to invest?</h4>
                    {["Ready now", "3-6 months", "6-12 months", "Just exploring"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3 bg-surface rounded-lg text-left hover:bg-border transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "experience" && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Your STR experience level?</h4>
                    {["First-time investor", "1-3 properties", "4+ properties"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSurveyAnswer(opt)}
                        className="w-full p-3 bg-surface rounded-lg text-left hover:bg-border transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {surveyStep === "email" && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Enter your email to continue</h4>
                    <input
                      type="email"
                      value={surveyData.email}
                      onChange={(e) => setSurveyData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleEmailSubmit}
                      className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {surveyStep === "complete" && (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-4">🎉</div>
                    <h4 className="font-medium mb-2">Thanks for your interest!</h4>
                    {isQualified ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted">
                          You qualify for our Mentorship Program! Reach out to get started:
                        </p>
                        <a
                          href="mailto:hello@teeco.co"
                          className="block w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
                        >
                          Email hello@teeco.co
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">
                        We&apos;ll send you helpful resources to get started with STR investing!
                      </p>
                    )}
                    <button
                      onClick={resetChat}
                      className="mt-4 text-sm text-muted hover:text-foreground"
                    >
                      ← Back to menu
                    </button>
                  </div>
                )}

                {surveyStep !== "complete" && surveyStep !== "email" && (
                  <button
                    onClick={resetChat}
                    className="w-full mt-4 text-sm text-muted hover:text-foreground"
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
