"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Auth Callback Page
 * 
 * Handles magic link token verification and redirects users back to
 * the page they were on when they clicked "Sign In".
 * 
 * Flow:
 * 1. User clicks sign in on any page (e.g., /search, /city/austin-tx, /saved)
 * 2. AuthModal stores current path in localStorage as edge_auth_return_path
 * 3. Magic link email points to /auth/callback?token=xxx&returnTo=/search
 * 4. This page verifies the token, stores auth, and redirects to returnTo
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const returnTo = urlParams.get("returnTo");

    // Clean up URL immediately
    window.history.replaceState({}, document.title, "/auth/callback");

    if (!token) {
      setStatus("error");
      setErrorMessage("No authentication token found. Please request a new sign-in link.");
      return;
    }

    verifyToken(token, returnTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyToken(token: string, returnTo: string | null) {
    try {
      const response = await fetch("/api/auth/verify-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        // Store auth in localStorage (30-day session)
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        const sessionToken = data.sessionToken || token;

        localStorage.setItem("edge_auth_token", sessionToken);
        localStorage.setItem("edge_auth_expiry", expiryTime.toString());
        localStorage.setItem("edge_auth_email", data.email);
        localStorage.setItem("edge_auth_sync", Date.now().toString());

        // Bulk-sync local searches to Supabase on sign-in
        try {
          const localSearches = JSON.parse(localStorage.getItem("edge_recent_searches") || "[]");
          if (localSearches.length > 0) {
            fetch("/api/recent-searches", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: data.email, searches: localSearches }),
            }).catch(() => {});
          }
        } catch { /* silent */ }

        setStatus("success");

        // Determine redirect destination
        // Priority: URL param > localStorage > /calculator (default)
        const storedReturnPath = localStorage.getItem("edge_auth_return_path");
        const redirectPath = returnTo || storedReturnPath || "/calculator";
        
        // Clean up stored return path
        localStorage.removeItem("edge_auth_return_path");

        // Check if there's a pending analysis on the calculator page
        const pendingAddress = localStorage.getItem("edge_pending_address");
        const finalRedirect = pendingAddress ? "/calculator" : redirectPath;

        // Short delay so user sees the success state
        setTimeout(() => {
          router.push(finalRedirect);
        }, 800);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Invalid or expired link. Please request a new one.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to verify. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#faf9f7" }}>
      <div className="text-center px-6 max-w-sm">
        {status === "verifying" && (
          <>
            <div className="w-14 h-14 border-4 rounded-full animate-spin mx-auto mb-5"
              style={{ borderColor: "#e5e3da", borderTopColor: "#2b2823" }}
            />
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#2b2823" }}>
              Signing you in...
            </h1>
            <p className="text-sm" style={{ color: "#787060" }}>
              Verifying your magic link.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ backgroundColor: "#f0fdf4" }}
            >
              <svg className="w-7 h-7" fill="none" stroke="#22c55e" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#2b2823" }}>
              You&apos;re signed in!
            </h1>
            <p className="text-sm" style={{ color: "#787060" }}>
              Redirecting you back...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ backgroundColor: "#fef2f2" }}
            >
              <svg className="w-7 h-7" fill="none" stroke="#ef4444" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#2b2823" }}>
              Sign in failed
            </h1>
            <p className="text-sm mb-6" style={{ color: "#787060" }}>
              {errorMessage}
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
            >
              Go to Home
            </a>
          </>
        )}
      </div>
    </div>
  );
}
