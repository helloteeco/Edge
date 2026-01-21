"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Map", href: "/", icon: "🗺️" },
  { name: "Search", href: "/search", icon: "🔍" },
  { name: "Analyzer", href: "/analyzer", icon: "📊" },
  { name: "Saved", href: "/saved", icon: "❤️" },
  { name: "Funding", href: "/funding", icon: "💰" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 safe-area-bottom">
      <div className="max-w-screen-xl mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || 
              (tab.href !== "/" && pathname?.startsWith(tab.href));
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
                  isActive 
                    ? "text-teal-600" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                  isActive ? "bg-teal-50" : ""
                }`}>
                  <span className="text-xl">{tab.icon}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 bg-teal-600 rounded-full"></span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold mt-0.5 ${
                  isActive ? "text-teal-600" : "text-slate-500"
                }`}>
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
