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

  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = () => setShowDropdown(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showDropdown]);

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {isVerifying ? (
          <div className="flex items-center gap-2 text-xs" style={styles.verifyingText}>
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Signing in...</span>
          </div>
        ) : isAuthenticated ? (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{
                backgroundColor: variant === 'dark' ? 'rgba(34, 197, 94, 0.25)' : '#f0fdf4',
                border: variant === 'dark' ? '2px solid rgba(34, 197, 94, 0.5)' : '2px solid #bbf7d0',
              }}
              aria-label="Account menu"
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke={variant === 'dark' ? '#86efac' : '#16a34a'} strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </button>
            {/* Dropdown menu */}
            {showDropdown && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden shadow-lg z-50"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e3da',
                  boxShadow: '0 8px 24px -4px rgba(43, 40, 35, 0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* User info */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0efe9' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium" style={{ color: '#16a34a' }}>Signed in</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: '#4a4640' }}>{userEmail}</p>
                </div>
                {/* Sign out button */}
                <button
                  onClick={() => { handleSignOut(); setShowDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-all hover:bg-red-50"
                  style={{ color: '#787060' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 min-h-[44px]"
            style={styles.signInBtn}
            aria-label="Sign in to your account"
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
