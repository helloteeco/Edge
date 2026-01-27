import { USMap } from "@/components/USMap";
import { TopMarkets } from "@/components/TopMarkets";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">🏠</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edge by Teeco</h1>
          </div>
          <p className="text-teal-100 text-base sm:text-lg max-w-xl">
            Data-driven STR market analysis to find your next profitable investment opportunity
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold">50</div>
              <div className="text-teal-200 text-xs sm:text-sm">States Analyzed</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold">100+</div>
              <div className="text-teal-200 text-xs sm:text-sm">Markets Tracked</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold">Live</div>
              <div className="text-teal-200 text-xs sm:text-sm">Market Data</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Map Section */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Interactive Market Map</h2>
              <p className="text-slate-500 text-sm">Click any state to explore STR opportunities</p>
            </div>
          </div>
          <USMap />
        </div>

        {/* Top Markets Section */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-4 sm:p-6">
          <TopMarkets />
        </div>
        
        {/* CTA Section */}
        <div className="mt-6 bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Ready to Start Investing?</h3>
              <p className="text-teal-100 text-sm">Get personalized guidance from our STR mentorship program</p>
            </div>
            <button className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-100 text-teal-700 font-medium rounded-xl transition-colors shadow-sm">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
