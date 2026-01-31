"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Map", href: "/", icon: "🗺️" },
  { name: "Search", href: "/search", icon: "🔍" },
  { name: "Calculator", href: "/calculator", icon: "🏠" },
  { name: "Saved", href: "/saved", icon: "❤️" },
  { name: "Funding", href: "/funding", icon: "💰" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(120, 112, 96, 0.12)'
      }}
    >
      <div className="max-w-screen-xl mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || 
              (tab.href !== "/" && pathname?.startsWith(tab.href));
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="flex flex-col items-center justify-center flex-1 h-full py-2 transition-all"
                style={{ 
                  color: isActive ? '#2b2823' : '#787060'
                }}
              >
                <div 
                  className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all"
                  style={{ 
                    backgroundColor: isActive ? 'rgba(43, 40, 35, 0.08)' : 'transparent'
                  }}
                >
                  <span className="text-xl">{tab.icon}</span>
                  {isActive && (
                    <span 
                      className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#2b2823' }}
                    />
                  )}
                </div>
                <span 
                  className="text-[10px] font-semibold mt-0.5"
                  style={{ color: isActive ? '#2b2823' : '#787060' }}
                >
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
