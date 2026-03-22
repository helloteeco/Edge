import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f5f4f0]">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[#2b2823] mb-2">404</h1>
        <p className="text-lg text-[#787060] mb-6">
          This page doesn&apos;t exist or may have moved.
        </p>
        <div className="flex flex-col gap-3 items-center">
          <Link
            href="/"
            className="px-6 py-3 bg-[#2b2823] text-white rounded-xl font-medium hover:bg-[#1a1815] transition-colors"
          >
            Back to Map
          </Link>
          <div className="flex gap-4 mt-2">
            <Link href="/search" className="text-sm text-[#787060] hover:text-[#2b2823] transition-colors">
              Search Markets
            </Link>
            <Link href="/calculator" className="text-sm text-[#787060] hover:text-[#2b2823] transition-colors">
              Analyze a Deal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
