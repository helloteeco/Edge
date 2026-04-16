"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUser } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setUser({ name: name.trim(), email: email.trim() });
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-4">
      <div className="w-full max-w-md animate-in">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber text-brand-900 font-bold text-xl">
            D
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Design Studio
          </span>
        </div>

        {/* Form */}
        <div className="card">
          <h1 className="mb-1 text-xl font-bold text-brand-900">
            Welcome back
          </h1>
          <p className="mb-6 text-sm text-brand-600">
            Sign in to access your design projects.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Sign In
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-brand-600/60">
            No account needed for the MVP — just enter your info to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
