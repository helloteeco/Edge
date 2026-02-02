import Link from "next/link";
import { USMap } from "@/components/USMap";
import { TopMarkets } from "@/components/TopMarkets";
import AuthHeader from "@/components/AuthHeader";
import { cityData, getMarketCounts, DATA_LAST_UPDATED } from "@/data/helpers";
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
  ScaleIcon,
  ShoppingCartIcon,
  ExternalLinkIcon,
  SearchMarketIcon,
  CalculatorIcon,
  ContractIcon,
  SetupIcon,
  RocketIcon,
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
                {/* Auth Header - Sign In button */}
                <AuthHeader variant="dark" />
              </div>
              <p className="text-sm sm:text-base max-w-lg" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                Data-driven STR market analysis to find your next profitable investment opportunity
              </p>
            </div>
            
            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              {[
                { value: '50', label: 'States Analyzed' },
                { value: `${Math.floor(getMarketCounts().total / 1000)}K+`, label: 'Cities Covered' },
                { value: String(getMarketCounts().withFullData), label: 'Full STR Data' },
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

      {/* Journey Stepper - Your Path to STR Success */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-2">
        <div 
          className="rounded-2xl p-5 sm:p-6"
          style={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #d8d6cd',
            boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
          }}
        >
          <div className="text-center mb-5">
            <h2 
              className="text-lg sm:text-xl font-semibold mb-1"
              style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Your Path to STR Success
            </h2>
            <p className="text-sm" style={{ color: '#787060' }}>
              Edge guides you through every step of your STR journey
            </p>
          </div>
          
          {/* Journey Steps */}
          <div className="relative">
            {/* Connection Line - Hidden on mobile */}
            <div 
              className="hidden sm:block absolute top-6 left-[10%] right-[10%] h-0.5"
              style={{ backgroundColor: '#e5e3da' }}
            />
            
            {/* Steps Grid */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4">
              {[
                { 
                  step: 1, 
                  icon: SearchMarketIcon, 
                  title: 'Research', 
                  desc: 'Find your market',
                  active: true,
                  color: '#2b2823'
                },
                { 
                  step: 2, 
                  icon: CalculatorIcon, 
                  title: 'Analyze', 
                  desc: 'Run the numbers',
                  active: true,
                  color: '#2b2823'
                },
                { 
                  step: 3, 
                  icon: ContractIcon, 
                  title: 'Acquire', 
                  desc: 'Get financing',
                  active: true,
                  color: '#2b2823'
                },
                { 
                  step: 4, 
                  icon: SetupIcon, 
                  title: 'Setup', 
                  desc: 'Design & furnish',
                  active: true,
                  color: '#2b2823'
                },
                { 
                  step: 5, 
                  icon: RocketIcon, 
                  title: 'Scale', 
                  desc: 'Grow portfolio',
                  active: true,
                  color: '#2b2823'
                },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center relative z-10">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 transition-all"
                    style={{ 
                      backgroundColor: item.active ? '#2b2823' : '#e5e3da',
                      boxShadow: item.active ? '0 4px 12px -2px rgba(43, 40, 35, 0.3)' : 'none'
                    }}
                  >
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" color={item.active ? '#ffffff' : '#787060'} />
                  </div>
                  <span 
                    className="text-xs sm:text-sm font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.title}
                  </span>
                  <span 
                    className="text-[10px] sm:text-xs hidden sm:block"
                    style={{ color: '#9a958c' }}
                  >
                    {item.desc}
                  </span>
                  {i === 0 && (
                    <span 
                      className="absolute -top-1 -right-1 sm:top-0 sm:right-0 text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
                    >
                      START HERE
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* CTA to Full Training */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: '#e5e3da' }}>
            <Link 
              href="https://login.circle.so/sign_up?request_host=teeco.circle.so&user%5Binvitation_token%5D=24bf3e259d3f754c41c323f1eda7eb88a49991b0-87b646d2-7efe-4bec-a0b8-a03098b44aa2#email"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-medium transition-all hover:opacity-80"
              style={{ color: '#2b2823' }}
            >
              <GraduationIcon className="w-4 h-4" color="#2b2823" />
              <span>Want the full roadmap? <span className="underline">Watch our free training</span></span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Social Proof Section - Badges & Testimonials */}
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
        <div 
          className="rounded-2xl p-5 sm:p-6"
          style={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #d8d6cd',
            boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
          }}
        >
          {/* Trust Badges Row */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-6 pb-6" style={{ borderBottom: '1px solid #e5e3da' }}>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FF5A5F"/>
              </svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Airbnb Superhost</p>
                <p className="text-xs" style={{ color: '#787060' }}>5-Star Rating</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Top 10% of Homes</p>
                <p className="text-xs" style={{ color: '#787060' }}>Guest Favorite</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <span className="text-lg">🏅</span>
                <span className="text-xl font-bold ml-1" style={{ color: '#2b2823' }}>5.0</span>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Perfect Rating</p>
                <p className="text-xs" style={{ color: '#787060' }}>Across All Properties</p>
              </div>
            </div>
          </div>
          
          {/* Testimonials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Testimonial 1 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f8f6' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center text-sm font-semibold" style={{ color: '#2b2823' }}>BB</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Brad B.</p>
                  <p className="text-xs" style={{ color: '#787060' }}>STR Investor</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#4a4640' }}>
                &ldquo;We were blown away by their <span className="font-semibold" style={{ color: '#787060' }}>design, attention to budget, and efficiency</span>. We couldn&apos;t be happier, and our guests give us rave reviews!&rdquo;
              </p>
            </div>
            
            {/* Testimonial 2 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f8f6' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-sm font-semibold" style={{ color: '#2b2823' }}>LC</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Luke C.</p>
                  <p className="text-xs" style={{ color: '#787060' }}>Property Owner</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#4a4640' }}>
                &ldquo;Teeco is a <span className="font-semibold" style={{ color: '#787060' }}>top-notch company</span> that delivers outstanding results. Their expertise, dedication, and passion for design are truly unparalleled.&rdquo;
              </p>
            </div>
            
            {/* Testimonial 3 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f8f6' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center text-sm font-semibold" style={{ color: '#2b2823' }}>AN</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Astrid N.</p>
                  <p className="text-xs" style={{ color: '#787060' }}>First-Time Host</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#4a4640' }}>
                &ldquo;I cannot express enough how happy I am. No stress, just a <span className="font-semibold" style={{ color: '#787060' }}>beautifully furnished space</span> that went beyond what I had in mind.&rdquo;
              </p>
            </div>
          </div>
          
          {/* See Our Work CTA */}
          <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid #e5e3da' }}>
            <Link 
              href="https://teeco.co/before-after-photos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium transition-all hover:opacity-80"
              style={{ color: '#2b2823' }}
            >
              <PaletteIcon className="w-4 h-4" color="#2b2823" />
              <span>See our design transformations <span className="underline">Before & After Photos</span></span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
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
              
              {/* Featured Resources - Premium Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* STR Regulations Guide */}
                <Link 
                  href="https://www.proper.insure/regulations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5 transform translate-x-8 -translate-y-8">
                    <ScaleIcon className="w-full h-full" color="#ffffff" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <ScaleIcon className="w-6 h-6" color="#4ade80" />
                      </div>
                      <ExternalLinkIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" color="#ffffff" />
                    </div>
                    <h4 className="font-semibold text-base mb-1" style={{ color: '#ffffff' }}>STR Regulations by State</h4>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Stay compliant with local laws. Interactive guide covering permits, taxes, and restrictions in all 50 states.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>Updated Jan 2026</span>
                      <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>via Proper Insurance</span>
                    </div>
                  </div>
                </Link>
                
                {/* Teeco Common Buy List */}
                <Link 
                  href="https://www.amazon.com/shop/jeffchheuy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5 transform translate-x-8 -translate-y-8">
                    <ShoppingCartIcon className="w-full h-full" color="#ffffff" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                        <ShoppingCartIcon className="w-6 h-6" color="#fbbf24" />
                      </div>
                      <ExternalLinkIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" color="#ffffff" />
                    </div>
                    <h4 className="font-semibold text-base mb-1" style={{ color: '#ffffff' }}>Teeco Common Buy List</h4>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Our curated Amazon list of essentials for setting up your STR. Tested products we use in all our properties.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>Curated List</span>
                      <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Amazon Storefront</span>
                    </div>
                  </div>
                </Link>
              </div>
              
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
                    <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Learn how to buy your first high cash flow short-term rental</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5" color="rgba(255,255,255,0.7)" />
                </div>
              </Link>
              
              {/* Resource Links Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Link 
                  href="https://www.zillow.com/professionals/real-estate-agent-reviews/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <HomeEquityIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Find an Agent</p>
                </Link>
                
                <Link 
                  href="https://www.zillow.com/homeloans/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <DollarIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Get Financing</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/book-our-design-services"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <PaletteIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Design Services</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/book-our-design-services"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <SofaIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Property Setup</p>
                </Link>
                
                <Link 
                  href="https://teeco.co/packages"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <PartnershipIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Co-Hosting</p>
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
