"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isConfigured, signUp, joinCompanyByCode } from "@/lib/supabase";
import { setUser, syncProfile, loadFromDatabase } from "@/lib/store";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinMode, setJoinMode] = useState<"create" | "join">("create");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim()) return;

    // Non-Supabase fallback
    if (!isConfigured()) {
      setUser({ name: fullName.trim(), email: email.trim() });
      router.push("/dashboard");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (joinMode === "create" && !companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }

    if (joinMode === "join" && !inviteCode.trim()) {
      setError("Please enter the invite code from your team.");
      return;
    }

    setLoading(true);
    try {
      await signUp(
        email.trim(),
        password,
        fullName.trim(),
        joinMode === "create" ? companyName.trim() : "__pending__"
      );

      if (joinMode === "join") {
        await joinCompanyByCode(inviteCode.trim());
      }

      setSuccess(true);

      // Try to auto-login (works if email confirmation is disabled)
      try {
        await syncProfile();
        await loadFromDatabase();
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch {
        // Email confirmation required — user needs to check email
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
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

        <div className="card">
          {success ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-brand-900 mb-2">Account Created!</h2>
              <p className="text-sm text-brand-600">
                Check your email to confirm your account, then sign in.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="btn-primary mt-6"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-bold text-brand-900">Create your account</h1>
              <p className="mb-6 text-sm text-brand-600">
                Set up your team workspace to start designing.
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
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
                    <label className="label">Password</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                    />
                  </div>
                )}

                {/* Company options */}
                <div>
                  <label className="label">Team</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setJoinMode("create")}
                      className={joinMode === "create" ? "tab-active" : "tab"}
                    >
                      Create Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setJoinMode("join")}
                      className={joinMode === "join" ? "tab-active" : "tab"}
                    >
                      Join Existing
                    </button>
                  </div>

                  {joinMode === "create" ? (
                    <input
                      className="input"
                      placeholder="Your company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  ) : (
                    <input
                      className="input"
                      placeholder="Enter invite code from your team"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push("/login")}
                  className="text-sm text-amber-dark hover:underline"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
