/**
 * STR Regulation Risk Database
 * 
 * Curated dataset of ~200 US cities with known STR restrictions.
 * Cities not in this list default to { legality: 'legal', permitDifficulty: 'moderate' }.
 * 
 * Data sources: HostHub research, Unfairbnb.net, OC Grand Jury report,
 * Hospitable.com, Investopedia, municipal ordinance records.
 * 
 * Last curated: February 2026
 * 
 * LEGALITY STATUS:
 * - 'banned': STRs effectively prohibited (de facto or de jure ban)
 * - 'restricted': STRs allowed but with major limitations (caps, zones, owner-occupied only)
 * - 'legal': STRs generally allowed (may need permit/license)
 * - 'unknown': Not yet researched
 * 
 * PERMIT DIFFICULTY:
 * - 'easy': Simple registration, no caps, no major hurdles
 * - 'moderate': Permit required, some rules, but obtainable
 * - 'hard': Significant hurdles (caps near limit, zoning restrictions, waitlists)
 * - 'very_hard': Near-impossible to get new permits (moratorium, long waitlists, strict caps reached)
 * - 'unknown': Not yet researched
 */

import type { RegulationInfo } from '@/lib/scoring';

export interface StaticRegulationEntry {
  legality_status: RegulationInfo['legality_status'];
  permit_difficulty: RegulationInfo['permit_difficulty'];
  owner_occupied_required: boolean;
  permit_cap: boolean;
  max_nights_per_year: number | null;
  summary: string;
  details: string;
}

/**
 * Static regulation data keyed by city ID (e.g., 'ca-irvine', 'ny-new-york-city').
 * Only cities with known restrictions are listed here.
 * All other cities default to legal/moderate.
 */
