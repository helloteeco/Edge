import Link from "next/link";
import { USMap } from "@/components/USMap";
import { TopMarkets } from "@/components/TopMarkets";
import {
  GraduationIcon,
  HomeEquityIcon,
  DollarIcon,
  PaletteIcon,
  SofaIcon,
  PartnershipIcon,
  BookOpenIcon,
  MapPinIcon,
  ArrowRightIcon,
  ChevronRightIcon,
} from "@/components/Icons";

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
          style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)', boxShadow: '0 8px 32px -8px rgba(43, 40, 35, 0.4)' }}
        >
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                  <BookOpenIcon className="w-5 h-5" color="#ffffff" />
                </div>
                <h3 
                  className="text-xl sm:text-2xl font-semibold"
                  style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  Resources
                </h3>
              </div>
              <p className="text-sm mb-5" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                Everything you need to start and scale your STR business
              </p>
              
              {/* Free Training CTA */}
              <Link 
                href="https://login.circle.so/sign_up?request_host=teeco.circle.so&user%5Binvitation_token%5D=24bf3e259d3f754c41c323f1eda7eb88a49991b0-87b646d2-7efe-4bec-a0b8-a03098b44aa2#email"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl p-4 mb-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                    <GraduationIcon className="w-6 h-6" color="#ffffff" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-base" style={{ color: '#ffffff' }}>Watch Teeco&apos;s Free Training</p>
                    <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Learn how to buy your first high cash flow rural Airbnb</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5" color="rgba(255,255,255,0.7)" />
                </div>
              </Link>
              
              {/* Resource Links Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Link 
                  href="https://teeco.co/airbnb-agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <HomeEquityIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Agent</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/airbnb-lender"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <DollarIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Lender</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/airbnb-designer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <PaletteIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Designer</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/airbnb-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <SofaIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Set Up Team</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/airbnb-cohost"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <PartnershipIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Airbnb Cohost</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/fund-your-financial-freedom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <BookOpenIcon className="w-5 h-5" color="#ffffff" />
                  </div>
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
                style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}
              >
                <MapPinIcon className="w-6 h-6" color="#16a34a" />
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                backgroundColor: '#2b2823', 
                color: '#ffffff'
              }}
            >
              Try Address Calculator
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
