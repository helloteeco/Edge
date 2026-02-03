"use client";

import { useState, useRef, useCallback, ReactNode } from "react";

interface DoubleTapSaveProps {
  children: ReactNode;
  isSaved: boolean;
  onToggleSave: () => void;
  className?: string;
}

export function DoubleTapSave({ children, isSaved, onToggleSave, className = "" }: DoubleTapSaveProps) {
  const [showHeart, setShowHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
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

      // Show heart animation
      setShowHeart(true);
      
      // Only save if not already saved (like Instagram - double tap only adds, doesn't remove)
      if (!isSaved) {
        onToggleSave();
      }

      // Hide heart after animation
      setTimeout(() => setShowHeart(false), 1000);
      
      lastTapRef.current = 0; // Reset to prevent triple-tap
    } else {
      lastTapRef.current = now;
    }
  }, [isSaved, onToggleSave]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      onClick={handleTap}
      onTouchEnd={handleTap}
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
          <div className="animate-heart-pop">
            <svg 
              width="80" 
              height="80" 
              viewBox="0 0 24 24" 
              fill="#ef4444"
              className="drop-shadow-lg"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// Floating Save Button Component
interface FloatingSaveButtonProps {
  isSaved: boolean;
  onToggleSave: () => void;
}

export function FloatingSaveButton({ isSaved, onToggleSave }: FloatingSaveButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleSave();
      }}
      className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 hover:scale-105"
      style={{ 
        backgroundColor: isSaved ? '#ef4444' : '#ffffff',
        border: '2px solid #d8d6cd',
        boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.2)'
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
    </button>
  );
}