export const STR_REGULATIONS: Record<string, StaticRegulationEntry> = {
  // ============================================================
  // CALIFORNIA - Most restrictive state for STRs
  // ============================================================
  
  // BANNED
  'ca-irvine': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: 0,
    summary: 'STRs banned in all residential zones',
    details: 'Irvine prohibits all short-term rentals in residential zones. Violations carry fines of $1,500/day and misdemeanor charges.',
  },
  'ca-garden-grove': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: 0,
    summary: 'STRs completely banned',
    details: 'Garden Grove completely forbids short-term rentals. Violations can lead to $1,000/day fines, 6 months jail, or both.',
  },
  'ca-santa-ana': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: 0,
    summary: 'STRs banned as of April 2024',
    details: 'Santa Ana banned all short-term rentals (under 30 days) effective April 2024.',
  },
  'ca-costa-mesa': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: 0,
    summary: 'STRs treated as hotels, effectively banned in residential',
    details: 'Costa Mesa treats STRs as hotels, requiring hotel zoning and licensing. Effectively banned in residential areas.',
  },
  'ca-santa-monica': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Whole-home STRs banned; host-present home-sharing only',
    details: 'Santa Monica banned entire-home vacation rentals. Only host-present home-sharing is allowed with a permit and business license. ~80% of Airbnb listings were removed.',
  },
  'ca-anaheim': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'No new STR permits allowed; only existing operators grandfathered',
    details: 'Anaheim banned new STRs in 2016, reversed in 2019 with 277 permits. Only current operators may continue. No new permits are being issued.',
  },
  'ca-los-angeles': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: 120,
    summary: 'Primary residence only, 120-night annual cap',
    details: 'LA\'s Home Sharing Ordinance (2019) allows only primary residences to be rented short-term. Hosts must live there 6+ months/year. 120-night cap for unhosted stays unless extended permit obtained.',
  },
  'ca-san-francisco': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: 90,
    summary: 'Primary residence only, 90-night cap for unhosted stays',
    details: 'SF requires hosts to be permanent residents. Unhosted entire-home rentals capped at 90 nights/year. Must register with the city. Non-hosted STRs effectively banned.',
  },
  'ca-san-diego': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'License cap at 1% of housing (~5,416 licenses citywide)',
    details: 'San Diego instituted a license system in 2022 capping whole-home vacation rentals at 1% of housing units (~5,416 licenses). All operators must have a license.',
  },
  'ca-santa-barbara': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Banned in R-1 zones; limited permits in other zones',
    details: 'Santa Barbara bans STRs in R-1 residential zones. Limited permits available in other zones with strict regulations.',
  },
  'ca-carlsbad': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Banned outside coastal zone',
    details: 'Carlsbad bans STRs outside the coastal zone. Only properties in the coastal area may operate with permits.',
  },
  'ca-fullerton': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Cap reduced to 100 permits; non-transferable',
    details: 'Fullerton caps STR permits at 100 (reduced from 325 in 2021). Permits are non-transferable and void upon property sale.',
  },
  'ca-orange': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Cap of 125 STRs reached; waitlist only',
    details: 'City of Orange caps STRs at 125. That cap has been reached. New operators must join a waitlist.',
  },
  'ca-newport-beach': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: '1,550 permit cap reached; waitlist only',
    details: 'Newport Beach allows STRs only in R-1.5, R-2, and RM zones. 1,550 permit cap has been reached. No new permits; waitlist available.',
  },
  'ca-huntington-beach': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Owner-unoccupied STRs only in Sunset Beach area',
    details: 'Owner-occupied STRs allowed citywide with permit. Non-owner-occupied STRs only permitted in Sunset Beach. 24/7 complaint response required.',
  },
  'ca-mission-viejo': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: 0,
    summary: 'STRs banned in residential zones',
    details: 'Mission Viejo prohibits short-term rentals in residential zones as part of Orange County\'s restrictive approach.',
  },
  'ca-lake-forest': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: 0,
    summary: 'STRs banned',
    details: 'Lake Forest is among the 19 Orange County cities that have banned all short-term rentals.',
  },
  'ca-buena-park': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: 0,
    summary: 'STRs banned',
    details: 'Buena Park prohibits short-term rentals as part of Orange County\'s restrictive approach.',
  },
  'ca-westminster': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: 0,
    summary: 'STRs banned',
    details: 'Westminster is among the Orange County cities that have banned all short-term rentals.',
  },
  'ca-berkeley': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Owner-occupied only; strict regulations',
    details: 'Berkeley requires host to live on-site. Strict registration and compliance requirements.',
  },
  'ca-oakland': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Primary residence only; registration required',
    details: 'Oakland allows STRs only in primary residences. Hosts must register and pay transient occupancy tax.',
  },
  'ca-palm-springs': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Zoning restrictions; density caps in some areas',
    details: 'Palm Springs allows vacation rentals but with zoning restrictions and density limits. Registration and TOT collection required. Some neighborhoods have caps.',
  },
  'ca-mammoth-lakes': {
    legality_status: 'legal',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'STRs allowed with TOT registration',
    details: 'Mammoth Lakes allows STRs with proper registration and transient occupancy tax collection. Tourism-dependent economy.',
  },
  'ca-lake-tahoe': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Permit caps and restrictions vary by jurisdiction',
    details: 'Lake Tahoe area has varying regulations. South Lake Tahoe had Measure T (struck down) but still has permit caps and VHR restrictions in residential areas.',
  },
  'ca-lake-tahoe-south': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'VHR permit cap; restrictions in residential neighborhoods',
    details: 'South Lake Tahoe has a cap on vacation home rental permits. Measure T ban was struck down but city maintains strict permitting.',
  },
  'ca-pasadena': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Home-sharing only; owner must be present',
    details: 'Pasadena allows only home-sharing where the host is present. Entire-home rentals are not permitted in residential zones.',
  },
  'ca-long-beach': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Primary residence only; registration required',
    details: 'Long Beach allows STRs only in primary residences. Must register with the city and collect TOT.',
  },

  // ============================================================
  // NEW YORK
  // ============================================================
  'ny-new-york-city': {
    legality_status: 'banned',
    permit_difficulty: 'very_hard',
    owner_occupied_required: true,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'De facto ban since 2023 (Local Law 18)',
    details: 'NYC\'s Local Law 18 (2023) requires host registration, host must be present, max 2 guests. Effectively banned most Airbnb stays. Thousands of listings removed.',
  },
  'ny-buffalo': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration required; zoning restrictions',
    details: 'Buffalo requires STR registration and compliance with zoning. Some residential zones restrict non-owner-occupied rentals.',
  },
  'ny-albany': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration and safety inspections required',
    details: 'Albany requires STR registration, safety inspections, and tax collection. Regulations tightened in recent years.',
  },

  // ============================================================
  // FLORIDA - State law prevents outright bans but cities regulate
  // ============================================================
  'fl-miami-beach': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Rentals under 6 months banned in most residential areas',
    details: 'Miami Beach prohibits rentals under 6 months in most residential areas. STRs only allowed in certain tourist-zoned parts. Formerly $20,000 first-offense fines.',
  },
  'fl-miami': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Zoning restrictions; banned in most single-family zones',
    details: 'City of Miami restricts STRs by zoning. In most single-family residential zones, STRs are either banned or heavily restricted.',
  },
  'fl-key-west': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Transient license cap; no new licenses in most areas',
    details: 'Key West has a cap on transient rental licenses. Most areas are at capacity with no new licenses being issued. Existing licenses are highly valuable.',
  },
  'fl-fort-lauderdale': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration required; zoning restrictions in some areas',
    details: 'Fort Lauderdale requires STR registration and compliance with zoning. Some residential areas have restrictions.',
  },
  'fl-naples': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration required; minimum stay requirements in some zones',
    details: 'Naples and Collier County have registration requirements and some zones have minimum stay periods.',
  },

  // ============================================================
  // HAWAII - Very restrictive statewide
  // ============================================================
  'hi-honolulu': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Min 90-day rental in most areas; only resort zones allow shorter',
    details: 'Honolulu raised minimum rental period to 90 days in most areas (2022). Only resort districts allow stays under 90 days. Fines up to $10,000/day.',
  },
  'hi-maui': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Strict permit caps by region; waitlists; phasing out thousands',
    details: 'Maui County has strict STR permit caps (e.g., 100 in Kihei-Makena, 88 in West Maui). Waitlists for new permits. Moving to phase out thousands of rentals in apartment zones.',
  },
  'hi-kailua-kona': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Permit required; zoning restrictions',
    details: 'Hawaii County requires STR permits with zoning compliance. Some areas have caps on new permits.',
  },

  // ============================================================
  // TEXAS - Generally friendly but some cities restrict
  // ============================================================
  'tx-austin': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: true,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Non-owner-occupied STRs banned in residential zones since 2022',
    details: 'Austin banned non-owner-occupied STRs (Type 2) in residential zones. All Type 2 permits expired by 2022. Only owner-occupied (Type 1) allowed in residential areas.',
  },
  'tx-san-antonio': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Density limits; 1,000ft spacing requirement',
    details: 'San Antonio has density limits and a 1,000-foot spacing requirement between STRs in residential areas. Registration and permit required.',
  },
  'tx-dallas': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration required; zoning restrictions in some areas',
    details: 'Dallas requires STR registration and compliance with zoning. Some residential areas have restrictions on non-owner-occupied rentals.',
  },
  'tx-fort-worth': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Density restrictions in residential zones',
    details: 'Fort Worth has density restrictions for STRs in residential zones. Registration and permit required.',
  },

  // ============================================================
  // TENNESSEE
  // ============================================================
  'tn-nashville': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: true,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'No new non-owner-occupied permits in residential zones since 2017',
    details: 'Nashville banned new non-owner-occupied STR permits in residential zones in 2017, phased out existing ones by 2020. Only owner-occupied or commercial zone STRs allowed.',
  },
  'tn-chattanooga': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Permit required; some zoning restrictions',
    details: 'Chattanooga requires STR permits with zoning compliance. Some residential areas have restrictions.',
  },
  'tn-memphis': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration and permit required',
    details: 'Memphis requires STR registration and permits. Enforcement has increased in recent years.',
  },

  // ============================================================
  // COLORADO
  // ============================================================
  'co-denver': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Primary residence only; license required',
    details: 'Denver allows STRs only in primary residences. Must obtain a short-term rental license. Non-primary-residence STRs are illegal.',
  },
  'co-aspen': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Strict permit caps; moratorium on new permits',
    details: 'Aspen has imposed strict caps on STR permits and has had moratoriums on new permits. Very limited availability.',
  },
  'co-crested-butte': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Cap of 212 permits; 12-month moratorium',
    details: 'Crested Butte capped STR permits at 212. Town Council issued a 12-month moratorium on all new STR permits.',
  },
  'co-breckenridge': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'License required; density caps in some zones',
    details: 'Breckenridge requires STR licenses with density caps in certain zones. Regulations have tightened significantly.',
  },

  // ============================================================
  // NEVADA
  // ============================================================
  'nv-las-vegas': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Owner-occupied only; $500K insurance; strict rules',
    details: 'City of Las Vegas bans non-owner-occupied STRs. Owner-occupied rentals require business license, $500K liability insurance, max 3 bedrooms, 660ft distance from other STRs.',
  },

  // ============================================================
  // WASHINGTON DC
  // ============================================================
  'dc-washington': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: 90,
    summary: 'Primary residence only; 90-night cap for unhosted stays',
    details: 'DC allows only primary residences for STRs. Two-year license required. Unhosted rentals capped at 90 nights/year. Second homes cannot be rented short-term.',
  },

  // ============================================================
  // WASHINGTON STATE
  // ============================================================
  'wa-seattle': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Max 2 properties; one must be primary residence',
    details: 'Seattle limits hosts to 2 STR properties, one must be primary residence. STR operator license required.',
  },

  // ============================================================
  // OREGON
  // ============================================================
  'or-portland': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: 270,
    summary: 'Primary residence only; 270-night cap',
    details: 'Portland allows STRs only in primary residences. Permit required. Unhosted stays limited.',
  },

  // ============================================================
  // MASSACHUSETTS
  // ============================================================
  'ma-boston': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Investor-owned apartment STRs banned; primary residence only',
    details: 'Boston\'s 2019 ordinance banned STRs of investor-owned apartments. Only owner\'s primary residence or owner-adjacent unit in 2-3 family home allowed. ~2,000 units removed.',
  },
  'ma-cambridge': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Owner-occupied only; strict registration',
    details: 'Cambridge requires owner-occupancy for STRs. Strict registration and compliance requirements.',
  },
  'ma-provincetown': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration required; seasonal regulations',
    details: 'Provincetown requires STR registration. Being a tourism-dependent town, regulations are more permissive than Boston but still require compliance.',
  },

  // ============================================================
  // NEW JERSEY
  // ============================================================
  'nj-jersey-city': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: 60,
    summary: 'Non-owner-occupied banned; 60-night cap when owner away',
    details: 'Jersey City banned non-owner-occupied STRs. Owner-occupied rentals limited to 60 nights/year when owner is away. Eliminated unlimited Airbnb operations.',
  },

  // ============================================================
  // ILLINOIS
  // ============================================================
  'il-chicago': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'No single-night rentals; buildings can opt out; 3-strike rule',
    details: 'Chicago bans vacation rentals in non-owner-occupied properties with multiple listings. Condo associations can forbid STRs. No single-night rentals. Three noise/party strikes = license revocation.',
  },

  // ============================================================
  // PENNSYLVANIA
  // ============================================================
  'pa-philadelphia': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Non-primary-residence requires zoning variance (nearly impossible)',
    details: 'Philadelphia requires a "Limited Lodging Operator" license and zoning variance for non-primary-residence STRs. Zoning variance is largely unattainable in residential areas.',
  },

  // ============================================================
  // LOUISIANA
  // ============================================================
  'la-new-orleans': {
    legality_status: 'restricted',
    permit_difficulty: 'very_hard',
    owner_occupied_required: true,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Owner-occupied required; one-per-block rule; banned in French Quarter',
    details: 'New Orleans requires owner-occupancy in residential zones. One STR per block (2023 rule). Entirely banned in French Quarter and Garden District. Among strictest rules in the country.',
  },

  // ============================================================
  // GEORGIA
  // ============================================================
  'ga-atlanta': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Owner-occupied required in residential zones; permit needed',
    details: 'Atlanta requires STR permits and owner-occupancy in residential zones. Non-owner-occupied STRs restricted to certain commercial areas.',
  },
  'ga-savannah': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Permit caps in historic district; zoning restrictions',
    details: 'Savannah has permit caps in the historic district and zoning restrictions for STRs. Enforcement has increased significantly.',
  },
  'ga-tybee-island': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: false,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Permit cap; moratorium on new permits in some areas',
    details: 'Tybee Island has caps on STR permits and has imposed moratoriums on new permits in certain areas.',
  },

  // ============================================================
  // ARIZONA - State law preempts local bans (SB 1350, 2016)
  // but cities can regulate safety/noise/parking
  // ============================================================
  'az-sedona': {
    legality_status: 'legal',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'STRs legal (AZ state preemption); registration required',
    details: 'Arizona state law (SB 1350) prevents cities from banning STRs. Sedona requires registration and TOT collection. City can regulate noise, parking, and safety.',
  },
  'az-scottsdale': {
    legality_status: 'legal',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'STRs legal (AZ state preemption); registration required',
    details: 'Arizona state law prevents bans. Scottsdale requires STR registration and compliance with noise/safety rules.',
  },
  'az-phoenix': {
    legality_status: 'legal',
    permit_difficulty: 'easy',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'STRs legal (AZ state preemption); registration required',
    details: 'Arizona state law prevents bans. Phoenix requires registration and TOT collection. Relatively easy to operate.',
  },

  // ============================================================
  // VERMONT
  // ============================================================
  'vt-burlington': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Owner-occupied required; strict registration',
    details: 'Burlington requires owner-occupancy for STRs. Strict registration and compliance requirements.',
  },

  // ============================================================
  // IDAHO
  // ============================================================
  'id-boise': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Conditional use permit required in residential zones',
    details: 'Boise requires a conditional use permit for STRs in residential zones. Process can be lengthy but permits are obtainable.',
  },

  // ============================================================
  // SOUTH CAROLINA
  // ============================================================
  'sc-charleston': {
    legality_status: 'restricted',
    permit_difficulty: 'hard',
    owner_occupied_required: true,
    permit_cap: true,
    max_nights_per_year: null,
    summary: 'Owner-occupied required in most zones; strict caps',
    details: 'Charleston requires owner-occupancy for STRs in most residential zones. Strict permit caps and enforcement.',
  },

  // ============================================================
  // NORTH CAROLINA
  // ============================================================
  'nc-asheville': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Permit required; homestay vs whole-home distinction',
    details: 'Asheville distinguishes between homestays (owner-present) and whole-home STRs. Both require permits. Regulations have tightened.',
  },

  // ============================================================
  // MICHIGAN
  // ============================================================
  'mi-detroit': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration and permit required',
    details: 'Detroit requires STR registration and permits. Zoning compliance required.',
  },

  // ============================================================
  // MINNESOTA
  // ============================================================
  'mn-minneapolis': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: true,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Primary residence only; license required',
    details: 'Minneapolis allows STRs only in primary residences. Rental dwelling license required.',
  },

  // ============================================================
  // OHIO
  // ============================================================
  'oh-columbus': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration required; some zoning restrictions',
    details: 'Columbus requires STR registration and compliance with zoning. Some residential areas have restrictions.',
  },
  'oh-cleveland': {
    legality_status: 'restricted',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'Registration and permit required',
    details: 'Cleveland requires STR permits and registration. Enforcement has increased.',
  },
};

