'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { USMap } from "@/components/USMap";
import { TopMarkets } from "@/components/TopMarkets";
import { TrendingMarkets } from "@/components/TrendingMarkets";
import AuthHeader from "@/components/AuthHeader";
import { StuckHelper } from "@/components/StuckHelper";
import { cityData, getMarketCounts, DATA_LAST_UPDATED } from "@/data/helpers";
import { AIChatHero } from "@/components/AIChatHero";
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

// Social Share Section Component with IG dropdown and YouTube
function SocialShareSection() {
  const [showIgDropdown, setShowIgDropdown] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: 'Edge by Teeco',
      text: 'Check out Edge - the best tool for finding STR investment markets!',
      url: 'https://edge.teeco.co'
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="mt-4 pt-4 flex flex-wrap items-center justify-center gap-3" style={{ borderTop: '1px solid #e5e3da' }}>
      {/* Share Button */}
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:opacity-80 active:scale-95"
        style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
        </svg>
        <span className="text-sm font-medium">Share Edge</span>
      </button>

      {/* Instagram Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowIgDropdown(!showIgDropdown)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full transition-all hover:opacity-80 active:scale-95"
          style={{ backgroundColor: '#f5f4f0' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#E4405F">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </button>
        
        {/* Dropdown */}
        {showIgDropdown && (
          <div 
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 py-2 rounded-xl shadow-lg z-50"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e5e3da', minWidth: '160px' }}
          >
            <Link
              href="https://instagram.com/jeffchheuy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
              onClick={() => setShowIgDropdown(false)}
            >
              <span className="text-sm font-medium" style={{ color: '#2b2823' }}>@jeffchheuy</span>
            </Link>
            <Link
              href="https://instagram.com/teeco.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
              onClick={() => setShowIgDropdown(false)}
            >
              <span className="text-sm font-medium" style={{ color: '#2b2823' }}>@teeco.co</span>
            </Link>
          </div>
        )}
      </div>

      {/* YouTube Direct Link */}
      <Link
        href="https://youtube.com/@jeffchheuy"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-10 h-10 rounded-full transition-all hover:opacity-80 active:scale-95"
        style={{ backgroundColor: '#f5f4f0' }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      </Link>
    </div>
  );
}

