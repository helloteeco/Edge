export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-white font-bold animate-pulse">
          D
        </div>
        <div className="text-sm text-brand-600">Loading...</div>
      </div>
    </div>
  );
}
