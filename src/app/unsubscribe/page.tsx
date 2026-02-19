"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [preferences, setPreferences] = useState<{
    newsletter_opted_in: boolean;
    frequency: string;
  } | null>(null);

  useEffect(() => {
    async function handleUnsubscribe() {
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        // First check current status
        const checkRes = await fetch(`/api/email-preferences?token=${token}`);
        if (!checkRes.ok) {
          setStatus("error");
          return;
        }
        const checkData = await checkRes.json();
        if (!checkData.preferences.newsletter_opted_in) {
          setStatus("already");
          setPreferences(checkData.preferences);
          return;
        }

        // Unsubscribe
        const res = await fetch("/api/email-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newsletter_opted_in: false }),
        });

        if (res.ok) {
          setStatus("success");
          setPreferences({ newsletter_opted_in: false, frequency: checkData.preferences.frequency });
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }

    handleUnsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#e5e3da" }}>
      <div className="max-w-md w-full text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
          <Image src="/teeco-icon-black.png" alt="Teeco" width={28} height={28} className="w-7 h-7" />
          <span className="text-lg font-bold" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
            Edge
          </span>
        </Link>

        {status === "loading" && (
          <div>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#2b2823", borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "#787060" }}>Processing your request...</p>
          </div>
        )}

        {status === "success" && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: "#ffffff", border: "1px solid #d8d6cd" }}>
            <div className="text-4xl mb-4">&#10003;</div>
            <h1 className="text-xl font-bold mb-2" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
              You&apos;ve Been Unsubscribed
            </h1>
            <p className="text-sm mb-6" style={{ color: "#787060" }}>
              You won&apos;t receive any more newsletter emails from Edge. You can always re-subscribe from your account settings.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
            >
              Back to Edge
            </Link>
          </div>
        )}

        {status === "already" && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: "#ffffff", border: "1px solid #d8d6cd" }}>
            <h1 className="text-xl font-bold mb-2" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
              Already Unsubscribed
            </h1>
            <p className="text-sm mb-6" style={{ color: "#787060" }}>
              You&apos;re already unsubscribed from Edge newsletters.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
            >
              Back to Edge
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: "#ffffff", border: "1px solid #d8d6cd" }}>
            <h1 className="text-xl font-bold mb-2" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
              Something Went Wrong
            </h1>
            <p className="text-sm mb-6" style={{ color: "#787060" }}>
              We couldn&apos;t process your unsubscribe request. Please try again or contact us at hello@teeco.co.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
            >
              Back to Edge
            </Link>
          </div>
        )}

        <p className="mt-6 text-xs" style={{ color: "#9a9488" }}>
          Edge by Teeco · 30 N. Gould St. Ste R, Sheridan WY 82801
        </p>
      </div>
    </div>
  );
}
