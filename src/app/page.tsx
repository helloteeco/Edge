import Link from "next/link";
import { USMap } from "@/components/USMap";
import { TopMarkets } from "@/components/TopMarkets";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Informational Banner */}
      <div className="bg-cream-dark border-b border-mocha/20">
        <div className="max-w-5xl mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-gray-brand">
            <span className="text-sm">💡</span>
            <p className="text-xs sm:text-sm">
              Most successful students start with around <span className="font-semibold">$65K</span> for the smoothest journey to their first STR.
            </p>
          </div>
        </div>
      </div>

      {/* Compact Hero Header - Matching the reference design */}
      <div className="bg-gradient-to-r from-[#3d6b6b] via-[#4a7a7a] to-[#3d6b6b] text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Logo and Description */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-base">🏠</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edge by Teeco</h1>
              </div>
              <p className="text-white/80 text-sm max-w-md">
                Data-driven STR market analysis to find your next profitable investment opportunity
              </p>
            </div>
            
            {/* Right: Quick Stats - Horizontal on larger screens */}
            <div className="flex gap-2 sm:gap-3">
              <div className="bg-white/15 backdrop-blur rounded-lg px-4 py-2 min-w-[90px]">
                <div className="text-xl sm:text-2xl font-bold">50</div>
                <div className="text-white/70 text-xs">States Analyzed</div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg px-4 py-2 min-w-[90px]">
                <div className="text-xl sm:text-2xl font-bold">100+</div>
                <div className="text-white/70 text-xs">Markets Tracked</div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg px-4 py-2 min-w-[90px]">
                <div className="text-xl sm:text-2xl font-bold">Live</div>
                <div className="text-white/70 text-xs">Market Data</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Map Section */}
        <div className="bg-white rounded-2xl shadow-card border border-mocha/10 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-brand">Interactive Market Map</h2>
              <p className="text-mocha text-sm">Click any state to explore STR opportunities</p>
            </div>
          </div>
          <USMap />
        </div>

        {/* Top Markets Section */}
        <div className="bg-white rounded-2xl shadow-card border border-mocha/10 p-4 sm:p-6">
          <TopMarkets />
        </div>
        
        {/* CTA Section - Updated to Teeco brand colors */}
        <div className="mt-6 bg-gradient-to-r from-[#3d6b6b] to-[#4a7a7a] rounded-2xl p-6 text-white">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Ready to Start Investing?</h3>
              <p className="text-white/80 text-sm mb-3">Get personalized guidance from our STR mentorship program</p>
              
              {/* Expanded Mentorship Details */}
              <div className="bg-white/15 backdrop-blur rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⏱️</span>
                  <span className="font-semibold">Only ~3 hours/week to manage once set up</span>
                </div>
                <ul className="text-white/80 text-sm space-y-1.5 ml-7">
                  <li>• <strong>Full guided experience:</strong> 9 total calls</li>
                  <li>• <strong>Complete journey:</strong> Deal → Setup & Design → Live STR</li>
                  <li>• <strong>Remote setup:</strong> We can set up your Airbnb while you keep your job</li>
                  <li>• <strong>Flexible options:</strong> Programs tailored to your available time</li>
                </ul>
              </div>
            </div>
            <Link 
              href="https://teeco.co/fund-your-financial-freedom"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-cream text-gray-brand font-semibold rounded-xl transition-colors shadow-sm text-center"
            >
              Learn More About Mentorship
            </Link>
          </div>
        </div>

        {/* Address Calculator CTA */}
        <div className="mt-6 bg-white rounded-2xl shadow-card border border-mocha/10 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#3d6b6b]/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-brand">Have an Address in Mind?</h3>
                <p className="text-mocha text-sm">Get instant STR analysis for any US property</p>
              </div>
            </div>
            <Link 
              href="/calculator"
              className="w-full sm:w-auto px-6 py-3 bg-[#3d6b6b] hover:bg-[#4a7a7a] text-white font-medium rounded-xl transition-colors text-center"
            >
              Try Address Calculator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
