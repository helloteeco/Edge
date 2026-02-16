"use client";

import { useState, useRef, useCallback, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";

// Save limit constant - can be easily changed
export const SAVE_LIMIT = 10;

// Helper to get total saved count (account-specific)
export function getTotalSavedCount(): number {
  if (typeof window === 'undefined') return 0;
  // Dynamic import not available in sync context, so inline the logic
  const authEmail = localStorage.getItem("edge_auth_email");
  const authToken = localStorage.getItem("edge_auth_token");
  const authExpiry = localStorage.getItem("edge_auth_expiry");
  const email = (authEmail && authToken && authExpiry && Date.now() < parseInt(authExpiry, 10)) ? authEmail : null;
  if (!email) return 0;
  const savedCities = JSON.parse(localStorage.getItem(`savedCities__${email}`) || "[]");
  const savedStates = JSON.parse(localStorage.getItem(`savedStates__${email}`) || "[]");
  return savedCities.length + savedStates.length;
}

// Helper to check if at save limit
export function isAtSaveLimit(): boolean {
  return getTotalSavedCount() >= SAVE_LIMIT;
}

// Helper to check if user is logged in
function isUserLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  const authEmail = localStorage.getItem("edge_auth_email");
  const authToken = localStorage.getItem("edge_auth_token");
  const authExpiry = localStorage.getItem("edge_auth_expiry");
  return !!(authEmail && authToken && authExpiry && Date.now() < parseInt(authExpiry, 10));
}

// Helper to check if login prompt has been shown
function hasShownLoginPrompt(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem("edge_shown_login_prompt") === "true";
}

// Helper to mark login prompt as shown
function markLoginPromptShown(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem("edge_shown_login_prompt", "true");
}

interface DoubleTapSaveProps {
  children: ReactNode;
  isSaved: boolean;
  onToggleSave: () => void;
  className?: string;
}

export function DoubleTapSave({ children, isSaved, onToggleSave, className = "" }: DoubleTapSaveProps) {
  const [showHeart, setShowHeart] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const [animationType, setAnimationType] = useState<'pop' | 'shake'>('pop');
  const lastTapRef = useRef<number>(0);
  const lastTapPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0;
        clientY = e.touches[0]?.clientY || e.changedTouches[0]?.clientY || 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setHeartPosition({
          x: clientX - rect.left,
          y: clientY - rect.top
        });
      }

      if (isSaved) {
        // Double-tap to unsave
        setAnimationType('pop');
        setShowHeart(true);
        onToggleSave();
        setTimeout(() => setShowHeart(false), 1000);
      } else {
        if (isAtSaveLimit()) {
          setAnimationType('shake');
          setShowHeart(true);
          setShowLimitWarning(true);
          setTimeout(() => {
            setShowHeart(false);
            setShowLimitWarning(false);
          }, 2500);
        } else {
          setAnimationType('pop');
          setShowHeart(true);
          onToggleSave();
          setTimeout(() => setShowHeart(false), 1000);
          
          if (!isUserLoggedIn() && !hasShownLoginPrompt()) {
            setTimeout(() => {
              setShowLoginPrompt(true);
              markLoginPromptShown();
            }, 1200);
          }
        }
      }
      
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [isSaved, onToggleSave]);

  const wasPinchRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // If 2+ fingers touch, it's a pinch gesture — flag it so we skip the double-tap
    if (e.touches.length >= 2) {
      wasPinchRef.current = true;
      return;
    }
    lastTapPositionRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // If this touch sequence involved a pinch, ignore it entirely
    if (wasPinchRef.current) {
      // Reset once all fingers are lifted
      if (e.touches.length === 0) {
        wasPinchRef.current = false;
      }
      return;
    }
    const mockEvent = {
      ...e,
      clientX: lastTapPositionRef.current.x,
      clientY: lastTapPositionRef.current.y,
      preventDefault: () => e.preventDefault()
    } as unknown as React.TouchEvent;
    handleDoubleTap(mockEvent);
  }, [handleDoubleTap]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if ('ontouchstart' in window) return;
    handleDoubleTap(e);
  }, [handleDoubleTap]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      
      {/* Heart Animation Overlay */}
      {showHeart && (
        <div 
          className="absolute pointer-events-none z-50"
          style={{
            left: heartPosition.x,
            top: heartPosition.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className={animationType === 'pop' ? 'animate-heart-pop' : 'animate-heart-shake'}>
            <svg 
              width="80" 
              height="80" 
              viewBox="0 0 24 24" 
              fill={animationType === 'pop' ? (isSaved ? '#9ca3af' : '#ef4444') : '#9ca3af'}
              className="drop-shadow-lg"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Limit Warning Toast */}
      {showLimitWarning && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg animate-slide-down"
          style={{ 
            backgroundColor: '#2b2823',
            maxWidth: '90vw'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💔</span>
            <div>
              <p className="text-white font-medium text-sm">Save limit reached</p>
              <p className="text-gray-400 text-xs">Remove a saved item to add more (max {SAVE_LIMIT})</p>
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 99999,
            boxSizing: 'border-box',
          }}
          onClick={() => setShowLoginPrompt(false)}
        >
          <div 
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '340px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center relative">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="absolute -top-2 -right-2 p-2 rounded-full hover:bg-gray-100 transition-all"
                style={{ color: '#787060' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#ef4444">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#2b2823' }}>Market Saved!</h3>
              <p className="text-sm mb-6" style={{ color: '#787060' }}>
                Sign in to sync your saved markets across all your devices and never lose them.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowLoginPrompt(false);
                    setShowAuthModal(true);
                  }}
                  className="w-full py-3 rounded-xl font-medium text-white transition-all hover:opacity-90 active:scale-98"
                  style={{ backgroundColor: '#2b2823' }}
                >
                  Sign In to Sync
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-80"
                  style={{ color: '#787060' }}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
        }}
        title="Sign in to Edge"
        subtitle="Sign in to save your favorite markets and sync across all your devices. No password needed."
      />
    </div>
  );
}

