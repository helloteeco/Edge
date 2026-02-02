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
                <img src="/teeco-icon-black.png" alt="Teeco" className="w-10 h-10 invert" />
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
        
        {/* Resources Section */}
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
                Resources
              </h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                Everything you need to start and scale your STR business
              </p>
              
              {/* Free Training CTA */}
              <Link 
                href="https://login.circle.so/sign_up?request_host=teeco.circle.so&user%5Binvitation_token%5D=24bf3e259d3f754c41c323f1eda7eb88a49991b0-87b646d2-7efe-4bec-a0b8-a03098b44aa2#email"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl p-4 mb-4 transition-all hover:opacity-90"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: '#ffffff' }}>Watch Teeco&apos;s Free Training</p>
                    <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Learn how to buy your first high cash flow rural Airbnb</p>
                  </div>
                  <svg className="w-5 h-5" fill="none" stroke="rgba(255,255,255,0.7)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              
              {/* Resource Links Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Link 
                  href="https://teeco.co/airbnb-agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Agent</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/airbnb-lender"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Lender</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/airbnb-designer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Designer</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/airbnb-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Set Up Team</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/airbnb-cohost"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Cohost</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/fund-your-financial-freedom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Mentorship</p>
                </Link>
              </div>
            </div>
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
