"use client";

import { useState, useRef, useCallback, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";

// Save limit constant - can be easily changed
export const SAVE_LIMIT = 10;

// Helper to get total saved count
export function getTotalSavedCount(): number {
  if (typeof window === 'undefined') return 0;
  const savedCities = JSON.parse(localStorage.getItem("savedCities") || "[]");
  const savedStates = JSON.parse(localStorage.getItem("savedStates") || "[]");
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
    const DOUBLE_TAP_DELAY = 300; // ms

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      e.preventDefault();
      
      // Get tap position for heart animation
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0;
        clientY = e.touches[0]?.clientY || e.changedTouches[0]?.clientY || 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Calculate position relative to container
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setHeartPosition({
          x: clientX - rect.left,
          y: clientY - rect.top
        });
      }

      // Check if already saved
      if (isSaved) {
        // Already saved - just show heart animation
        setAnimationType('pop');
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
      } else {
        // Not saved - check limit
        if (isAtSaveLimit()) {
          // At limit - show shake animation and warning
          setAnimationType('shake');
          setShowHeart(true);
          setShowLimitWarning(true);
          setTimeout(() => {
            setShowHeart(false);
            setShowLimitWarning(false);
          }, 2500);
        } else {
          // Can save - show pop animation and save
          setAnimationType('pop');
          setShowHeart(true);
          onToggleSave();
          setTimeout(() => setShowHeart(false), 1000);
          
          // Show login prompt after first save if not logged in
          if (!isUserLoggedIn() && !hasShownLoginPrompt()) {
            setTimeout(() => {
              setShowLoginPrompt(true);
              markLoginPromptShown();
            }, 1200); // Show after heart animation
          }
        }
      }
      
      lastTapRef.current = 0; // Reset to prevent triple-tap
    } else {
      lastTapRef.current = now;
    }
  }, [isSaved, onToggleSave]);

  // Handle touch start to record position
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    lastTapPositionRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);

  // Handle touch end for double-tap detection on mobile
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Use the stored position from touchstart
    const mockEvent = {
      ...e,
      clientX: lastTapPositionRef.current.x,
      clientY: lastTapPositionRef.current.y,
      preventDefault: () => e.preventDefault()
    } as unknown as React.TouchEvent;
    handleDoubleTap(mockEvent);
  }, [handleDoubleTap]);

  // Handle click for desktop double-click
  const handleClick = useCallback((e: React.MouseEvent) => {
    // On touch devices, ignore click events (use touch events instead)
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
              fill={animationType === 'pop' ? '#ef4444' : '#9ca3af'}
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

      {/* Login Prompt Modal - Using React Portal to render at document body */}
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
              {/* Close button */}
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
          // Optionally trigger a sync of saved items here
        }}
        title="Sign in to Edge"
        subtitle="Sign in to save your favorite markets and sync across all your devices. No password needed."
      />
    </div>
  );
}

// Floating Save Button Component with count
interface FloatingSaveButtonProps {
  isSaved: boolean;
  onToggleSave: () => void;
}

export function FloatingSaveButton({ isSaved, onToggleSave }: FloatingSaveButtonProps) {
  const [saveCount, setSaveCount] = useState(0);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // Update count on mount and when saved state changes
  useEffect(() => {
    setSaveCount(getTotalSavedCount());
  }, [isSaved]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If trying to save and at limit, show warning
    if (!isSaved && isAtSaveLimit()) {
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 2500);
      return;
    }
    
    onToggleSave();
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="fixed bottom-44 right-4 z-40 flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 hover:scale-105"
        style={{ 
          backgroundColor: isSaved ? '#ef4444' : '#ffffff',
          border: '2px solid #d8d6cd',
          boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.2)',
          width: '56px',
          height: '64px',
          borderRadius: '16px'
        }}
        aria-label={isSaved ? "Remove from saved" : "Save"}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill={isSaved ? '#ffffff' : 'none'}
          stroke={isSaved ? '#ffffff' : '#2b2823'}
          strokeWidth="2"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span 
          className="text-xs font-medium mt-0.5"
          style={{ color: isSaved ? '#ffffff' : '#787060' }}
        >
          {saveCount}/{SAVE_LIMIT}
        </span>
      </button>

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
