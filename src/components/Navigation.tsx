"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Map", href: "/", icon: "🗺️" },
  { name: "Search", href: "/search", icon: "🔍" },
  { name: "Analyzer", href: "/analyzer", icon: "📊" },
  { name: "Saved", href: "/saved", icon: "❤️" },
  { name: "Funding", href: "/funding", icon: "📄" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || 
              (tab.href !== "/" && pathname?.startsWith(tab.href));
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span className="text-xl mb-1">{tab.icon}</span>
                <span className="text-xs font-medium">{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
