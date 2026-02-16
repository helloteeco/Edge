"use client";

import { useState, useEffect } from "react";

// 16 pre-made avatar options — SVG-based, crisp at any size
const AVATARS: { id: string; label: string; bg: string; icon: (color: string) => JSX.Element }[] = [
  // Investor personas
  {
    id: "house",
    label: "House",
    bg: "#dcfce7",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} className="w-full h-full p-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    id: "chart",
    label: "Chart",
    bg: "#dbeafe",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} className="w-full h-full p-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: "key",
    label: "Key",
    bg: "#fef3c7",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} className="w-full h-full p-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    id: "briefcase",
    label: "Briefcase",
    bg: "#f3e8ff",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} className="w-full h-full p-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  // Animals
  {
    id: "owl",
    label: "Owl",
    bg: "#fef9c3",
    icon: (c) => (
      <svg viewBox="0 0 64 64" fill={c} className="w-full h-full p-2">
        <circle cx="22" cy="26" r="8" fill="none" stroke={c} strokeWidth="3"/>
        <circle cx="42" cy="26" r="8" fill="none" stroke={c} strokeWidth="3"/>
        <circle cx="22" cy="26" r="3"/>
        <circle cx="42" cy="26" r="3"/>
        <path d="M30 30 L32 36 L34 30" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 20 L10 8 L22 18" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M50 20 L54 8 L42 18" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 42 Q32 52 46 42" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M20 46 L22 52 M32 48 L32 54 M44 46 L42 52" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "eagle",
    label: "Eagle",
    bg: "#e0e7ff",
    icon: (c) => (
      <svg viewBox="0 0 64 64" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-2">
        <path d="M32 14 C24 14 18 20 18 28 C18 38 26 46 32 50 C38 46 46 38 46 28 C46 20 40 14 32 14Z"/>
        <circle cx="26" cy="26" r="2" fill={c}/>
        <circle cx="38" cy="26" r="2" fill={c}/>
        <path d="M28 34 L32 38 L36 34"/>
        <path d="M18 22 L10 18 M46 22 L54 18"/>
      </svg>
    ),
  },
  {
    id: "bull",
    label: "Bull",
    bg: "#fee2e2",
    icon: (c) => (
      <svg viewBox="0 0 64 64" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-2">
        <ellipse cx="32" cy="34" rx="14" ry="12"/>
        <circle cx="26" cy="30" r="2" fill={c}/>
        <circle cx="38" cy="30" r="2" fill={c}/>
        <path d="M28 40 Q32 44 36 40"/>
        <circle cx="28" cy="42" r="1.5" fill={c}/>
        <circle cx="36" cy="42" r="1.5" fill={c}/>
        <path d="M18 26 L12 16 M46 26 L52 16"/>
      </svg>
    ),
  },
  {
    id: "fox",
    label: "Fox",
    bg: "#ffedd5",
    icon: (c) => (
      <svg viewBox="0 0 64 64" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-2">
        <path d="M32 48 C22 48 14 40 14 30 L20 12 L28 24 L36 24 L44 12 L50 30 C50 40 42 48 32 48Z"/>
        <circle cx="26" cy="32" r="2" fill={c}/>
        <circle cx="38" cy="32" r="2" fill={c}/>
        <path d="M30 38 L32 40 L34 38"/>
      </svg>
    ),
  },
  // Abstract / geometric
  {
    id: "diamond",
    label: "Diamond",
    bg: "#cffafe",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} className="w-full h-full p-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 6.75L12 20.25M3.75 6.75l3-3.75h10.5l3 3.75M12 20.25l8.25-13.5M12 20.25L3.75 6.75m16.5 0L12 20.25" />
      </svg>
    ),
  },
  {
    id: "star",
    label: "Star",
    bg: "#fef3c7",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill={c} className="w-full h-full p-1.5">
        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
      </svg>
    ),
  },
  {
    id: "bolt",
    label: "Lightning",
    bg: "#fde68a",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill={c} className="w-full h-full p-1.5">
        <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: "fire",
    label: "Fire",
    bg: "#fee2e2",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill={c} className="w-full h-full p-1.5">
        <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
      </svg>
    ),
  },
  // People / fun
  {
    id: "rocket",
    label: "Rocket",
    bg: "#e0e7ff",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} className="w-full h-full p-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    id: "globe",
    label: "Globe",
    bg: "#d1fae5",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} className="w-full h-full p-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    id: "crown",
    label: "Crown",
    bg: "#fef3c7",
    icon: (c) => (
      <svg viewBox="0 0 64 64" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-2">
        <path d="M10 44 L10 24 L22 34 L32 18 L42 34 L54 24 L54 44Z" fill={c} opacity="0.15"/>
        <path d="M10 44 L10 24 L22 34 L32 18 L42 34 L54 24 L54 44Z"/>
        <line x1="10" y1="48" x2="54" y2="48"/>
      </svg>
    ),
  },
  {
    id: "heart",
    label: "Heart",
    bg: "#fce7f3",
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill={c} className="w-full h-full p-1.5">
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      </svg>
    ),
  },
];

