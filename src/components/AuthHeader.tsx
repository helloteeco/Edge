"use client";

import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";

interface AuthHeaderProps {
  className?: string;
  variant?: "light" | "dark"; // light = dark text on light bg, dark = light text on dark bg
}

export default function AuthHeader({ className = "", variant = "light" }: AuthHeaderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const authEmail = localStorage.getItem("edge_auth_email");
    const authToken = localStorage.getItem("edge_auth_token");
    const authExpiry = localStorage.getItem("edge_auth_expiry");
    
    const hasValidSession = authEmail && authToken && authExpiry && 
      Date.now() < parseInt(authExpiry, 10);
    
    if (hasValidSession) {
      setIsAuthenticated(true);
      setUserEmail(authEmail);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("edge_auth_email");
    localStorage.removeItem("edge_auth_token");
    localStorage.removeItem("edge_auth_expiry");
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  const handleAuthSuccess = (email: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setShowAuthModal(false);
  };

  // Styles based on variant
  const styles = variant === "dark" 
    ? {
        signedInText: { color: 'rgba(255, 255, 255, 0.7)' },
        checkColor: 'rgba(134, 239, 172, 0.9)',
        emailText: { color: '#ffffff' },
        signOutBtn: { 
          color: 'rgba(255, 255, 255, 0.7)', 
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        },
        signInBtn: { 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }
      }
    : {
        signedInText: { color: '#16a34a' },
        checkColor: '#16a34a',
        emailText: { color: '#2b2823' },
        signOutBtn: { 
          color: '#787060', 
          border: '1px solid #d8d6cd',
          backgroundColor: '#ffffff'
        },
        signInBtn: { 
          backgroundColor: '#2b2823', 
          color: '#ffffff' 
        }
      };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {isAuthenticated ? (
          <>
            <div className="hidden sm:flex items-center gap-2 text-xs" style={styles.signedInText}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: styles.checkColor }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="hidden md:inline" style={styles.emailText}>{userEmail}</span>
              <span className="md:hidden">Signed in</span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={styles.signOutBtn}
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
            style={styles.signInBtn}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign In
          </button>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to Edge"
        subtitle="Sign in to save your favorite markets and sync across all your devices. No password needed."
      />
    </>
  );
}
