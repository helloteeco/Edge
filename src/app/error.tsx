"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold text-foreground mb-4">500</h1>
      <p className="text-muted mb-8">Something went wrong!</p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