// Floating Save Button Component with count - redesigned to match screenshot
interface FloatingSaveButtonProps {
  isSaved: boolean;
  onToggleSave: () => void;
  hideCount?: boolean;
  marketLikeCount?: number | null; // Server-side like count for this specific market
}

export function FloatingSaveButton({ isSaved, onToggleSave, hideCount = false, marketLikeCount }: FloatingSaveButtonProps) {
  const [saveCount, setSaveCount] = useState(0);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const touchFiredRef = useRef(false);

  useEffect(() => {
    setSaveCount(getTotalSavedCount());
  }, [isSaved]);

  const doToggle = () => {
    if (!isUserLoggedIn()) {
      setShowLoginPrompt(true);
      return;
    }
    if (!isSaved && isAtSaveLimit()) {
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 2500);
      return;
    }
    onToggleSave();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    touchFiredRef.current = true;
    doToggle();
    // Reset after a short delay so click events on non-touch don't get blocked
    setTimeout(() => { touchFiredRef.current = false; }, 300);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Skip if touch already handled this
    if (touchFiredRef.current) return;
    doToggle();
  };

  return (
    <>
      <button
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col items-center justify-center transition-all active:scale-95"
        style={{ 
          backgroundColor: 'transparent',
          width: '56px',
          padding: '12px 0 4px 0',
          borderRadius: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={isSaved ? "Remove from saved" : "Save"}
      >
        <svg 
          width="26" 
          height="26" 
          viewBox="0 0 24 24" 
          fill={isSaved ? '#ef4444' : 'none'}
          stroke={isSaved ? '#ef4444' : '#2b2823'}
          strokeWidth="1.5"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        {!hideCount && (
          <span 
            className="text-[10px] font-medium mt-0.5"
            style={{ color: isSaved ? '#ef4444' : '#787060' }}
          >
            {marketLikeCount != null && marketLikeCount > 0 ? marketLikeCount : `${saveCount}/${SAVE_LIMIT}`}
          </span>
        )}
      </button>

      {/* Login Required Prompt */}
      {showLoginPrompt && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 99999,
            boxSizing: 'border-box',
          }}
          onClick={() => setShowLoginPrompt(false)}
        >
          <div 
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '340px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center relative">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="absolute -top-2 -right-2 p-2 rounded-full hover:bg-gray-100 transition-all"
                style={{ color: '#787060' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#ef4444">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#2b2823' }}>Sign in to Like</h3>
              <p className="text-sm mb-6" style={{ color: '#787060' }}>
                Sign in to like markets, track your favorites, and see what other investors are watching.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowLoginPrompt(false);
                    setShowAuthModal(true);
                  }}
                  className="w-full py-3 rounded-xl font-medium text-white transition-all hover:opacity-90 active:scale-98"
                  style={{ backgroundColor: '#2b2823' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-80"
                  style={{ color: '#787060' }}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          // After login, try the save action again
          if (!isSaved && !isAtSaveLimit()) {
            onToggleSave();
          }
        }}
        title="Sign in to Edge"
        subtitle="Sign in to like your favorite markets and sync across all your devices."
      />

      {/* Limit Warning Toast */}
      {showLimitWarning && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg animate-slide-down"
          style={{ 
            backgroundColor: '#2b2823',
            maxWidth: '90vw'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💔</span>
            <div>
              <p className="text-white font-medium text-sm">Save limit reached</p>
              <p className="text-gray-400 text-xs">Remove a saved item to add more (max {SAVE_LIMIT})</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Share data interface for creating API-based share links with OG preview
export interface ShareData {
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  guestCount: number;
  purchasePrice: number;
  annualRevenue: number;
  occupancyRate: number;
  adr: number;
  cashFlow: number;
  cashOnCash: number;
  analysisData?: any;
}

// Floating Share Button Component - redesigned with paper plane icon
export function FloatingShareButton({ shareText, shareData }: { shareText?: string; shareData?: ShareData }) {
  const [showCopied, setShowCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const touchFiredRef = useRef(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    let shareUrl = window.location.href;
    const title = shareText || document.title;
    
    // Try to create an API share link for OG preview, fall back to current URL
    if (shareData) {
      try {
        setIsCreating(true);
        const response = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shareData)
        });
        if (response.ok) {
          const data = await response.json();
          if (data.shareUrl) shareUrl = data.shareUrl;
        }
      } catch (err) {
        // Fall back to current URL silently
        console.log('Share link creation failed, using current URL');
      } finally {
        setIsCreating(false);
      }
    }
    
    // Build a readable share message with the URL
    const shareMessage = shareData 
      ? `${title}\n${shareUrl}`
      : shareUrl;
    
    // Use native share on mobile devices
    if (typeof navigator !== 'undefined' && navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: title,
          text: title,
          url: shareUrl
        });
        return;
      } catch (err: any) {
        // If user cancelled, don't fall through to clipboard
        if (err?.name === 'AbortError') return;
        console.log('Native share failed, falling back to clipboard');
      }
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareMessage);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      // Last resort: use old execCommand
      const textArea = document.createElement('textarea');
      textArea.value = shareMessage;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { if (touchFiredRef.current) return; handleShare(e); }}
        onTouchEnd={(e) => { e.preventDefault(); touchFiredRef.current = true; handleShare(e as any); setTimeout(() => { touchFiredRef.current = false; }, 300); }}
        className="flex items-center justify-center transition-all active:scale-95"
        style={{
          backgroundColor: 'transparent',
          width: '56px',
          padding: '10px 0 12px 0',
          borderRadius: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label="Share"
      >
        {/* Paper plane / send icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2b2823"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      </button>

      {/* Copied Toast */}
      {showCopied && (
        <div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg"
          style={{ backgroundColor: '#2b2823' }}
        >
          <p className="text-white font-medium text-sm">Link copied to clipboard!</p>
        </div>
      )}
    </>
  );
}

// Combined Floating Action Pill - Heart + Share in a white rounded pill
interface FloatingActionPillProps {
  isSaved: boolean;
  onToggleSave: () => void;
  shareText?: string;
  shareData?: ShareData;
  hideCount?: boolean;
  marketLikeCount?: number | null;
}

export function FloatingActionPill({ isSaved, onToggleSave, shareText, shareData, hideCount = false, marketLikeCount }: FloatingActionPillProps) {
  return (
    <div 
      className="fixed right-4 z-40 flex flex-col items-center overflow-hidden"
      style={{
        bottom: '160px',
        backgroundColor: '#ffffff',
        border: '1.5px solid #d8d6cd',
        borderRadius: '20px',
        boxShadow: '0 4px 20px -4px rgba(43, 40, 35, 0.18)',
        width: '56px',
      }}
    >
      <FloatingSaveButton isSaved={isSaved} onToggleSave={onToggleSave} hideCount={hideCount} marketLikeCount={marketLikeCount} />
      <div style={{ width: '36px', height: '1px', backgroundColor: '#e5e3da' }} />
      <FloatingShareButton shareText={shareText} shareData={shareData} />
    </div>
  );
}
