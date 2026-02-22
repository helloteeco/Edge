"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCityById, getCitiesByState, getStateByCode } from "@/data/helpers";
import AuthHeader from "@/components/AuthHeader";
import { DoubleTapSave, FloatingActionPill } from "@/components/DoubleTapSave";
import RegulationCard from "@/components/RegulationCard";

export default function CityPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState<number | null>(null);

  const city = getCityById(id);


  useEffect(() => {
    const loadLikeStatus = async () => {
      const { getAuthEmail, getSavedCities } = await import('@/lib/account-storage');
      const email = getAuthEmail();
      
      // Legacy local save check
      const saved = getSavedCities();
      setIsSaved(saved.includes(city?.id || ''));
      
      // Fetch save count + user-specific like status from API
      if (city?.id) {
        const params = new URLSearchParams({ marketId: city.id, marketType: 'city' });
        if (email) params.set('email', email);
        
        fetch(`/api/market-saves?${params}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setSaveCount(data.count);
              if (email && data.liked !== undefined) {
                setIsSaved(data.liked);
              }
            }
          })
          .catch(console.error);
      }
    };
    loadLikeStatus();
    
    // Update document title for tab display (OG meta tags are now handled server-side in layout.tsx)
    if (city) {
      document.title = `${city.name}, ${city.stateCode} - STR Grade ${city.grade} | Edge`;
    }
  }, [city?.id, city]);

  const toggleSave = async () => {
    const { getSavedCities, setSavedCities, getAuthEmail } = await import('@/lib/account-storage');
    const email = getAuthEmail();
    if (!email) {
      // Prompt sign-in
      alert('Sign in to like markets and track your favorites!');
      return;
    }
    
    // Optimistic UI update
    const wasSaved = isSaved;
    setIsSaved(!isSaved);
    setSaveCount(prev => (prev ?? 0) + (wasSaved ? -1 : 1));
    
    // Also update local storage for backward compatibility
    const saved = getSavedCities(email);
    let updated;
    if (wasSaved) {
      updated = saved.filter((cid: string) => cid !== city?.id);
    } else {
      updated = [...saved, city?.id].filter((x): x is string => x !== undefined);
    }
    setSavedCities(updated, email);
    // Sync saved cities to cloud
    fetch('/api/user-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, savedCities: updated }),
    }).catch(() => {});
    
    // Toggle like on server (user-specific)
    try {
      const res = await fetch('/api/market-saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: city?.id,
          marketType: 'city',
          action: 'toggle',
          email,
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveCount(data.count);
        setIsSaved(data.liked);
      } else if (data.error?.includes('limit')) {
        // Revert optimistic update
        setIsSaved(wasSaved);
        setSaveCount(prev => (prev ?? 0) + (wasSaved ? 1 : -1));
        alert(data.error);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on network error
      setIsSaved(wasSaved);
      setSaveCount(prev => (prev ?? 0) + (wasSaved ? 1 : -1));
    }
  };

  const handleShare = async () => {
    // Share the URL - server-side layout.tsx provides OG meta tags for preview cards
    const shareUrl = window.location.href;
    if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `${city?.name}, ${city?.stateCode} STR Market`,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e3da' }}>
        <div className="text-center p-8">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#ffffff' }}
          >
            <span className="text-3xl">🏙️</span>
          </div>
          <h1 
            className="text-xl font-bold mb-2"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            City not found
          </h1>
          <Link href="/" className="font-medium transition-opacity hover:opacity-70" style={{ color: '#2b2823' }}>
            ← Back to Map
          </Link>
        </div>
      </div>
    );
  }

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A+': return { backgroundColor: '#000000', color: '#ffffff' };
      case 'A': return { backgroundColor: '#2b2823', color: '#ffffff' };
      case 'B+': return { backgroundColor: '#3d3a34', color: '#ffffff' };
      case 'B': return { backgroundColor: '#787060', color: '#ffffff' };
      case 'C': return { backgroundColor: '#d8d6cd', color: '#2b2823' };
      case 'D': return { backgroundColor: '#e5e3da', color: '#787060' };
      default: return { backgroundColor: '#e5e3da', color: '#787060' };
    }
  };

  const getVerdictText = (verdict: string) => {
    switch (verdict) {
      case 'strong-buy': return { text: 'STRONG BUY', emoji: '🚀' };
      case 'buy': return { text: 'BUY', emoji: '✅' };
      case 'hold': return { text: 'HOLD', emoji: '⚠️' };
      case 'caution': return { text: 'CAUTION', emoji: '⚠️' };
      default: return { text: 'AVOID', emoji: '❌' };
    }
  };

  const verdictInfo = getVerdictText(city.verdict);

  // Find best bedroom size
  const incomeBySize = city.incomeBySize || { "1BR": 2000, "2BR": 2800, "3BR": 3500, "4BR": 4200, "5BR": 4800, "6BR+": 5500 };
  const bestSize = Object.entries(incomeBySize).reduce((a, b) => a[1] > b[1] ? a : b);

  // Top amenity
  const amenities = city.amenityDelta || [
    { name: "Hot Tub", boost: 22, priority: "MUST HAVE" },
    { name: "Pool", boost: 18, priority: "HIGH IMPACT" },
    { name: "Game Room", boost: 15, priority: "HIGH IMPACT" },
    { name: "Fire Pit", boost: 12, priority: "NICE TO HAVE" },
    { name: "EV Charger", boost: 8, priority: "NICE TO HAVE" },
  ];

  // Market type display info
  const marketTypeLabels: Record<string, { label: string; emoji: string }> = {
    mountain: { label: 'Mountain Market', emoji: '🏔️' },
    beach: { label: 'Beach Market', emoji: '🏖️' },
    urban: { label: 'Urban Market', emoji: '🏙️' },
    lake: { label: 'Lake Market', emoji: '🌊' },
    desert: { label: 'Desert Market', emoji: '🏜️' },
    rural: { label: 'Rural Market', emoji: '🌾' },
    suburban: { label: 'Suburban Market', emoji: '🏘️' },
    waterfront: { label: 'Waterfront Market', emoji: '⚓' },
    tropical: { label: 'Tropical Market', emoji: '🌴' },
  };
  const marketLabel = marketTypeLabels[city.marketType] || { label: 'Market', emoji: '📍' };

  // Generate "Why [City]?" descriptions based on market type and data
  const getWhyCityReasons = () => {
    const reasons: Array<{ emoji: string; title: string; description: string }> = [];
    
    // Market type specific reason
    const typeReasons: Record<string, { emoji: string; title: string; desc: string }> = {
      mountain: { emoji: '🏔️', title: 'Mountain Getaway', desc: 'Ski season and summer hiking create year-round demand for mountain retreats and cabin stays.' },
      beach: { emoji: '🏖️', title: 'Coastal Destination', desc: 'Beach proximity drives premium nightly rates and strong seasonal demand from vacationers.' },
      urban: { emoji: '🏙️', title: 'Urban Hub', desc: 'Business travel, events, and tourism create consistent year-round occupancy in city centers.' },
      lake: { emoji: '🌊', title: 'Lakefront Appeal', desc: 'Waterfront properties command premium rates with strong summer demand and growing shoulder seasons.' },
      desert: { emoji: '🏜️', title: 'Desert Retreat', desc: 'Unique landscapes and winter warmth attract snowbirds and adventure seekers during peak season.' },
      rural: { emoji: '🌾', title: 'Rural & Country Market', desc: 'Privacy seekers and remote workers fuel growing demand for secluded, nature-adjacent stays.' },
      suburban: { emoji: '🏘️', title: 'Suburban Stay', desc: 'Family-friendly neighborhoods near attractions offer spacious stays at accessible price points.' },
      waterfront: { emoji: '⚓', title: 'Waterfront Living', desc: 'Direct water access and scenic views drive premium pricing and high guest satisfaction scores.' },
      tropical: { emoji: '🌴', title: 'Tropical Paradise', desc: 'Year-round warm weather and resort-style amenities attract vacationers seeking island experiences.' },
    };
    const typeReason = typeReasons[city.marketType];
    if (typeReason) reasons.push({ emoji: typeReason.emoji, title: typeReason.title, description: typeReason.desc });
    
    // Growth/saturation reason
    if (city.listingsPerThousand < 5) {
      reasons.push({ emoji: '📈', title: 'Growing Market', description: 'Population and economic growth signal increasing demand and property appreciation potential.' });
    } else if (city.listingsPerThousand < 10) {
      reasons.push({ emoji: '⚖️', title: 'Balanced Supply', description: 'Healthy supply-demand ratio means room for new listings without oversaturation concerns.' });
    } else {
      reasons.push({ emoji: '🔥', title: 'High Demand Zone', description: 'Strong traveler demand supports a competitive market with proven revenue potential.' });
    }
    
    // Highlight-based reasons
    const highlights = city.highlights || [];
    for (const h of highlights.slice(0, 2)) {
      const hl = h.toLowerCase();
      if (hl.includes('rural escape') || hl.includes('nature')) {
        reasons.push({ emoji: '📍', title: 'Rural escape', description: 'Rural escape contributes to visitor demand and supports short-term rental revenue.' });
      } else if (hl.includes('tech') || hl.includes('corporate')) {
        reasons.push({ emoji: '💼', title: 'Business Travel', description: 'Corporate relocations and business travel create consistent midweek bookings.' });
      } else if (hl.includes('tourism') || hl.includes('tourist')) {
        reasons.push({ emoji: '🎯', title: 'Tourism Draw', description: 'Local attractions and tourism infrastructure drive steady visitor traffic year-round.' });
      } else if (hl.includes('university') || hl.includes('college')) {
        reasons.push({ emoji: '🎓', title: 'University Town', description: 'Parent visits, graduations, and sports events create predictable demand spikes.' });
      } else if (hl.includes('growing') || hl.includes('growth')) {
        reasons.push({ emoji: '📈', title: 'Growth Corridor', description: 'Rapid population growth and new development signal increasing rental demand.' });
      } else if (hl.includes('ski') || hl.includes('winter')) {
        reasons.push({ emoji: '⛷️', title: 'Ski Season', description: 'Winter sports enthusiasts drive premium rates during peak ski season months.' });
      } else if (hl.includes('wine') || hl.includes('vineyard')) {
        reasons.push({ emoji: '🍷', title: 'Wine Country', description: 'Wine tourism and culinary experiences attract affluent travelers willing to pay premium rates.' });
      } else if (hl.includes('national park') || hl.includes('outdoor')) {
        reasons.push({ emoji: '🏕️', title: 'Outdoor Recreation', description: 'Proximity to parks and outdoor activities draws adventure travelers and families.' });
      } else if (hl.includes('medical') || hl.includes('hospital')) {
        reasons.push({ emoji: '🏥', title: 'Medical Tourism', description: 'Major medical facilities bring traveling nurses, patients, and families needing extended stays.' });
      } else if (hl.includes('military') || hl.includes('base')) {
        reasons.push({ emoji: '🎖️', title: 'Military Presence', description: 'Military installations create steady demand from relocating families and visiting personnel.' });
      }
    }
    
    return reasons.slice(0, 3); // Max 3 reasons
  };
  const whyCityReasons = getWhyCityReasons();

  return (
    <DoubleTapSave isSaved={isSaved} onToggleSave={toggleSave}>
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link 
            href={`/state/${city.stateCode.toLowerCase()}`} 
            className="inline-flex items-center gap-1 text-sm mb-4 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {city.stateCode}
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 
                className="text-2xl sm:text-3xl font-bold mb-1"
                style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                {city.name}
              </h1>
              <div className="flex items-center gap-2">
                <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{city.county}, {city.stateCode}</p>
                {saveCount !== null && saveCount >= 50 && (
                  <span 
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.9)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    {saveCount >= 1000 ? `${(saveCount / 1000).toFixed(1)}K` : saveCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={getGradeStyle(city.grade)}
                >
                  {verdictInfo.text}
                </span>
                <a
                  href="https://www.proper.insure/regulations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                >
                  STR Rules →
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 page-header-row">
              <AuthHeader variant="dark" />
              <button
                onClick={handleShare}
                className="p-3 rounded-xl transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                title="Share Analysis"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
              <button
                onClick={toggleSave}
                className="p-3 rounded-xl transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                aria-label={isSaved ? "Remove from saved" : "Save city"}
              >
                <span className="text-xl">{isSaved ? "❤️" : "🤍"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Overall Grade & Score */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="font-semibold"
              style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              STR Investment Grade
            </h3>
            <span className="text-sm" style={{ color: '#787060' }}>Transparent Scoring</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-4 sm:flex-col sm:text-center">
              <div 
                className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center"
                style={{ ...getGradeStyle(city.grade), boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.15)' }}
              >
                <div 
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {city.grade}
                </div>
              </div>
              <div className="sm:mt-2">
                <div 
                  className="text-2xl font-bold"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  {city.marketScore}/100
                </div>
                <div className="text-sm" style={{ color: '#787060' }}>{verdictInfo.emoji} {verdictInfo.text}</div>
              </div>
            </div>
            
            {/* Transparent Score Breakdown */}
            <div className="flex-1 space-y-3 w-full">
              <div className="text-sm font-medium mb-2" style={{ color: '#2b2823' }}>Score Breakdown</div>
              
              {[
                { icon: '💰', label: 'Cash-on-Cash', score: city.scoring.cashOnCash.score, max: 35, info: 'Annual cash flow divided by total cash invested' },
                { icon: '🏠', label: 'Affordability', score: city.scoring.affordability.score, max: 25, info: 'Based on median home price in this market' },
                { icon: '📅', label: 'Year-Round Income', score: city.scoring.yearRoundIncome.score, max: 15, info: 'Occupancy consistency throughout the year' },
                { icon: '🤝', label: 'Landlord Friendly', score: city.scoring.landlordFriendly.score, max: 10, info: 'State-level tenant/landlord law favorability' },
                { icon: '📈', label: 'Room to Grow', score: city.scoring.roomToGrow.score, max: 15, info: 'Market saturation and competition level' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm w-32" style={{ color: '#787060' }}>{item.label}</span>
                  <div 
                    className="flex-1 h-2.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#e5e3da' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(item.score / item.max) * 100}%`,
                        backgroundColor: '#2b2823'
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-12 text-right" style={{ color: '#2b2823' }}>
                    {item.score}/{item.max}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Score Details */}
          <div 
            className="mt-4 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm"
            style={{ borderTop: '1px solid #d8d6cd' }}
          >
            <div className="rounded-lg p-3" style={{ backgroundColor: '#e5e3da' }}>
              <div style={{ color: '#787060' }}>Cash-on-Cash</div>
              <div className="font-semibold" style={{ color: '#2b2823' }}>{city.scoring.cashOnCash.value.toFixed(1)}%</div>
              <div className="text-xs" style={{ color: '#787060' }}>{city.scoring.cashOnCash.rating}</div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: '#e5e3da' }}>
              <div style={{ color: '#787060' }}>Median Home</div>
              <div className="font-semibold" style={{ color: '#2b2823' }}>${(city.medianHomeValue / 1000).toFixed(0)}K</div>
              <div className="text-xs" style={{ color: '#787060' }}>{city.scoring.affordability.rating}</div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: '#e5e3da' }}>
              <div style={{ color: '#787060' }}>Room to Grow</div>
              <div className="font-semibold" style={{ color: '#2b2823' }}>{city.scoring.roomToGrow.score}/15</div>
              <div className="text-xs" style={{ color: '#787060' }}>{city.scoring.roomToGrow.rating}</div>
            </div>
          </div>
        </div>

        {/* Unified Regulation Card — shown for ALL cities (legal, restricted, banned) */}
        <RegulationCard
          cityName={city.name}
          stateCode={city.stateCode}
          cityId={city.id}
          staticData={city.regulationInfo}
          staticSource={city.regulationSource}
          regulationPenalty={city.scoring.regulationPenalty}
          grade={city.grade}
          marketScore={city.marketScore}
        />


        {/* Why [City]? */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 
              className="font-semibold"
              style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Why {city.name}?
            </h3>
            <span 
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: '#f5f0e8', color: '#2b2823', border: '1px solid #d8d6cd' }}
            >
              {marketLabel.label}
            </span>
          </div>
          <p className="text-sm mb-4" style={{ color: '#787060' }}>What drives short-term rental demand here</p>
          <div className="space-y-3">
            {whyCityReasons.map((reason, idx) => (
              <div 
                key={idx}
                className="rounded-xl p-4"
                style={{ backgroundColor: '#faf8f4', border: '1px solid #ebe8e0' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{reason.emoji}</span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#2b2823' }}>{reason.title}</div>
                    <p className="text-sm mt-0.5" style={{ color: '#787060' }}>{reason.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Will This Deal Work? */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <h3 
            className="font-semibold mb-4"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Will This Deal Work?
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Grade Gauge */}
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: '#e5e3da' }}>
              <div className="text-sm mb-2" style={{ color: '#787060' }}>Investment Grade</div>
              <div 
                className="text-4xl font-bold rounded-xl py-3"
                style={{ ...getGradeStyle(city.grade), fontFamily: 'Source Serif Pro, Georgia, serif', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.12)' }}
              >
                {city.grade}
              </div>
              <div className="text-xs font-semibold mt-2" style={{ color: '#2b2823' }}>{city.scoring.cashOnCash.rating}</div>
              <div className="text-xs mt-1" style={{ color: '#787060' }}>CoC: {city.scoring.cashOnCash.value.toFixed(1)}%</div>
            </div>

            {/* DSI Gauge */}
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: '#e5e3da' }}>
              <div className="text-sm mb-2" style={{ color: '#787060' }}>Can You Pay the Bills?</div>
              <div 
                className="text-4xl font-bold rounded-xl py-3"
                style={{ 
                  backgroundColor: city.dsi ? '#2b2823' : '#787060',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.12)'
                }}
              >
                {city.dsi ? "✓" : "✗"}
              </div>
              <div className="text-xs font-semibold mt-2" style={{ color: '#2b2823' }}>{city.dsi ? "YES" : "Risky"}</div>
              <div className="text-xs mt-1" style={{ color: '#787060' }}>{city.dsi ? "Income covers mortgage" : "May struggle with payments"}</div>
            </div>
          </div>

          {/* Bottom Line */}
          <div 
            className="rounded-xl p-4"
            style={{ 
              backgroundColor: city.grade === 'A+' || city.grade === 'A' ? 'rgba(43, 40, 35, 0.06)' : 
                              city.grade === 'B+' || city.grade === 'B' ? 'rgba(120, 112, 96, 0.08)' : 
                              'rgba(120, 112, 96, 0.06)',
              border: '1px solid #d8d6cd'
            }}
          >
            <div className="font-semibold mb-1" style={{ color: '#2b2823' }}>THE BOTTOM LINE {verdictInfo.emoji}</div>
            <p className="text-sm" style={{ color: '#787060' }}>
              {city.scoring.regulationPenalty?.applied && city.regulationInfo?.legality_status === 'banned'
                ? "This market has strict STR regulations. Some operators still succeed here, but thorough research into local ordinances and permits is essential before committing."
                : city.scoring.regulationPenalty?.applied && city.regulationInfo?.legality_status === 'restricted'
                ? "This market has STR regulations to be aware of. Many hosts operate successfully with proper permits. Research local ordinances before committing."
                : city.grade === 'A+' || city.grade === 'A'
                ? "Excellent opportunity! Strong cash flow potential with favorable market conditions."
                : city.grade === 'B+' || city.grade === 'B'
                ? "Good opportunity. Solid fundamentals but may require careful property selection."
                : city.grade === 'C'
                ? "Marginal opportunity. Returns may be limited - consider negotiating or other markets."
                : city.grade === 'D'
                ? "Below average. Significant challenges may impact profitability."
                : "High risk. Risk factors outweigh potential returns based on available data."}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-1">
          {[
            { label: "Avg ADR", value: `$${city.avgADR}`, icon: "💵", highlight: false },
            { label: "Occupancy", value: `${city.occupancy}%`, icon: "📅", highlight: false },
            { label: "Monthly Revenue", value: `$${city.strMonthlyRevenue.toLocaleString()}`, icon: "💰", highlight: true },
            { label: "Median Price", value: `$${(city.medianHomeValue / 1000).toFixed(0)}K`, icon: "🏠", highlight: false },
          ].map((stat) => (
            <div 
              key={stat.label} 
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
            >
              <div className="text-lg mb-1">{stat.icon}</div>
              <div 
                className="font-bold text-lg"
                style={{ color: stat.highlight ? '#000000' : '#2b2823' }}
              >
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: '#787060' }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] mb-4 text-right" style={{ color: '#9e9a8f' }}>Market estimates · Updated Feb 2026</p>

        {/* Income by Property Size */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <h3 
            className="font-semibold mb-1"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            📊 Income by Property Size
          </h3>
          <p className="text-sm mb-4" style={{ color: '#787060' }}>Monthly revenue estimates by bedroom count</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(incomeBySize).map(([size, income]) => (
              <div
                key={size}
                className="text-center p-3 rounded-xl transition-all"
                style={{ 
                  backgroundColor: size === bestSize[0] ? 'rgba(43, 40, 35, 0.08)' : '#e5e3da',
                  border: size === bestSize[0] ? '2px solid #2b2823' : '1px solid #d8d6cd'
                }}
              >
                <div className="text-sm font-semibold" style={{ color: '#2b2823' }}>{size}</div>
                <div 
                  className="font-bold"
                  style={{ color: size === bestSize[0] ? '#000000' : '#2b2823' }}
                >
                  ${income.toLocaleString()}
                </div>
                {size === bestSize[0] && <div className="text-xs font-medium" style={{ color: '#2b2823' }}>⭐ Best</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Amenity Recommendations */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <h3 
            className="font-semibold mb-1"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            🏠 Top Amenities for This Market
          </h3>
          <p className="text-sm mb-4" style={{ color: '#787060' }}>Add these to boost your revenue</p>
          <div className="space-y-2">
            {amenities.map((amenity, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: '#e5e3da' }}
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ 
                      backgroundColor: amenity.priority === "MUST HAVE" ? '#2b2823' :
                                      amenity.priority === "HIGH IMPACT" ? '#787060' : '#d8d6cd',
                      color: amenity.priority === "NICE TO HAVE" ? '#2b2823' : '#ffffff'
                    }}
                  >
                    {amenity.priority}
                  </span>
                  <span className="font-medium" style={{ color: '#2b2823' }}>{amenity.name}</span>
                </div>
                <span className="font-bold" style={{ color: '#000000' }}>+{amenity.boost}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Next Steps */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: 'rgba(43, 40, 35, 0.04)', border: '1px solid #d8d6cd' }}
        >
          <h3 
            className="font-semibold mb-4"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            🎯 Your Next Steps
          </h3>
          <div className="space-y-4">
            {[
              { step: 1, title: `Search for ${bestSize[0]} properties`, desc: `Best income potential at $${bestSize[1].toLocaleString()}/month` },
              { step: 2, title: `Add a ${amenities[0]?.name}`, desc: `Boost revenue by +${amenities[0]?.boost}%` },
              { step: 3, title: `Target $${Math.round(city.strMonthlyRevenue * 1.25).toLocaleString()}/month`, desc: 'Top 25% performer income goal' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span 
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                >
                  {item.step}
                </span>
                <div>
                  <div className="font-semibold" style={{ color: '#2b2823' }}>{item.title}</div>
                  <div className="text-sm" style={{ color: '#787060' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regulation Info */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <h3 
            className="font-semibold mb-3"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            📋 Regulation Status
          </h3>
          {/* Show actual regulation data */}
          {city.regulationInfo && (
            <div className="flex flex-wrap gap-2 mb-3">
              <span 
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ 
                  backgroundColor: city.regulationInfo.legality_status === 'banned' ? '#fef2f2' 
                    : city.regulationInfo.legality_status === 'restricted' ? '#fffbeb' : '#f0fdf4',
                  color: city.regulationInfo.legality_status === 'banned' ? '#dc2626' 
                    : city.regulationInfo.legality_status === 'restricted' ? '#ca8a04' : '#16a34a',
                  border: `1px solid ${city.regulationInfo.legality_status === 'banned' ? '#fca5a5' 
                    : city.regulationInfo.legality_status === 'restricted' ? '#fcd34d' : '#86efac'}`
                }}
              >
                {city.regulationInfo.legality_status === 'banned' ? 'Strict Rules' 
                  : city.regulationInfo.legality_status === 'restricted' ? 'Regulated' : 'Legal'}
              </span>
              {city.regulationInfo.permit_difficulty && city.regulationInfo.permit_difficulty !== 'unknown' && (
                <span 
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: city.regulationInfo.permit_difficulty === 'very_hard' || city.regulationInfo.permit_difficulty === 'hard'
                      ? '#fef2f2' : city.regulationInfo.permit_difficulty === 'moderate' ? '#fffbeb' : '#f0fdf4',
                    color: city.regulationInfo.permit_difficulty === 'very_hard' || city.regulationInfo.permit_difficulty === 'hard'
                      ? '#dc2626' : city.regulationInfo.permit_difficulty === 'moderate' ? '#ca8a04' : '#16a34a',
                    border: `1px solid ${city.regulationInfo.permit_difficulty === 'very_hard' || city.regulationInfo.permit_difficulty === 'hard'
                      ? '#fca5a5' : city.regulationInfo.permit_difficulty === 'moderate' ? '#fcd34d' : '#86efac'}`
                  }}
                >
                  Permit: {city.regulationInfo.permit_difficulty.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              )}
              {city.regulationSource === 'curated' && (
                <span className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#f5f0e8', color: '#787060', border: '1px solid #d8d6cd' }}>
                  Verified Data
                </span>
              )}
            </div>
          )}
          <p className="text-sm mb-4" style={{ color: '#787060' }}>
            Regulations vary by city and county. Always verify local STR ordinances, permit requirements, and zoning laws before purchasing.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.proper.insure/regulations/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Permitting Resources
            </a>
            <a
              href="https://www.proper.insure"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              STR Insurance
            </a>
          </div>
        </div>

        {/* View Comparable Listings */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#e5e3da' }}
            >
              <svg className="w-5 h-5" style={{ color: '#2b2823' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h3 
                className="font-semibold"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Research Comparable Listings
              </h3>
              <p className="text-sm" style={{ color: '#787060' }}>See active short-term rentals in this market</p>
            </div>
          </div>
          <a
            href={`https://www.airbnb.com/s/${encodeURIComponent(city.name + ', ' + (getStateByCode(city.stateCode)?.name || city.stateCode))}/homes`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90"
            style={{ 
              backgroundColor: '#FF5A5F',
              color: '#ffffff',
              boxShadow: '0 2px 8px -2px rgba(255, 90, 95, 0.3)'
            }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.001 18.275c-1.353-1.697-2.797-3.46-3.592-5.075-.795-1.614-1.022-3.015-.534-4.157.487-1.142 1.538-1.9 2.85-2.122 1.312-.222 2.83.113 4.276 1.075 1.446.962 2.82 2.55 3.592 4.165.773 1.614 1 3.015.513 4.157-.488 1.142-1.539 1.9-2.851 2.122-1.312.222-2.83-.113-4.276-1.075l.022-.09zm-.022.09c-1.446-.962-2.82-2.55-3.592-4.165" />
            </svg>
            View Listings on Airbnb
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="text-xs text-center mt-3" style={{ color: '#787060' }}>
            Opens Airbnb.com in a new tab to view real listings and pricing in this market
          </p>
        </div>

        {/* Take Action - Zillow Links */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#dbeafe' }}
            >
              <svg className="w-5 h-5" style={{ color: '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div>
              <h3 
                className="font-semibold"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Take the Next Step
              </h3>
              <p className="text-sm" style={{ color: '#787060' }}>Find homes, agents, and lenders in this market</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <a
              href={`https://www.zillow.com/${encodeURIComponent(city.name.toLowerCase().replace(/\s+/g, '-') + '-' + city.stateCode.toLowerCase())}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: '#f0f7ff', border: '1px solid #bfdbfe' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: '#1e40af' }}>Find a Home in {city.name}</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Browse properties for sale on Zillow</p>
              </div>
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://www.zillow.com/professionals/real-estate-agent-reviews/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#16a34a' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: '#15803d' }}>Find an Agent to Buy Remotely</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Top-rated real estate agents near {city.name}</p>
              </div>
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://www.zillow.com/homeloans/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: '#fefce8', border: '1px solid #fde68a' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ca8a04' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: '#a16207' }}>Get Pre-Approved for a Loan</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Compare lenders and get pre-approved today</p>
              </div>
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="text-xs text-center mt-3" style={{ color: '#9ca3af' }}>Opens Zillow.com in a new tab</p>
        </div>

        {/* Explore More Markets — Dynamic Internal Links */}
        {(() => {
          const stateCities = getCitiesByState(city.stateCode);
          const relatedCities = stateCities
            .filter(c => c.id !== city.id)
            .sort((a, b) => b.marketScore - a.marketScore)
            .slice(0, 6);
          if (relatedCities.length === 0) return null;
          return (
            <div className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}>
              <h3 className="font-semibold text-base mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                More Markets in {city.stateCode}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {relatedCities.map(rc => (
                  <Link
                    key={rc.id}
                    href={`/city/${rc.id}`}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all hover:opacity-80"
                    style={{ backgroundColor: '#f5f4f0', border: '1px solid #e5e3da' }}
                  >
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        backgroundColor: rc.grade === 'A+' || rc.grade === 'A' ? '#2b2823' : rc.grade === 'B+' ? '#3d3a34' : '#787060',
                        color: '#ffffff',
                      }}
                    >
                      {rc.grade}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#2b2823' }}>{rc.name}</p>
                      <p className="text-[10px]" style={{ color: '#787060' }}>${rc.strMonthlyRevenue.toLocaleString()}/mo</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href={`/state/${city.stateCode.toLowerCase()}`}
                className="block text-center mt-3 text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: '#787060' }}
              >
                View all {stateCities.length} markets in {city.stateCode} →
              </Link>
            </div>
          );
        })()}

        {/* CTA */}
        <div 
          className="rounded-2xl p-6 text-center mt-4"
          style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}
        >
          <h3 
            className="font-semibold text-lg mb-2"
            style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Ready to Invest?
          </h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            Learn more about our STR coaching program.
          </p>
          <Link
            href="https://app.usemotion.com/meet/stephanie-tran-6vk2/aa-coaching-interview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
            style={{ 
              backgroundColor: '#ffffff', 
              color: '#2b2823',
              boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.2)'
            }}
          >
            Apply Now
          </Link>
        </div>

        {/* Breadcrumb */}
        <nav className="mt-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs" style={{ color: '#787060' }}>
            <li><Link href="/" className="hover:underline">Home</Link></li>
            <li>/</li>
            <li><Link href={`/state/${city.stateCode.toLowerCase()}`} className="hover:underline">{city.stateCode}</Link></li>
            <li>/</li>
            <li style={{ color: '#2b2823' }}>{city.name}</li>
          </ol>
        </nav>

        {/* AI-Extractable Summary — very bottom for clean UX, fully crawlable by search engines and AI */}
        <div className="pt-4 pb-2">
          <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
            {city.name}, {getStateByCode(city.stateCode)?.name || city.stateCode} is rated <strong>{city.grade}</strong> for Airbnb investment with a score of {city.marketScore}/100 ({verdictInfo.text}). 
            The market has an average daily rate (ADR) of ${city.avgADR}, {city.occupancy}% occupancy, and estimated monthly STR revenue of ${city.strMonthlyRevenue.toLocaleString()}. 
            Median home value is ${city.medianHomeValue.toLocaleString()} with a cash-on-cash return of {city.cashOnCash.toFixed(1)}%. 
            STR regulation status: {city.regulation}. 
            Data powered by <a href="https://edge.teeco.co" style={{ color: '#9ca3af', textDecoration: 'underline' }}>Edge by Teeco</a> using estimated market data.
          </p>
        </div>
      </div>
    </div>

    {/* Breadcrumb Schema */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://edge.teeco.co" },
            { "@type": "ListItem", position: 2, name: city.stateCode, item: `https://edge.teeco.co/state/${city.stateCode.toLowerCase()}` },
            { "@type": "ListItem", position: 3, name: `${city.name}, ${city.stateCode}`, item: `https://edge.teeco.co/city/${city.id}` },
          ],
        }),
      }}
    />

    {/* City FAQ Schema */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `Is ${city.name}, ${city.stateCode} a good market for Airbnb investment?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${city.name}, ${city.stateCode} has an investment grade of ${city.grade} (${city.marketScore}/100) with a verdict of ${city.verdict.replace('-', ' ').toUpperCase()}. Average monthly STR revenue is $${city.strMonthlyRevenue.toLocaleString()} with ${city.occupancy}% occupancy and $${Math.round(city.avgADR)} ADR. Median home price is $${city.medianHomeValue.toLocaleString()}.`,
              },
            },
            {
              "@type": "Question",
              name: `What is the average Airbnb revenue in ${city.name}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `The average monthly Airbnb revenue in ${city.name}, ${city.stateCode} is $${city.strMonthlyRevenue.toLocaleString()}, which translates to approximately $${(city.strMonthlyRevenue * 12).toLocaleString()} per year. The average daily rate (ADR) is $${Math.round(city.avgADR)} with an occupancy rate of ${city.occupancy}%.`,
              },
            },
            {
              "@type": "Question",
              name: `Are short-term rentals legal in ${city.name}, ${city.stateCode}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Short-term rentals in ${city.name}, ${city.stateCode} are classified as "${city.regulation}". ${city.permitRequired ? 'A permit is required to operate.' : 'No specific permit requirement has been identified.'} Always verify current local regulations before investing.`,
              },
            },
          ],
        }),
      }}
    />
    
    {/* Floating Action Pill - Heart + Share */}
    <FloatingActionPill 
      isSaved={isSaved} 
      onToggleSave={toggleSave}
      shareText={city ? `Check out ${city.name}, ${city.stateCode} — $${city.strMonthlyRevenue.toLocaleString()}/mo STR market:` : undefined}
      marketLikeCount={saveCount}
    />
    </DoubleTapSave>
  );
}
