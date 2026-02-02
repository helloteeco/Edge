"use client";

import { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  title?: string;
  subtitle?: string;
}

type AuthStep = "email" | "verifying" | "sent";

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  title = "Sign in to Sync",
  subtitle = "Enter your email to receive a secure sign-in link. No password needed."
}: AuthModalProps) {
  const [authStep, setAuthStep] = useState<AuthStep>("email");
  const [authEmail, setAuthEmail] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const handleClose = () => {
    setAuthStep("email");
    setAuthError(null);
    onClose();
  };

  // Send magic link email - includes current page URL for redirect
  const sendMagicLink = async () => {
    if (!authEmail || !authEmail.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    setAuthError(null);
    setAuthStep("verifying");
    
    try {
      // Get current page path for redirect after auth
      const currentPath = window.location.pathname;
      
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: authEmail,
          redirectPath: currentPath // Send current page path
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAuthStep("sent");
      } else {
        setAuthError(data.error || "Failed to send email. Please try again.");
        setAuthStep("email");
      }
    } catch (err) {
      console.error("Magic link error:", err);
      setAuthError("Failed to send email. Please try again.");
      setAuthStep("email");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl p-8 max-w-md w-full" 
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
      >
        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {authStep === "email" && (
          <>
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src="/teeco-logocopy.PNG" alt="Teeco" className="h-10" />
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#2b2823' }}>
              {title}
            </h2>
            <p className="text-center text-sm mb-6" style={{ color: '#787060' }}>
              {subtitle}
            </p>
            
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-red-700 text-sm">{authError}</p>
              </div>
            )}
            
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              placeholder="your@email.com"
              className="w-full px-4 py-4 rounded-xl border-2 text-base mb-4 transition-colors focus:outline-none"
              style={{ borderColor: '#e5e5e5' }}
              autoFocus
            />
            
            <button
              onClick={sendMagicLink}
              disabled={!authEmail || !authEmail.includes("@")}
              className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: '#2b2823' }}
            >
              Send Magic Link
            </button>
            
            <p className="text-xs text-center mt-4" style={{ color: '#a0a0a0' }}>
              By signing in, you agree to our{" "}
              <a href="/terms" target="_blank" className="underline hover:opacity-80">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" className="underline hover:opacity-80">Privacy Policy</a>.
            </p>
          </>
        )}
        
        {authStep === "verifying" && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium" style={{ color: '#2b2823' }}>Sending...</p>
            <p className="text-sm mt-2" style={{ color: '#787060' }}>Please wait a moment.</p>
          </div>
        )}
        
        {authStep === "sent" && (
          <div className="text-center py-4">
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#e8f5e9' }}>
              <svg className="w-8 h-8" fill="none" stroke="#4caf50" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#2b2823' }}>
              Check Your Email
            </h2>
            <p className="text-sm mb-4" style={{ color: '#787060' }}>
              We sent a magic link to:
            </p>
            <p className="font-semibold text-lg mb-6" style={{ color: '#2b2823' }}>
              {authEmail}
            </p>
            <p className="text-sm mb-6" style={{ color: '#787060' }}>
              Click the link in the email to sign in. You&apos;ll be brought right back here.
            </p>
            
            <div className="border-t pt-4" style={{ borderColor: '#e5e5e5' }}>
              <p className="text-xs mb-3" style={{ color: '#a0a0a0' }}>
                Didn&apos;t receive it? Check your spam folder or
              </p>
              <button
                onClick={() => {
                  setAuthStep("email");
                  setAuthError(null);
                }}
                className="text-sm font-medium underline"
                style={{ color: '#2b2823' }}
              >
                Try a different email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
