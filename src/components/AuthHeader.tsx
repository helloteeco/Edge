"use client";

import { useState, useEffect, useCallback } from "react";
import AuthModal from "./AuthModal";
import AvatarPicker, { AvatarIcon, getSelectedAvatar } from "./AvatarPicker";

interface AuthHeaderProps {
  className?: string;
  variant?: "light" | "dark"; // light = dark text on light bg, dark = light text on dark bg
}

export default function AuthHeader({ className = "", variant = "light" }: AuthHeaderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

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
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    
    if (token) {
      console.log("[AuthHeader] Token detected in URL, deferring to page handler...");
      setIsVerifying(true);
      const timer = setTimeout(() => {
        checkAuthState();
        setIsVerifying(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    
    checkAuthState();
  }, [checkAuthState]);

  // Load selected avatar on mount — prefer cloud version for cross-device sync
  useEffect(() => {
    const localAvatar = getSelectedAvatar();
    setSelectedAvatar(localAvatar);
    // If authenticated, fetch cloud avatar and override local
    const email = localStorage.getItem('edge_auth_email');
    const token = localStorage.getItem('edge_auth_token');
    const expiry = localStorage.getItem('edge_auth_expiry');
    if (email && token && expiry && Date.now() < parseInt(expiry, 10)) {
      fetch(`/api/user-profile?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.profile?.avatar_id) {
            localStorage.setItem('edge_user_avatar', data.profile.avatar_id);
            setSelectedAvatar(data.profile.avatar_id);
          } else if (data.success && !data.profile?.avatar_id && localAvatar) {
            // Local has avatar but cloud doesn't — push local to cloud
            fetch('/api/user-profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, avatarId: localAvatar }),
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  // Listen for storage events from other tabs (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "edge_auth_sync" || e.key === "edge_auth_email" || e.key === "edge_auth_token") {
        console.log("[AuthHeader] Storage change detected, checking auth state...");
        checkAuthState();
      }
      if (e.key === "edge_user_avatar") {
        setSelectedAvatar(getSelectedAvatar());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    const pollInterval = setInterval(() => {
      const currentAuth = localStorage.getItem("edge_auth_email");
      if (currentAuth && !isAuthenticated) {
        console.log("[AuthHeader] Polling detected new auth state");
        checkAuthState();
      } else if (!currentAuth && isAuthenticated) {
        console.log("[AuthHeader] Polling detected sign out");
        checkAuthState();
      }
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [checkAuthState, isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = () => setShowDropdown(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showDropdown]);

  const handleSignOut = () => {
    localStorage.removeItem("edge_auth_email");
    localStorage.removeItem("edge_auth_token");
    localStorage.removeItem("edge_auth_expiry");
    localStorage.setItem("edge_auth_sync", Date.now().toString());
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  const handleAuthSuccess = (email: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setShowAuthModal(false);
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    setShowAvatarPicker(false);
  };

  // Styles based on variant
  const styles = variant === "dark" 
    ? {
        signInBtn: { 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        },
        verifyingText: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    : {
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
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
              className="flex items-center justify-center transition-all hover:opacity-80 focus:outline-none min-w-[44px] min-h-[44px]"
              aria-label="Account menu"
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              <AvatarIcon avatarId={selectedAvatar} size={36} />
            </button>
            {/* Dropdown menu */}
            {showDropdown && (
              <div
                className="absolute right-0 top-full mt-2 w-60 rounded-xl overflow-hidden shadow-lg z-50"
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
                {/* Change Avatar */}
                <button
                  onClick={() => { setShowAvatarPicker(true); setShowDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-all hover:bg-gray-50 min-h-[44px]"
                  style={{ color: '#4a4640', borderBottom: '1px solid #f0efe9' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                  </svg>
                  Change Avatar
                </button>
                {/* Sign out button */}
                <button
                  onClick={() => { handleSignOut(); setShowDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-all hover:bg-red-50 min-h-[44px]"
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

      {/* Avatar Picker Modal */}
      <AvatarPicker
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSelect={handleAvatarSelect}
        currentAvatarId={selectedAvatar}
      />
    </>
  );
}
