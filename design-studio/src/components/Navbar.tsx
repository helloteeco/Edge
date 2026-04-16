"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, getProfile, clearUser } from "@/lib/store";
import { isConfigured, signOut } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) setUserName(user.name);
    const profile = getProfile();
    if (profile) {
      setCompanyName(profile.companyName);
      setInviteCode(profile.inviteCode);
    }
  }, []);

  async function handleLogout() {
    if (isConfigured()) {
      await signOut();
    }
    clearUser();
    router.push("/");
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <nav className="border-b border-brand-900/10 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Left */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-900 text-xs font-bold text-white">
              D
            </div>
            <span className="text-sm font-bold tracking-tight text-brand-900">
              Design Studio
            </span>
          </button>

          <div className="hidden items-center gap-1 sm:flex">
            <NavLink href="/dashboard" active={pathname === "/dashboard"} label="Projects" />
            <NavLink href="/settings" active={pathname === "/settings"} label="Settings" />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Company + invite */}
          {companyName && (
            <div className="relative">
              <button
                onClick={() => setShowTeamMenu(!showTeamMenu)}
                className="flex items-center gap-1.5 rounded-md bg-brand-900/5 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-900/10 transition"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {companyName}
              </button>

              {showTeamMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTeamMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border border-brand-900/10 bg-white p-4 shadow-lg">
                    <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2">
                      Invite teammates
                    </div>
                    <p className="text-xs text-brand-600 mb-2">
                      Share this code so teammates can join your workspace:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-brand-900/5 px-2 py-1.5 text-sm font-mono font-bold text-brand-900">
                        {inviteCode}
                      </code>
                      <button
                        onClick={copyInvite}
                        className="rounded bg-amber/20 px-2 py-1.5 text-xs font-medium text-amber-dark hover:bg-amber/40 transition"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {userName && (
            <span className="text-xs text-brand-600 hidden sm:block">{userName}</span>
          )}

          <button
            onClick={handleLogout}
            className="text-xs text-brand-600/60 hover:text-brand-900 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-brand-900/5 text-brand-900" : "text-brand-600 hover:text-brand-900"
      }`}
    >
      {label}
    </button>
  );
}
