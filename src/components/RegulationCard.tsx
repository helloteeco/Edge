'use client';

import { useState, useEffect } from 'react';

/**
 * RegulationCard — Universal STR regulation display for ALL cities.
 * 
 * This component handles three data sources seamlessly:
 * 1. Curated static data (from str-regulations.ts for ~200 well-known restricted/banned cities)
 * 2. AI-enriched data (fetched on-demand from /api/str-regulations, cached in Supabase for 30 days)
 * 3. Default fallback (shown while enrichment loads, or if enrichment fails)
 * 
 * Every city page shows this card — legal, restricted, or banned. 
 * New cities/states added in the future automatically get regulation cards.
 */

interface RegulationData {
  legality_status: 'legal' | 'restricted' | 'banned' | 'unknown';
  permit_difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard' | 'unknown';
  max_nights_per_year: number | null;
  owner_occupied_required: boolean;
  permit_cap: boolean;
  summary: string;
  details: string;
  last_verified?: string;
  source?: 'curated' | 'cached' | 'researched' | 'default';
  days_since_verified?: number;
}

interface RegulationCardProps {
  cityName: string;
  stateCode: string;
  cityId: string;
  /** Static regulation data from the curated list or default */
  staticData?: RegulationData;
  /** Whether the static data is curated or default */
  staticSource?: 'curated' | 'default';
  /** Scoring penalty info (optional) */
  regulationPenalty?: {
    applied: boolean;
    originalScore: number;
    originalGrade: string;
  };
  /** Current grade after penalty */
  grade?: string;
  /** Current market score after penalty */
  marketScore?: number;
}

// Color schemes for each status
const STATUS_STYLES = {
  legal: {
    bg: '#f0fdf4',
    border: '#86efac',
    icon: '✅',
    titleColor: '#166534',
    textColor: '#15803d',
    detailColor: '#16a34a',
    title: 'STRs Generally Permitted',
    badgeBg: 'rgba(22, 163, 74, 0.1)',
    badgeColor: '#16a34a',
    penaltyBg: 'rgba(22, 101, 52, 0.08)',
    penaltyColor: '#166534',
    guidanceTitle: '📋 Before You Invest',
    guidanceIntro: (cityName: string) => 
      `Even in STR-friendly markets, confirm the details for your specific property. Call the ${cityName} City Clerk or Planning & Zoning Department and ask:`,
    guidanceFooter: 'Regulation details vary by neighborhood and zoning district — always verify for your specific address.',
    searchLabel: '🔗 Search Permit Info',
    searchQuery: (city: string, state: string) => `${city} ${state} short term rental permit`,
  },
  restricted: {
    bg: '#fffbeb',
    border: '#fcd34d',
    icon: '⚠️',
    titleColor: '#92400e',
    textColor: '#a16207',
    detailColor: '#ca8a04',
    title: 'STR Restrictions May Apply',
    badgeBg: 'rgba(202, 138, 4, 0.1)',
    badgeColor: '#ca8a04',
    penaltyBg: 'rgba(146, 64, 14, 0.08)',
    penaltyColor: '#92400e',
    guidanceTitle: '📞 How to Verify',
    guidanceIntro: (cityName: string) =>
      `Call the ${cityName} City Clerk or Planning & Zoning Department and ask:`,
    guidanceFooter: 'Many cities have active Airbnbs operating legally with permits — restrictions don\'t always mean it\'s impossible.',
    searchLabel: '🔗 Search Municipal Code',
    searchQuery: (city: string, state: string) => `${city} ${state} short term rental ordinance`,
  },
  banned: {
    bg: '#fef2f2',
    border: '#fca5a5',
    icon: '🚫',
    titleColor: '#991b1b',
    textColor: '#b91c1c',
    detailColor: '#dc2626',
    title: 'STRs Effectively Banned',
    badgeBg: 'rgba(220, 38, 38, 0.1)',
    badgeColor: '#dc2626',
    penaltyBg: 'rgba(153, 27, 27, 0.08)',
    penaltyColor: '#991b1b',
    guidanceTitle: '📞 How to Verify',
    guidanceIntro: (cityName: string) =>
      `Call the ${cityName} City Clerk or Planning & Zoning Department and ask:`,
    guidanceFooter: 'Some banned cities still have grandfathered operators or exemptions — it\'s worth calling to understand your options.',
    searchLabel: '🔗 Search Municipal Code',
    searchQuery: (city: string, state: string) => `${city} ${state} short term rental ban ordinance`,
  },
  unknown: {
    bg: '#f9fafb',
    border: '#d1d5db',
    icon: '❓',
    titleColor: '#374151',
    textColor: '#6b7280',
    detailColor: '#9ca3af',
    title: 'Regulation Status Unknown',
    badgeBg: 'rgba(107, 114, 128, 0.1)',
    badgeColor: '#6b7280',
    penaltyBg: 'rgba(55, 65, 81, 0.08)',
    penaltyColor: '#374151',
    guidanceTitle: '📞 How to Verify',
    guidanceIntro: (cityName: string) =>
      `Call the ${cityName} City Clerk or Planning & Zoning Department and ask:`,
    guidanceFooter: 'Always verify local regulations before investing.',
    searchLabel: '🔗 Search Municipal Code',
    searchQuery: (city: string, state: string) => `${city} ${state} short term rental ordinance`,
  },
};

