"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isConfigured, signIn } from "@/lib/supabase";
import { setUser, syncProfile, loadFromDatabase } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) return;

    // If Supabase is not configured, use simple localStorage login
    if (!isConfigured()) {
      setUser({ name: email.split("@")[0], email: email.trim() });
      router.push("/dashboard");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      await syncProfile();
      await loadFromDatabase();
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
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
          <h1 className="mb-1 text-xl font-bold text-brand-900">Welcome back</h1>
          <p className="mb-6 text-sm text-brand-600">
            Sign in to access your design projects.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
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

            {isConfigured() && (
              <div>
                <label htmlFor="password" className="label">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/signup")}
              className="text-sm text-amber-dark hover:underline"
            >
              Don&apos;t have an account? Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
