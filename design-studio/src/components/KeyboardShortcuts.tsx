"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Global keyboard shortcuts for power users.
 * Press ? to see all shortcuts.
 */
export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // ? — Show shortcuts help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Escape — Close modals/help
      if (e.key === "Escape") {
        setShowHelp(false);
        return;
      }

      // G then D — Go to Dashboard
      if (e.key === "d" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (pathname !== "/dashboard") {
          router.push("/dashboard");
        }
        return;
      }

      // G then N — New Project
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        router.push("/projects/new");
        return;
      }

      // G then S — Settings
      if (e.key === "s" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (pathname !== "/settings") {
          router.push("/settings");
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-900">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setShowHelp(false)}
            className="text-brand-600 hover:text-brand-900 text-sm"
          >
            Close (Esc)
          </button>
        </div>

        <div className="space-y-3">
          <ShortcutRow keys="?" label="Show/hide this help" />
          <ShortcutRow keys="D" label="Go to Dashboard" />
          <ShortcutRow keys="N" label="New Project" />
          <ShortcutRow keys="S" label="Settings" />
          <ShortcutRow keys="Esc" label="Close modals" />
        </div>

        <div className="mt-4 pt-3 border-t border-brand-900/5">
          <p className="text-[10px] text-brand-600/60">
            Shortcuts are disabled when typing in inputs.
          </p>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-brand-700">{label}</span>
      <kbd className="rounded bg-brand-900/5 px-2 py-0.5 text-xs font-mono font-semibold text-brand-900">
        {keys}
      </kbd>
    </div>
  );
}