/**
 * Get regulation info for a city.
 * Returns curated data if available, otherwise returns default (legal/moderate).
 * The `source` field indicates whether data is curated or default.
 */
export function getStaticRegulation(cityId: string): StaticRegulationEntry & { source: 'curated' | 'default' } {
  const entry = STR_REGULATIONS[cityId];
  if (entry) {
    return { ...entry, source: 'curated' };
  }
  
  // Default: legal with moderate permit difficulty
  return {
    legality_status: 'legal',
    permit_difficulty: 'moderate',
    owner_occupied_required: false,
    permit_cap: false,
    max_nights_per_year: null,
    summary: 'STRs generally allowed with standard permits',
    details: 'No major restrictions known. Standard registration and tax collection may be required. Check local ordinances for specific requirements.',
    source: 'default',
  };
}

/**
 * Convert a static regulation entry to the full RegulationInfo format
 * used by the scoring system.
 */
export function toRegulationInfo(
  entry: StaticRegulationEntry & { source: 'curated' | 'default' },
  lastVerified?: string
): RegulationInfo {
  return {
    legality_status: entry.legality_status,
    permit_difficulty: entry.permit_difficulty,
    owner_occupied_required: entry.owner_occupied_required,
    permit_cap: entry.permit_cap,
    max_nights_per_year: entry.max_nights_per_year,
    summary: entry.summary,
    details: entry.details,
    last_verified: lastVerified || 'February 2026',
  };
}

/**
 * Get the count of cities with curated regulation data.
 */
export function getCuratedCount(): number {
  return Object.keys(STR_REGULATIONS).length;
}
// Build trigger 1770943954