export default function HomePage() {
  const [activeJourneyInfo, setActiveJourneyInfo] = useState<string | null>(null);

  // Force scroll to top on page load - disable browser scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);
  
  // Journey stage info content - accurate Edge features
  const journeyInfo: Record<string, { title: string; description: string; features: string[] }> = {
    'Research': {
      title: 'Research Markets',
      description: 'Find high cash flow STR markets with real investor data.',
      features: [
        'Interactive map tracking appreciation, migration, home prices & inventory',
        'STR Grade scoring to identify high cash flow markets',
        'Dynamic Top 10 Markets list that updates as we add more cities',
        'Search tab to explore specific markets in depth',
        'STR regulations guide & community buy list resources'
      ]
    },
    'Analyze': {
      title: 'Analyze Deals',
      description: 'Get thorough metrics and generate professional reports.',
      features: [
        'Deep deal analysis with accurate revenue estimates',
        'Generate reports to email investors or save for yourself',
        'AI Analysis to help interpret returns if you\'re new',
        'Save section to review old reports and add personal notes',
        '3 free analyses included, more available if needed'
      ]
    },
    'Acquire': {
      title: 'Acquire Property',
      description: 'Discover 48+ creative ways to fund your STR investment.',
      features: [
        'Funding tab with 48+ different financing strategies',
        'Quick quiz to identify your 5 most likely funding options',
        'Links to Zillow for finding agents and lenders',
        'Edge AI Assistant can answer funding questions',
        'Apply to our coaching program for personalized guidance'
      ]
    },
    'Setup': {
      title: 'Setup & Design',
      description: 'Professional in-house services to launch your STR.',
      features: [
        'In-house professional design services (20% discount for Teeco students)',
        'Property setup and furnishing services',
        'Co-hosting services to manage your listing',
        'Link to design & setup services in Edge Assistant'
      ]
    },
    'Scale': {
      title: 'Scale Your Portfolio',
      description: 'Grow with coaching, community, and ongoing education.',
      features: [
        'Coaching program application (for experienced STR investors)',
        'Use Funding tab to explore scaling options',
        'Community support through Circle group',
        'Edge AI Assistant can help with your specific roadblocks'
      ]
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Informational Banner - Subtle cream-dark */}
      <div style={{ backgroundColor: '#d8d6cd', borderBottom: '1px solid rgba(120, 112, 96, 0.15)' }}>
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-center gap-2">
            
            <p className="text-xs sm:text-sm" style={{ color: '#2b2823' }}>
              Most students successfully launch their first STR with just <span className="font-semibold">$65K</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Header - Compact hero with heading, badges, CTA, stats */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 50%, #2b2823 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
          {/* Top bar: Logo + Auth */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2.5">
              <Image src="/teeco-icon-black.png" alt="Teeco" width={32} height={32} className="w-8 h-8 invert" />
              <h2 
                className="text-lg sm:text-xl font-bold tracking-tight"
                style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Edge by Teeco
              </h2>
            </div>
            <AuthHeader variant="dark" />
          </div>

          {/* Hero Content - Compact */}
          <div className="max-w-2xl">
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-2"
              style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Find Your Next Cash-Flowing Airbnb
            </h1>
            <p className="text-xs sm:text-sm mb-3 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              AI-powered STR market research, deal analysis, and funding &mdash; backed by real data across every US state. Built by a real investor generating $1M+/yr.
            </p>

            {/* Badges + CTA inline */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                AI-Powered
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                AI Assistant
              </span>
              <Link 
                href="/calculator"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
              >
                Analyze Free
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Stats Row - Compact */}
          <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {[
              { value: '50', label: 'States' },
              { value: `${Math.floor(getMarketCounts().total / 1000)}K+`, label: 'Cities' },
              { value: String(getMarketCounts().withFullData), label: 'Markets' },
            ].map((stat, i) => (
              <div 
                key={i}
                className="rounded-lg px-3 py-2 min-w-[80px]"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
              >
                <div 
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {stat.value}
                </div>
                <div className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Chat Hero */}
      <AIChatHero />

      {/* How Edge Works - Compact Cards */}
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
        <div 
          className="rounded-2xl p-4 sm:p-5"
          style={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #d8d6cd',
            boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
          }}
        >
          <h2 
            className="text-base sm:text-lg font-semibold mb-3 text-center"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            How Edge Works
          </h2>
          
          <div className="flex flex-col gap-2.5">
            {/* Card 1: Explore Markets */}
            <a 
              href="#interactive-map" 
              className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50"
              style={{ border: '1px solid #e5e3da' }}
              onClick={(e) => { e.preventDefault(); document.getElementById('interactive-map')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2b2823' }}>
                <SearchMarketIcon className="w-4 h-4" color="#ffffff" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm" style={{ color: '#2b2823' }}>1. Explore Markets</h3>
                  <span className="text-xs font-medium flex items-center gap-0.5 flex-shrink-0" style={{ color: '#22c55e' }}>Map <ArrowRightIcon className="w-3 h-3" /></span>
                </div>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#787060' }}>
                  Browse the interactive US map to find high cash flow STR markets with grades, prices, and revenue data.
                </p>
              </div>
            </a>

            {/* Card 2: Analyze Properties */}
            <Link 
              href="/calculator" 
              className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50"
              style={{ border: '1px solid #e5e3da' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2b2823' }}>
                <CalculatorIcon className="w-4 h-4" color="#ffffff" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm" style={{ color: '#2b2823' }}>2. Analyze Properties</h3>
                  <span className="text-xs font-medium flex items-center gap-0.5 flex-shrink-0" style={{ color: '#22c55e' }}>Calculator <ArrowRightIcon className="w-3 h-3" /></span>
                </div>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#787060' }}>
                  Enter any US address for estimated revenue, cash-on-cash return, and a full AI-powered investment report.
                </p>
              </div>
            </Link>

            {/* Card 3: Find Funding */}
            <Link 
              href="/funding" 
              className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50"
              style={{ border: '1px solid #e5e3da' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2b2823' }}>
                <DollarIcon className="w-4 h-4" color="#ffffff" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm" style={{ color: '#2b2823' }}>3. Find Funding</h3>
                  <span className="text-xs font-medium flex items-center gap-0.5 flex-shrink-0" style={{ color: '#22c55e' }}>Funding <ArrowRightIcon className="w-3 h-3" /></span>
                </div>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#787060' }}>
                  Discover 48+ financing strategies, take a quick quiz, or ask the Edge AI Assistant for guidance.
                </p>
              </div>
            </Link>
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
                  <button
                    onClick={() => setActiveJourneyInfo(activeJourneyInfo === item.title ? null : item.title)}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ 
                      backgroundColor: activeJourneyInfo === item.title ? '#22c55e' : (item.active ? '#2b2823' : '#e5e3da'),
                      boxShadow: item.active ? '0 4px 12px -2px rgba(43, 40, 35, 0.3)' : 'none'
                    }}
                  >
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" color={item.active ? '#ffffff' : '#787060'} />
                  </button>
                  <span 
                    className="text-xs sm:text-sm font-semibold"
                    style={{ color: activeJourneyInfo === item.title ? '#22c55e' : item.color }}
                  >
                    {item.title}
                  </span>
                  <span 
                    className="text-[10px] sm:text-xs hidden sm:block"
                    style={{ color: '#9a958c' }}
                  >
                    {item.desc}
                  </span>
                  {i === 0 && !activeJourneyInfo && (
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
            
            {/* Info Popup */}
            {activeJourneyInfo && journeyInfo[activeJourneyInfo] && (
              <div 
                className="mt-4 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ 
                  backgroundColor: '#f8f7f4',
                  border: '1px solid #e5e3da'
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm sm:text-base mb-1" style={{ color: '#2b2823' }}>
                      {journeyInfo[activeJourneyInfo].title}
                    </h4>
                    <p className="text-xs sm:text-sm mb-3" style={{ color: '#787060' }}>
                      {journeyInfo[activeJourneyInfo].description}
                    </p>
                    <ul className="space-y-1.5">
                      {journeyInfo[activeJourneyInfo].features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm" style={{ color: '#2b2823' }}>
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => setActiveJourneyInfo(null)}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
                    style={{ backgroundColor: '#e5e3da' }}
                  >
                    <svg className="w-4 h-4" style={{ color: '#787060' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* CTA to Full Training */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: '#e5e3da' }}>
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

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Map Section */}
        <div 
          id="interactive-map"
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

        {/* Trending Markets - Most Liked by Investors */}
        <TrendingMarkets />

        {/* Social Proof Section - Badges & Testimonials */}
        <div 
          className="mt-8 rounded-2xl p-5 sm:p-6"
          style={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #d8d6cd',
            boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
          }}
        >
          {/* Section Header */}
          <h2 
            className="text-xl font-bold text-center mb-6"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Teeco Design Services
          </h2>
          
          {/* Trust Badges Row */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-6 pb-6" style={{ borderBottom: '1px solid #e5e3da' }}>
            {/* Airbnb Superhost Badge */}
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FF5A5F"/>
              </svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#FF5A5F' }}>Airbnb Superhost</p>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-3 h-3" viewBox="0 0 24 24" fill="#FFB400">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Top 10% Badge */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Top 10% of Homes</p>
                <p className="text-xs" style={{ color: '#787060' }}>Guest Favorite</p>
              </div>
            </div>
            
            {/* 5.0 Guest Favorite Badge */}
            <div className="flex items-center gap-1">
              <span className="text-lg">🌾</span>
              <span className="text-2xl font-bold" style={{ color: '#2b2823' }}>5.0</span>
              <span className="text-lg">🌾</span>
              <p className="text-xs ml-1" style={{ color: '#787060' }}>Guest<br/>Favorite</p>
            </div>
          </div>
          
          {/* Testimonials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Testimonial 1 - Brad B. */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f8f6' }}>
              <div className="flex items-center gap-3 mb-3">
                <Image 
                  src="/images/testimonial-brad.png" 
                  alt="Brad B."
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                  style={{ width: 40, height: 40 }}
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Brad B.</p>
                  <p className="text-xs" style={{ color: '#787060' }}>STR Investor</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#4a4640' }}>
                &ldquo;We were blown away by their <span className="font-semibold" style={{ color: '#787060' }}>design, attention to budget, and efficiency</span>. We couldn&apos;t be happier, and our guests give us rave reviews!&rdquo;
              </p>
            </div>
            
            {/* Testimonial 2 - Luke C. */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f8f6' }}>
              <div className="flex items-center gap-3 mb-3">
                <Image 
                  src="/images/testimonial-luke.png" 
                  alt="Luke C."
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                  style={{ width: 40, height: 40 }}
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Luke C.</p>
                  <p className="text-xs" style={{ color: '#787060' }}>Property Owner</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#4a4640' }}>
                &ldquo;Teeco is a <span className="font-semibold" style={{ color: '#787060' }}>top-notch company</span> that delivers outstanding results. Their expertise, dedication, and passion for design are truly unparalleled.&rdquo;
              </p>
            </div>
            
            {/* Testimonial 3 - Astrid N. */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9f8f6' }}>
              <div className="flex items-center gap-3 mb-3">
                <Image 
                  src="/images/testimonial-astrid.png" 
                  alt="Astrid N."
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                  style={{ width: 40, height: 40 }}
                />
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
              <span>See our design transformations <span className="underline">Before &amp; After Photos</span></span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          
          {/* Share & Social Section */}
          <SocialShareSection />
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
              <div className="grid grid-cols-2 gap-3">
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
                  href="/funding"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <DollarIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Get Financing</p>
                </Link>
                
                <Link 
                  href="https://app.usemotion.com/meet/stephanie-tran-6vk2/aa-coaching-interview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <PaletteIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Design & Setup</p>
                </Link>
                
                <Link 
                  href="https://app.usemotion.com/meet/stephanie-tran-6vk2/aa-coaching-interview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <BookOpenIcon className="w-5 h-5" color="#ffffff" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>Coaching</p>
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

        {/* Stuck Helper */}
        <StuckHelper tabName="map" />
      </div>
    </div>
  );
}
