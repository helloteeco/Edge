"use client";

import { useState, useEffect, useCallback } from "react";
import AuthModal from "./AuthModal";

interface AuthHeaderProps {
  className?: string;
  variant?: "light" | "dark"; // light = dark text on light bg, dark = light text on dark bg
}

export default function AuthHeader({ className = "", variant = "light" }: AuthHeaderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Check localStorage for auth state
  const checkAuthState = useCallback(() => {
    const authEmail = localStorage.getItem("edge_auth_email");
    const authToken = localStorage.getItem("edge_auth_token");
    const authExpiry = localStorage.getItem("edge_auth_expiry");
    
    const hasValidSession = authEmail && authToken && authExpiry && 
      Date.now() < parseInt(authExpiry, 10);
    
    if (hasValidSession) {
      setIsAuthenticated(true);
      setUserEmail(authEmail);
      return true;
    } else {
      setIsAuthenticated(false);
      setUserEmail(null);
      return false;
    }
  }, []);

  // Check auth status on mount and handle magic link token
  useEffect(() => {
    // Don't handle magic link tokens here — let the page component handle it
    // to avoid race conditions with duplicate verify calls.
    // AuthHeader only reads localStorage for auth state.
    
    // Check if a token is in the URL — if so, wait briefly for the page to handle it
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    
    if (token) {
      console.log("[AuthHeader] Token detected in URL, deferring to page handler...");
      setIsVerifying(true);
      // Wait for the page to verify and store auth, then check localStorage
      const timer = setTimeout(() => {
        checkAuthState();
        setIsVerifying(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    
    // No token in URL, check localStorage for existing session
    checkAuthState();
  }, [checkAuthState]);

  // Listen for storage events from other tabs (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // When auth state changes in another tab, update this tab
      if (e.key === "edge_auth_sync" || e.key === "edge_auth_email" || e.key === "edge_auth_token") {
        console.log("[AuthHeader] Storage change detected, checking auth state...");
        checkAuthState();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also poll periodically in case storage events don't fire (some browsers)
    const pollInterval = setInterval(() => {
      const currentAuth = localStorage.getItem("edge_auth_email");
      if (currentAuth && !isAuthenticated) {
        console.log("[AuthHeader] Polling detected new auth state");
        checkAuthState();
      } else if (!currentAuth && isAuthenticated) {
        console.log("[AuthHeader] Polling detected sign out");
        checkAuthState();
      }
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [checkAuthState, isAuthenticated]);

  const handleSignOut = () => {
    localStorage.removeItem("edge_auth_email");
    localStorage.removeItem("edge_auth_token");
    localStorage.removeItem("edge_auth_expiry");
    localStorage.setItem("edge_auth_sync", Date.now().toString()); // Notify other tabs
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
        },
        verifyingText: { color: 'rgba(255, 255, 255, 0.7)' }
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
        },
        verifyingText: { color: '#787060' }
      };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {isVerifying ? (
          <div className="flex items-center gap-2 text-xs" style={styles.verifyingText}>
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Signing in...</span>
          </div>
        ) : isAuthenticated ? (
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
