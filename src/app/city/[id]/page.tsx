"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCityById } from "@/data/helpers";
import AuthHeader from "@/components/AuthHeader";
import { DoubleTapSave, FloatingSaveButton } from "@/components/DoubleTapSave";

export default function CityPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState<number | null>(null);

  const city = getCityById(id);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("savedCities") || "[]");
    setIsSaved(saved.includes(city?.id));
    
    // Fetch save count from API
    if (city?.id) {
      fetch(`/api/market-saves?marketId=${city.id}&marketType=city`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSaveCount(data.count);
          }
        })
        .catch(console.error);
    }
    
    // Update document title and meta tags for sharing
    if (city) {
      document.title = `${city.name}, ${city.stateCode} - STR Grade ${city.grade} | Edge`;
      
      // Update Open Graph meta tags dynamically
      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.content = content;
      };
      
      updateMetaTag('og:title', `${city.name}, ${city.stateCode} - STR Grade ${city.grade}`);
      updateMetaTag('og:description', `Monthly Revenue: $${city.strMonthlyRevenue.toLocaleString()} | Score: ${city.marketScore}/100 | Median Price: $${city.medianHomeValue.toLocaleString()}`);
      updateMetaTag('og:type', 'website');
      updateMetaTag('og:site_name', 'Edge by Teeco');
    }
  }, [city?.id, city]);

  const toggleSave = async () => {
    const saved = JSON.parse(localStorage.getItem("savedCities") || "[]");
    let updated;
    const wasSaved = isSaved;
    
    if (isSaved) {
      updated = saved.filter((cid: string) => cid !== city?.id);
    } else {
      updated = [...saved, city?.id];
    }
    localStorage.setItem("savedCities", JSON.stringify(updated));
    setIsSaved(!isSaved);
    
    // Update save count in backend
    try {
      const res = await fetch('/api/market-saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: city?.id,
          marketType: 'city',
          action: wasSaved ? 'decrement' : 'increment'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveCount(data.count);
      }
    } catch (error) {
      console.error('Error updating save count:', error);
    }
  };

  const handleShare = () => {
    // Create shareable data object for city
    const shareData = {
      type: "city",
      id: city?.id,
      name: city?.name,
      state: city?.stateCode,
      grade: city?.grade,
      score: city?.marketScore,
      revenue: city?.strMonthlyRevenue,
      price: city?.medianHomeValue,
    };
    
    // Encode data for URL
    const encoded = btoa(JSON.stringify(shareData));
    const shareUrl = `https://edge.teeco.co/share?d=${encoded}`;
    
    const text = `Check out this STR market:\n\n${shareUrl}`;
    
    if (navigator.share) {
      navigator.share({ title: `${city?.name} STR Analysis`, text, url: shareUrl });
    } else {
      navigator.clipboard.writeText(text);
      alert("Share link copied to clipboard!");
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
      case 'passes-all-filters': return { text: 'PASSES ALL FILTERS', emoji: '✅' };
      case 'strong-buy': return { text: 'PASSES ALL FILTERS', emoji: '✅' }; // Legacy support
      case 'buy': return { text: 'WORTH A LOOK', emoji: '👍' };
      case 'hold': return { text: 'NEEDS MORE RESEARCH', emoji: '🔍' };
      case 'caution': return { text: 'BE CAREFUL', emoji: '⚠️' };
      default: return { text: 'NOT RECOMMENDED', emoji: '❌' };
    }
  };

  const verdictInfo = getVerdictText(city.verdict);

  // Find best bedroom size
  const incomeBySize = city.incomeBySize || { "1BR": 2000, "2BR": 2800, "3BR": 3500, "4BR": 4200, "5BR": 4800, "6BR+": 5500 };
  const bestSize = Object.entries(incomeBySize).reduce((a, b) => a[1] > b[1] ? a : b);

  // Generate demand driver descriptions from highlights and market type
  const getDemandDrivers = () => {
    const highlights = city.highlights || [];
    const marketType = city.marketType || 'urban';
    const drivers: Array<{ icon: string; title: string; description: string }> = [];

    // Market type context
    const marketTypeInfo: Record<string, { icon: string; title: string; desc: string }> = {
      'mountain': { icon: '⛰️', title: 'Mountain Destination', desc: 'Year-round outdoor recreation draws hikers, skiers, and nature lovers seeking cabin getaways.' },
      'beach': { icon: '🏖️', title: 'Beach & Coastal Market', desc: 'Beachfront demand drives premium nightly rates, especially during summer and holiday seasons.' },
      'urban': { icon: '🏙️', title: 'Urban & Metro Market', desc: 'Business travelers, event-goers, and weekend visitors create consistent year-round demand.' },
      'lake': { icon: '🛶', title: 'Lakefront Destination', desc: 'Waterfront properties command premium rates from families and groups seeking lake recreation.' },
      'desert': { icon: '🏜️', title: 'Desert & Southwest Market', desc: 'Snowbird migration and unique landscapes drive strong seasonal demand from northern travelers.' },
      'rural': { icon: '🌾', title: 'Rural & Country Market', desc: 'Privacy seekers and remote workers fuel growing demand for secluded, nature-adjacent stays.' },
      'suburban': { icon: '🏘️', title: 'Suburban Market', desc: 'Family-friendly neighborhoods attract group travel, relocations, and insurance-displacement stays.' },
      'waterfront': { icon: '⚓', title: 'Waterfront Market', desc: 'Water access properties earn significantly higher ADR from boaters, anglers, and vacationers.' },
      'tropical': { icon: '🌴', title: 'Tropical Destination', desc: 'Warm-weather escapes attract year-round tourism with peak demand during winter months.' },
    };

    const mInfo = marketTypeInfo[marketType] || marketTypeInfo['urban'];
    drivers.push({ icon: mInfo.icon, title: mInfo.title, description: mInfo.desc });

    // Map common highlight keywords to rich descriptions
    const highlightMap: Record<string, { icon: string; title: string; desc: string }> = {
      'national park': { icon: '🏞️', title: 'Near National Park', desc: 'National park proximity drives millions of annual visitors seeking nearby accommodation.' },
      'state park': { icon: '🌲', title: 'State Park Access', desc: 'State park visitors create steady demand for nearby short-term rentals.' },
      'ski': { icon: '⛷️', title: 'Ski Resort Area', desc: 'Winter sports enthusiasts book premium properties during ski season, often weeks in advance.' },
      'university': { icon: '🎓', title: 'University Town', desc: 'Parents visiting, graduation weekends, and football games create predictable high-demand periods.' },
      'college': { icon: '🎓', title: 'College Town', desc: 'Academic calendars drive reliable seasonal demand from parents, prospective students, and alumni.' },
      'football': { icon: '🏈', title: 'Game Day Demand', desc: 'College and pro football weekends command 2-3x normal rates in surrounding areas.' },
      'beach': { icon: '🏖️', title: 'Beach Access', desc: 'Direct or nearby beach access is the #1 demand driver for coastal vacation rentals.' },
      'lake': { icon: '🛶', title: 'Lake Recreation', desc: 'Boating, fishing, and lakefront relaxation attract families and groups year-round.' },
      'historic': { icon: '🏛️', title: 'Historic District', desc: 'Historic charm and walkable downtowns attract cultural tourists and weekend getaway travelers.' },
      'wine': { icon: '🍷', title: 'Wine Country', desc: 'Wine tourism brings affluent travelers willing to pay premium nightly rates.' },
      'music': { icon: '🎵', title: 'Music & Culture Hub', desc: 'Live music venues and cultural events create consistent visitor demand throughout the year.' },
      'festival': { icon: '🎪', title: 'Festival & Events', desc: 'Annual festivals and events create predictable booking spikes with premium pricing.' },
      'military': { icon: '🎖️', title: 'Military Base Proximity', desc: 'PCS moves, TDY assignments, and visiting families create steady mid-term rental demand.' },
      'medical': { icon: '🏥', title: 'Medical Tourism', desc: 'Patients and families visiting major medical centers need comfortable extended stays.' },
      'tech': { icon: '💻', title: 'Tech & Innovation Hub', desc: 'Tech industry growth brings business travelers and relocating professionals.' },
      'nasa': { icon: '🚀', title: 'NASA & Aerospace', desc: 'Space industry workers and launch tourism create unique demand patterns.' },
      'casino': { icon: '🎰', title: 'Casino & Entertainment', desc: 'Casino visitors and entertainment seekers drive high weekend and holiday occupancy.' },
      'golf': { icon: '⛳', title: 'Golf Destination', desc: 'Golf tourism attracts affluent travelers seeking multi-day stays near premier courses.' },
      'fishing': { icon: '🎣', title: 'Fishing & Outdoors', desc: 'Anglers and outdoor enthusiasts book seasonal stays near prime fishing locations.' },
      'hunting': { icon: '🦌', title: 'Hunting Season Demand', desc: 'Hunting season creates concentrated demand periods with group bookings.' },
      'river': { icon: '🏞️', title: 'River Recreation', desc: 'Rafting, kayaking, and riverside activities attract adventure travelers and families.' },
      'hiking': { icon: '🥾', title: 'Hiking & Trails', desc: 'Trail access draws outdoor enthusiasts for weekend and week-long adventure stays.' },
      'affordable': { icon: '💰', title: 'Affordable Entry Point', desc: 'Lower property prices mean better cash-on-cash returns and easier market entry for new investors.' },
      'growing': { icon: '📈', title: 'Growing Market', desc: 'Population and economic growth signal increasing demand and property appreciation potential.' },
      'family': { icon: '👨‍👩‍👧‍👦', title: 'Family Destination', desc: 'Family-friendly attractions drive group bookings with longer average stays.' },
      'resort': { icon: '🏨', title: 'Resort Area', desc: 'Resort proximity creates overflow demand and attracts vacationers seeking alternatives.' },
      'cruise': { icon: '🚢', title: 'Cruise Port', desc: 'Pre and post-cruise stays create reliable demand from cruise passengers.' },
      'theme park': { icon: '🎢', title: 'Theme Park Area', desc: 'Theme park visitors need multi-night stays, driving consistent family bookings.' },
      'hot springs': { icon: '♨️', title: 'Hot Springs & Wellness', desc: 'Wellness tourism attracts health-conscious travelers seeking relaxation retreats.' },
      'mardi gras': { icon: '🎭', title: 'Mardi Gras & Festivals', desc: 'Major annual celebrations create extreme demand spikes with 3-5x normal pricing.' },
      'port': { icon: '⚓', title: 'Port City', desc: 'Maritime commerce and port tourism bring diverse visitor demographics year-round.' },
      'recording studio': { icon: '🎙️', title: 'Music Heritage', desc: 'Music history tourism draws fans and artists to iconic recording locations.' },
      'corporate': { icon: '💼', title: 'Corporate Travel Hub', desc: 'Business travelers provide reliable weekday occupancy at competitive nightly rates.' },
      'seafood': { icon: '🦐', title: 'Culinary Destination', desc: 'Food tourism and local cuisine attract travelers seeking authentic dining experiences.' },
      'appalachian': { icon: '🏔️', title: 'Appalachian Region', desc: 'Mountain culture, scenic beauty, and outdoor recreation draw nature-loving travelers.' },
      'smoky': { icon: '🌄', title: 'Great Smoky Mountains', desc: 'America\'s most-visited national park brings 12M+ annual visitors to surrounding areas.' },
      'ozark': { icon: '🏞️', title: 'Ozarks Region', desc: 'Lakes, caves, and natural beauty make the Ozarks a top Midwest vacation destination.' },
      'bourbon': { icon: '🥃', title: 'Bourbon Trail', desc: 'Kentucky\'s bourbon tourism attracts spirits enthusiasts for distillery tours and tastings.' },
      'horse': { icon: '🐎', title: 'Horse Country', desc: 'Equestrian events and horse farm tourism create niche but premium demand.' },
      'nascar': { icon: '🏎️', title: 'NASCAR & Racing', desc: 'Race weekends fill every available rental within driving distance of the track.' },
    };

    for (const highlight of highlights) {
      const lower = highlight.toLowerCase();
      for (const [keyword, info] of Object.entries(highlightMap)) {
        if (lower.includes(keyword)) {
          // Avoid duplicate icons/titles
          if (!drivers.some(d => d.title === info.title)) {
            drivers.push({ icon: info.icon, title: info.title, description: info.desc });
          }
          break;
        }
      }
    }

    // Add any unmatched highlights as generic items
    for (const highlight of highlights) {
      const lower = highlight.toLowerCase();
      const matched = Object.keys(highlightMap).some(k => lower.includes(k));
      if (!matched && !drivers.some(d => d.title.toLowerCase() === lower)) {
        drivers.push({ icon: '📍', title: highlight, description: `${highlight} contributes to visitor demand and market appeal in ${city.name}.` });
      }
    }

    return drivers.slice(0, 5); // Max 5 drivers
  };

  const demandDrivers = getDemandDrivers();

  // Top amenity
  const amenities = city.amenityDelta || [
    { name: "Hot Tub", boost: 22, priority: "MUST HAVE" },
    { name: "Pool", boost: 18, priority: "HIGH IMPACT" },
    { name: "Game Room", boost: 15, priority: "HIGH IMPACT" },
    { name: "Fire Pit", boost: 12, priority: "NICE TO HAVE" },
    { name: "EV Charger", boost: 8, priority: "NICE TO HAVE" },
  ];

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
                <span 
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: city.regulation === "Legal" ? '#2b2823' : '#787060',
                    color: '#ffffff'
                  }}
                >
                  {city.regulation}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AuthHeader variant="dark" />
              <button
                onClick={handleShare}
                className="p-3 rounded-xl transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                title="Share Analysis"
              >
                <svg className="w-5 h-5" style={{ color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
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
        {/* Why This Market? - Demand Drivers & Attractions */}
        {demandDrivers.length > 0 && (
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
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}
              >
                {city.marketType.charAt(0).toUpperCase() + city.marketType.slice(1)} Market
              </span>
            </div>
            <p className="text-sm mb-4" style={{ color: '#787060' }}>What drives short-term rental demand here</p>
            
            <div className="space-y-3">
              {demandDrivers.map((driver, idx) => (
                <div 
                  key={idx} 
                  className="flex gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: idx === 0 ? 'rgba(43, 40, 35, 0.05)' : '#f8f7f4' }}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{driver.icon}</span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#2b2823' }}>{driver.title}</div>
                    <div className="text-sm mt-0.5" style={{ color: '#787060', lineHeight: '1.5' }}>{driver.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Highlight Tags */}
            {city.highlights && city.highlights.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #e5e3da' }}>
                {city.highlights.map((tag: string, idx: number) => (
                  <span 
                    key={idx}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

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
                { icon: '💰', label: 'Cash-on-Cash', score: city.scoring.cashOnCash.score, max: 35, tooltip: 'How much money you make back each year' },
                { icon: '🏠', label: 'Affordability', score: city.scoring.affordability.score, max: 25, tooltip: 'Can you afford to buy here?' },
                { icon: '📅', label: 'Year-Round Income', score: city.scoring.yearRoundIncome?.score || 10, max: 15, tooltip: 'Can you make money in slow months?' },
                { icon: '🤝', label: 'Landlord Friendly', score: city.scoring.landlordFriendly.score, max: 10, tooltip: 'Are the laws on your side?' },
                { icon: '📈', label: 'Room to Grow', score: city.scoring.roomToGrow?.score || 10, max: 15, tooltip: 'Is there space for more rentals?' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 group relative">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm w-36" style={{ color: '#787060' }}>
                    {item.label}
                    <span className="ml-1 text-xs cursor-help" title={item.tooltip}>ⓘ</span>
                  </span>
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
              <div className="font-semibold" style={{ color: '#2b2823' }}>{city.scoring.roomToGrow?.score || 0}/15</div>
              <div className="text-xs" style={{ color: '#787060' }}>{city.scoring.roomToGrow?.rating || 'N/A'}</div>
            </div>
          </div>
          
          {/* Disclaimer */}
          <div 
            className="mt-4 pt-3 text-center text-xs"
            style={{ borderTop: '1px solid #e5e3da', color: '#9a9488' }}
          >
            This score helps you filter markets - it does not replace checking the actual deal.
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
              {city.grade === 'A+' || city.grade === 'A'
                ? "Excellent opportunity! Strong cash flow potential with favorable market conditions."
                : city.grade === 'B+' || city.grade === 'B'
                ? "Good opportunity. Solid fundamentals but may require careful property selection."
                : city.grade === 'C'
                ? "Marginal opportunity. Returns may be limited - consider negotiating or other markets."
                : city.grade === 'D'
                ? "Below average. Significant challenges may impact profitability."
                : "Not recommended. High risk factors outweigh potential returns."}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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

        {/* Check Local Regulations */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#fff8e6', border: '1px solid #e6d9a8', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <h3 
            className="font-semibold mb-3 flex items-center gap-2"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            ⚠️ Check Local STR Regulations
          </h3>
          <p className="text-sm mb-4" style={{ color: '#787060' }}>
            STR regulations vary significantly by city, county, and even neighborhood. Before investing, always verify:
          </p>
          <ul className="text-sm space-y-2 mb-4" style={{ color: '#787060' }}>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Local zoning laws and STR ordinances</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Permit and licensing requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>HOA restrictions (if applicable)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Occupancy limits and safety requirements</span>
            </li>
          </ul>
          <a 
            href="https://www.proper.insure/regulations/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
          >
            📚 Research STR Regulations
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
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
              <p className="text-sm" style={{ color: '#787060' }}>See active Airbnb rentals in this market</p>
            </div>
          </div>
          <a
            href={`https://www.airbnb.com/s/${encodeURIComponent(city.name + ', ' + city.stateCode)}/homes`}
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
            Opens Airbnb.com in a new tab to view real listings and pricing
          </p>
        </div>

        {/* CTA */}
        <div 
          className="rounded-2xl p-6 text-center"
          style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}
        >
          <h3 
            className="font-semibold text-lg mb-2"
            style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Ready to Invest?
          </h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            Get personalized guidance from our STR coaching program.
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
      </div>
    </div>
    
    {/* Floating Save Button */}
    <FloatingSaveButton isSaved={isSaved} onToggleSave={toggleSave} />
    </DoubleTapSave>
  );
}
