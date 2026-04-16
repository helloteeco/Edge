"use client";

import { useRouter, usePathname } from "next/navigation";
import { getUser, clearUser } from "@/lib/store";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = getUser();
    if (user) setUserName(user.name);
  }, []);

  function handleLogout() {
    clearUser();
    router.push("/");
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
            <NavLink
              href="/dashboard"
              active={pathname === "/dashboard"}
              label="Projects"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {userName && (
            <span className="text-xs text-brand-600">{userName}</span>
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

function NavLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand-900/5 text-brand-900"
          : "text-brand-600 hover:text-brand-900"
      }`}
    >
      {label}
    </button>
  );
}
