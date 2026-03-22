"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f5f4f0]">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4" role="img" aria-label="Warning">&#x26A0;</div>
        <h1 className="text-2xl font-bold text-[#2b2823] mb-2">Something went wrong</h1>
        <p className="text-[#787060] mb-6">
          {error.message?.includes("fetch")
            ? "We had trouble loading data. This is usually temporary."
            : "An unexpected error occurred. Our team has been notified."}
        </p>
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-[#2b2823] text-white rounded-xl font-medium hover:bg-[#1a1815] transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="text-sm text-[#787060] hover:text-[#2b2823] transition-colors"
          >
            Back to home
          </a>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-[#9a9488]">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
