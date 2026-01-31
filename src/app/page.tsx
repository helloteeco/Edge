import Link from "next/link";
import { USMap } from "@/components/USMap";
import { TopMarkets } from "@/components/TopMarkets";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Informational Banner - Subtle cream-dark */}
      <div style={{ backgroundColor: '#d8d6cd', borderBottom: '1px solid rgba(120, 112, 96, 0.15)' }}>
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm opacity-70">💡</span>
            <p className="text-xs sm:text-sm" style={{ color: '#2b2823' }}>
              Most successful students start with around <span className="font-semibold">$65K</span> for the smoothest journey to their first STR.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Header - Clean Gray/Black gradient */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 50%, #2b2823 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            {/* Left: Logo and Description */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                >
                  <span className="text-xl">🏠</span>
                </div>
                <h1 
                  className="text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  Edge by Teeco
                </h1>
              </div>
              <p className="text-sm sm:text-base max-w-lg" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                Data-driven STR market analysis to find your next profitable investment opportunity
              </p>
            </div>
            
            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              {[
                { value: '50', label: 'States Analyzed' },
                { value: '268', label: 'Markets Tracked' },
                { value: 'Live', label: 'Market Data' },
              ].map((stat, i) => (
                <div 
                  key={i}
                  className="rounded-xl px-4 py-3 min-w-[95px]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
                >
                  <div 
                    className="text-xl sm:text-2xl font-bold"
                    style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Map Section */}
        <div 
          className="rounded-2xl p-5 sm:p-7 mb-8"
          style={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #d8d6cd',
            boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 
                className="text-xl sm:text-2xl font-semibold mb-1"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Interactive Market Map
              </h2>
              <p className="text-sm" style={{ color: '#787060' }}>
                Click any state to explore STR opportunities
              </p>
            </div>
          </div>
          <USMap />
        </div>

        {/* Top Markets Section */}
        <div 
          className="rounded-2xl p-5 sm:p-7"
          style={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #d8d6cd',
            boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
          }}
        >
          <TopMarkets />
        </div>
        
        {/* CTA Section - Gray/Black theme */}
        <div 
          className="mt-8 rounded-2xl p-6 sm:p-8"
          style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}
        >
          <div className="flex flex-col gap-5">
            <div>
              <h3 
                className="text-xl sm:text-2xl font-semibold mb-2"
                style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Ready to Start Investing?
              </h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                Get personalized guidance from our STR mentorship program
              </p>
              
              {/* Mentorship Details */}
              <div 
                className="rounded-xl p-5 mb-5"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⏱️</span>
                  <span className="font-semibold" style={{ color: '#ffffff' }}>
                    Only ~3 hours/week to manage once set up
                  </span>
                </div>
                <ul className="text-sm space-y-2 ml-7" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  <li>• <strong style={{ color: '#ffffff' }}>Full guided experience:</strong> 9 total calls</li>
                  <li>• <strong style={{ color: '#ffffff' }}>Complete journey:</strong> Deal → Setup & Design → Live STR</li>
                  <li>• <strong style={{ color: '#ffffff' }}>Remote setup:</strong> We can set up your Airbnb while you keep your job</li>
                  <li>• <strong style={{ color: '#ffffff' }}>Flexible options:</strong> Programs tailored to your available time</li>
                </ul>
              </div>
            </div>
            <Link 
              href="https://teeco.co/fund-your-financial-freedom"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 font-semibold rounded-xl transition-all duration-200 text-center hover:opacity-90"
              style={{ 
                backgroundColor: '#ffffff', 
                color: '#2b2823',
                boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.15)'
              }}
            >
              Learn More About Mentorship
            </Link>
          </div>
        </div>

        {/* Address Calculator CTA */}
        <div 
          className="mt-8 rounded-2xl p-6"
          style={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #d8d6cd',
            boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
          }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(43, 40, 35, 0.06)' }}
              >
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <h3 
                  className="text-lg font-semibold mb-0.5"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  Have an Address in Mind?
                </h3>
                <p className="text-sm" style={{ color: '#787060' }}>
                  Get instant STR analysis for any US property
                </p>
              </div>
            </div>
            <Link 
              href="/calculator"
              className="w-full sm:w-auto px-6 py-3 font-medium rounded-xl transition-all duration-200 text-center hover:opacity-90"
              style={{ 
                backgroundColor: '#2b2823', 
                color: '#ffffff'
              }}
            >
              Try Address Calculator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