const AVATAR_STORAGE_KEY = "edge_user_avatar";

export function getSelectedAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AVATAR_STORAGE_KEY);
}

export function AvatarIcon({ avatarId, size = 36 }: { avatarId: string | null; size?: number }) {
  const avatar = avatarId ? AVATARS.find((a) => a.id === avatarId) : null;

  if (!avatar) {
    // Default person icon
    return (
      <div
        className="rounded-full flex items-center justify-center"
        style={{ width: size, height: size, backgroundColor: "rgba(34, 197, 94, 0.25)", border: "2px solid rgba(34, 197, 94, 0.5)" }}
      >
        <svg className="w-1/2 h-1/2" fill="none" stroke="#86efac" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
    );
  }

  const iconColor = {
    "#dcfce7": "#16a34a", "#dbeafe": "#2563eb", "#fef3c7": "#d97706", "#f3e8ff": "#7c3aed",
    "#fef9c3": "#a16207", "#e0e7ff": "#4338ca", "#fee2e2": "#dc2626", "#ffedd5": "#c2410c",
    "#cffafe": "#0891b2", "#fde68a": "#b45309", "#d1fae5": "#059669", "#fce7f3": "#db2777",
  }[avatar.bg] || "#2b2823";

  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size, backgroundColor: avatar.bg, border: `2px solid ${avatar.bg}` }}
    >
      {avatar.icon(iconColor)}
    </div>
  );
}

interface AvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarId: string) => void;
  currentAvatarId: string | null;
}

export default function AvatarPicker({ isOpen, onClose, onSelect, currentAvatarId }: AvatarPickerProps) {
  const [selected, setSelected] = useState<string | null>(currentAvatarId);

  useEffect(() => {
    setSelected(currentAvatarId);
  }, [currentAvatarId]);

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    setSelected(id);
    localStorage.setItem(AVATAR_STORAGE_KEY, id);
    onSelect(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e3da",
          boxShadow: "0 20px 60px -12px rgba(43, 40, 35, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f0efe9" }}>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "#2b2823" }}>Choose Your Avatar</h3>
            <p className="text-xs mt-0.5" style={{ color: "#9a958c" }}>Pick one that represents you</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close avatar picker"
          >
            <svg className="w-5 h-5" fill="none" stroke="#787060" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar Grid */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((avatar) => {
              const isSelected = selected === avatar.id;
              const iconColor = {
                "#dcfce7": "#16a34a", "#dbeafe": "#2563eb", "#fef3c7": "#d97706", "#f3e8ff": "#7c3aed",
                "#fef9c3": "#a16207", "#e0e7ff": "#4338ca", "#fee2e2": "#dc2626", "#ffedd5": "#c2410c",
                "#cffafe": "#0891b2", "#fde68a": "#b45309", "#d1fae5": "#059669", "#fce7f3": "#db2777",
              }[avatar.bg] || "#2b2823";

              return (
                <button
                  key={avatar.id}
                  onClick={() => handleSelect(avatar.id)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:scale-105 active:scale-95 min-h-[44px]"
                  style={{
                    backgroundColor: isSelected ? "#f0fdf4" : "transparent",
                    border: isSelected ? "2px solid #22c55e" : "2px solid transparent",
                  }}
                  aria-label={`Select ${avatar.label} avatar`}
                  aria-pressed={isSelected}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: avatar.bg }}
                  >
                    {avatar.icon(iconColor)}
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: isSelected ? "#16a34a" : "#787060" }}>
                    {avatar.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3" style={{ borderTop: "1px solid #f0efe9", backgroundColor: "#faf9f7" }}>
          <p className="text-[11px] text-center" style={{ color: "#9a958c" }}>
            Your avatar shows in the top-right of every page
          </p>
        </div>
      </div>
    </div>
  );
}
