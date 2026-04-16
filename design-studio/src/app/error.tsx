"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="card max-w-md text-center">
        <div className="text-4xl mb-4">😵</div>
        <h2 className="text-xl font-bold text-brand-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-brand-600 mb-2">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-xs text-brand-600/40 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="btn-secondary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