export default function RegulationCard({
  cityName,
  stateCode,
  cityId,
  staticData,
  staticSource,
  regulationPenalty,
  grade,
  marketScore,
}: RegulationCardProps) {
  // Start with static data, then overlay AI enrichment
  const [regData, setRegData] = useState<RegulationData | null>(staticData || null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentSource, setEnrichmentSource] = useState<string>(staticSource || 'default');

  useEffect(() => {
    // Always try to get AI-enriched data for every city
    // For curated cities: check if Supabase has fresher data (cached from previous AI research)
    // For default cities: always fetch to get real regulation data
    const enrichRegulation = async () => {
      setIsEnriching(true);
      try {
        const res = await fetch(
          `/api/str-regulations?city=${encodeURIComponent(cityName)}&state=${encodeURIComponent(stateCode)}&cityId=${encodeURIComponent(cityId)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.legality_status && !data.error) {
            setRegData({
              legality_status: data.legality_status,
              permit_difficulty: data.permit_difficulty,
              max_nights_per_year: data.max_nights_per_year,
              owner_occupied_required: data.owner_occupied_required,
              permit_cap: data.permit_cap,
              summary: data.summary,
              details: data.details,
              last_verified: data.last_verified,
              source: data.source,
              days_since_verified: data.days_since_verified,
            });
            setEnrichmentSource(data.source || 'researched');
          }
        }
      } catch {
        // Keep static data on failure — no error shown to user
      } finally {
        setIsEnriching(false);
      }
    };

    enrichRegulation();
  }, [cityId, cityName, stateCode]);

  // Determine which data to display
  const displayData = regData || {
    legality_status: 'legal' as const,
    permit_difficulty: 'moderate' as const,
    max_nights_per_year: null,
    owner_occupied_required: false,
    permit_cap: false,
    summary: 'STRs generally allowed with standard permits',
    details: 'No major restrictions known. Standard registration and tax collection may be required. Check local ordinances for specific requirements.',
  };

  const status = displayData.legality_status === 'unknown' ? 'unknown' : displayData.legality_status;
  const style = STATUS_STYLES[status] || STATUS_STYLES.unknown;

  // Determine data freshness label
  const getDataLabel = () => {
    if (enrichmentSource === 'curated') {
      return displayData.last_verified 
        ? `Verified data as of ${displayData.last_verified}` 
        : 'Curated regulation data';
    }
    if (enrichmentSource === 'cached' || enrichmentSource === 'researched') {
      const days = displayData.days_since_verified;
      if (days !== undefined && days <= 1) return 'AI-researched today';
      if (days !== undefined && days <= 7) return `AI-researched ${days} days ago`;
      if (days !== undefined) return `AI-researched ${days} days ago`;
      return 'AI-researched regulation data';
    }
    return 'AI-generated regulation data';
  };

  // Permit difficulty badge colors
  const getPermitBadgeStyle = () => {
    const diff = displayData.permit_difficulty;
    if (diff === 'easy') return { bg: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' };
    if (diff === 'moderate') return { bg: 'rgba(202, 138, 4, 0.1)', color: '#ca8a04' };
    if (diff === 'hard' || diff === 'very_hard') return { bg: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' };
    return { bg: style.badgeBg, color: style.badgeColor };
  };

  const permitBadge = getPermitBadgeStyle();

  return (
    <div 
      className="rounded-2xl p-5 mb-4"
      style={{ 
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)'
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{style.icon}</span>
        <div className="flex-1">
          {/* Title */}
          <h3 
            className="font-semibold mb-1"
            style={{ color: style.titleColor, fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            {style.title}
            {isEnriching && (
              <span className="ml-2 text-xs font-normal" style={{ color: '#9ca3af' }}>
                Checking latest data...
              </span>
            )}
          </h3>

          {/* Summary */}
          <p className="text-sm mb-2" style={{ color: style.textColor }}>
            {displayData.summary}
          </p>

          {/* Details */}
          {displayData.details && (
            <p className="text-sm mb-3" style={{ color: style.detailColor, lineHeight: 1.5 }}>
              {displayData.details}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {displayData.permit_difficulty && displayData.permit_difficulty !== 'unknown' && (
              <span 
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: permitBadge.bg, color: permitBadge.color }}
              >
                Permit: {displayData.permit_difficulty.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            )}
            {displayData.owner_occupied_required && (
              <span 
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}
              >
                Owner-Occupied Only
              </span>
            )}
            {displayData.permit_cap && (
              <span 
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}
              >
                Permit Cap in Effect
              </span>
            )}
            {displayData.max_nights_per_year && (
              <span 
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(202, 138, 4, 0.1)', color: '#ca8a04' }}
              >
                Max {displayData.max_nights_per_year} nights/year
              </span>
            )}
          </div>

          {/* Grade Impact (for restricted/banned curated cities) */}
          {regulationPenalty?.applied && (
            <div 
              className="rounded-lg p-3 text-xs mb-3"
              style={{ backgroundColor: style.penaltyBg, color: style.penaltyColor }}
            >
              <strong>Grade Impact:</strong> Base score of {regulationPenalty.originalScore}/100 would be grade {regulationPenalty.originalGrade}, 
              but capped at <strong>{grade}</strong> ({marketScore}/100) due to regulation risk.
            </div>
          )}

          {/* Disclaimer + Guidance + Actions */}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="text-xs mb-2" style={{ color: '#9ca3af' }}>
              {getDataLabel()} · Regulations change frequently
            </div>
            <div 
              className="rounded-lg p-3 mb-2 text-xs"
              style={{ backgroundColor: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}
            >
              <div className="font-semibold mb-1" style={{ color: '#2b2823' }}>
                {style.guidanceTitle}
              </div>
              <div style={{ color: '#4b5563' }}>
                {style.guidanceIntro(cityName)}
              </div>
              <div style={{ color: '#4b5563', marginTop: 4 }}>
                1. Are short-term rentals (under 30 days) allowed at [your address]?<br/>
                2. What permits or licenses are required?<br/>
                3. Are there owner-occupancy requirements?<br/>
                4. Any caps on rental nights per year or number of permits?
              </div>
              <div style={{ color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>
                {style.guidanceFooter}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(style.searchQuery(cityName, stateCode))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}
              >
                {style.searchLabel}
              </a>
              <a
                href={`mailto:support@teeco.co?subject=Regulation%20Inaccuracy%20-%20${encodeURIComponent(cityName + ', ' + stateCode)}&body=Hi%20Edge%20team,%0A%0AThe%20STR%20regulation%20data%20for%20${encodeURIComponent(cityName + ', ' + stateCode)}%20appears%20to%20be%20inaccurate.%0A%0AWhat%20I%20found:%0A%0A`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: '#92400e', border: '1px solid rgba(146,64,14,0.2)' }}
              >
                🚩 Report Inaccuracy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
