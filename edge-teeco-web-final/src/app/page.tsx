import { USMap } from "@/components/USMap";
import { TopMarkets } from "@/components/TopMarkets";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edge by Teeco</h1>
        <p className="text-muted text-sm">Find your next STR investment opportunity</p>
      </div>

      {/* Map */}
      <USMap />

      {/* Top Markets */}
      <div className="mt-8">
        <TopMarkets />
      </div>
    </div>
  );
}
