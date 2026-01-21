export interface STRRegulation {
  status: 'legal' | 'restricted' | 'varies' | 'banned';
  permitRequired: boolean;
  primaryResidenceOnly: boolean;
  maxDaysPerYear: number | null;
  occupancyTax: number;
  salesTax: number;
  localTaxRange: string;
  enforcementLevel: 'strict' | 'moderate' | 'relaxed';
  lastUpdated: string;
  notes: string;
}

export interface MarketScore {
  overall: number; // 0-100
  demand: number;
  affordability: number;
  regulation: number;
  seasonality: number;
  verdict: 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid';
}

export interface DemandDrivers {
  tourism: string[];
  attractions: string[];
  events: string[];
  corporateDemand: boolean;
  seasonalPeak: string;
  seasonalLow: string;
}

export interface MarketPlaybook {
  idealBedBath: string;
  designStyle: string;
  mustHaveAmenities: string[];
  avoidList: string[];
  targetGuest: string;
}

export interface StateData {
  id: string;
  name: string;
  appreciation: {
    oneYear: number;
    fiveYear: number;
    medianValue: number;
  };
  mortgageRates: {
    thirtyYear: number;
    fifteenYear: number;
    trend: 'up' | 'down' | 'stable';
  };
  migration: {
    netMigration: number;
    migrationRate: number;
    topInbound: string[];
    topOutbound: string[];
  };
  rental: {
    shortTermMonthly: number;
    longTermMonthly: number;
    occupancyRate: number;
    avgADR: number;
  };
  strRegulation: STRRegulation;
  marketScore: MarketScore;
  demandDrivers: DemandDrivers;
  playbook: MarketPlaybook;
}

export const stateData: Record<string, StateData> = {
  AL: {
    id: 'AL',
    name: 'Alabama',
    appreciation: { oneYear: 3.8, fiveYear: 42.5, medianValue: 231946 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 157982, migrationRate: 31.44, topInbound: ['FL', 'GA', 'TN'], topOutbound: ['TX', 'FL', 'GA'] },
    rental: { shortTermMonthly: 1850, longTermMonthly: 1050, occupancyRate: 58, avgADR: 145 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 4,
      salesTax: 4,
      localTaxRange: '1-6%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-12',
      notes: 'Most cities require lodging license. Gulf Shores has specific STR ordinances.'
    },
    marketScore: { overall: 72, demand: 68, affordability: 85, regulation: 80, seasonality: 55, verdict: 'buy' },
    demandDrivers: { tourism: ['Gulf Shores beaches', 'Orange Beach'], attractions: ['USS Alabama', 'Gulf State Park'], events: ['Hangout Music Festival'], corporateDemand: false, seasonalPeak: 'Jun-Aug', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Coastal casual', mustHaveAmenities: ['Pool access', 'Beach gear', 'Outdoor grill'], avoidList: ['Far from beach', 'No parking'], targetGuest: 'Families, beach vacationers' }
  },
  AK: {
    id: 'AK',
    name: 'Alaska',
    appreciation: { oneYear: 2.1, fiveYear: 28.3, medianValue: 395096 },
    mortgageRates: { thirtyYear: 6.25, fifteenYear: 5.52, trend: 'stable' },
    migration: { netMigration: -8388, migrationRate: -11.44, topInbound: ['WA', 'CA', 'TX'], topOutbound: ['WA', 'TX', 'FL'] },
    rental: { shortTermMonthly: 2200, longTermMonthly: 1350, occupancyRate: 52, avgADR: 185 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 0,
      salesTax: 0,
      localTaxRange: '0-12%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'No state sales tax. Anchorage requires registration. Seasonal demand very high.'
    },
    marketScore: { overall: 58, demand: 75, affordability: 45, regulation: 70, seasonality: 40, verdict: 'hold' },
    demandDrivers: { tourism: ['Northern Lights', 'Denali National Park'], attractions: ['Glaciers', 'Wildlife viewing'], events: ['Iditarod', 'Midnight Sun Festival'], corporateDemand: false, seasonalPeak: 'Jun-Aug', seasonalLow: 'Nov-Mar' },
    playbook: { idealBedBath: '2BR/1BA cabin', designStyle: 'Rustic lodge', mustHaveAmenities: ['Hot tub', 'Aurora viewing deck', 'Heating'], avoidList: ['Remote access issues', 'No winter prep'], targetGuest: 'Adventure travelers, nature enthusiasts' }
  },
  AZ: {
    id: 'AZ',
    name: 'Arizona',
    appreciation: { oneYear: 2.4, fiveYear: 52.8, medianValue: 440228 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 411586, migrationRate: 57.50, topInbound: ['CA', 'WA', 'IL'], topOutbound: ['CA', 'TX', 'NV'] },
    rental: { shortTermMonthly: 2650, longTermMonthly: 1480, occupancyRate: 65, avgADR: 195 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5.5,
      salesTax: 5.6,
      localTaxRange: '1.5-4%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-12',
      notes: 'State law preempts local STR bans (2016). Cities can regulate safety/noise/parking only. Very STR-friendly.'
    },
    marketScore: { overall: 82, demand: 85, affordability: 65, regulation: 95, seasonality: 80, verdict: 'strong-buy' },
    demandDrivers: { tourism: ['Grand Canyon', 'Sedona'], attractions: ['Phoenix golf', 'Scottsdale spas'], events: ['Spring Training', 'Waste Management Open'], corporateDemand: true, seasonalPeak: 'Oct-Apr', seasonalLow: 'Jun-Aug' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Desert modern', mustHaveAmenities: ['Pool', 'AC', 'Outdoor living', 'Golf cart'], avoidList: ['No pool', 'Poor AC', 'HOA restrictions'], targetGuest: 'Snowbirds, golf groups, families' }
  },
  AR: {
    id: 'AR',
    name: 'Arkansas',
    appreciation: { oneYear: 4.2, fiveYear: 48.6, medianValue: 219825 },
    mortgageRates: { thirtyYear: 6.15, fifteenYear: 5.42, trend: 'down' },
    migration: { netMigration: 87377, migrationRate: 29.01, topInbound: ['TX', 'CA', 'OK'], topOutbound: ['TX', 'MO', 'OK'] },
    rental: { shortTermMonthly: 1650, longTermMonthly: 920, occupancyRate: 55, avgADR: 135 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 2,
      salesTax: 6.5,
      localTaxRange: '0-5%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-10',
      notes: 'Generally STR-friendly. Hot Springs and Eureka Springs have specific regulations.'
    },
    marketScore: { overall: 74, demand: 65, affordability: 90, regulation: 82, seasonality: 58, verdict: 'buy' },
    demandDrivers: { tourism: ['Hot Springs National Park', 'Ozark Mountains'], attractions: ['Buffalo River', 'Crystal Bridges Museum'], events: ['Bikes Blues BBQ'], corporateDemand: false, seasonalPeak: 'May-Oct', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '3BR/2BA cabin', designStyle: 'Rustic modern', mustHaveAmenities: ['Hot tub', 'Fire pit', 'Mountain views'], avoidList: ['Steep driveways', 'No cell service'], targetGuest: 'Couples, outdoor enthusiasts' }
  },
  CA: {
    id: 'CA',
    name: 'California',
    appreciation: { oneYear: 3.5, fiveYear: 38.2, medianValue: 809227 },
    mortgageRates: { thirtyYear: 6.02, fifteenYear: 5.28, trend: 'down' },
    migration: { netMigration: -530886, migrationRate: -13.42, topInbound: ['NY', 'IL', 'TX'], topOutbound: ['TX', 'AZ', 'NV'] },
    rental: { shortTermMonthly: 3850, longTermMonthly: 2104, occupancyRate: 68, avgADR: 285 },
    strRegulation: {
      status: 'restricted',
      permitRequired: true,
      primaryResidenceOnly: true,
      maxDaysPerYear: 90,
      occupancyTax: 12,
      salesTax: 7.25,
      localTaxRange: '0-15%',
      enforcementLevel: 'strict',
      lastUpdated: '2025-01',
      notes: 'Heavy local regulation. SF: 90-day cap. LA: 120-day cap, primary residence only. Santa Monica bans whole-home STRs.'
    },
    marketScore: { overall: 55, demand: 92, affordability: 20, regulation: 35, seasonality: 75, verdict: 'caution' },
    demandDrivers: { tourism: ['Disneyland', 'Hollywood', 'Wine Country'], attractions: ['Beaches', 'National Parks', 'Tech hubs'], events: ['Coachella', 'Comic-Con'], corporateDemand: true, seasonalPeak: 'Jun-Sep', seasonalLow: 'Jan-Feb' },
    playbook: { idealBedBath: '2BR/2BA', designStyle: 'California modern', mustHaveAmenities: ['Outdoor space', 'Parking', 'Fast WiFi'], avoidList: ['HOA restrictions', 'Rent control areas', 'No parking'], targetGuest: 'Business travelers, tourists, families' }
  },
  CO: {
    id: 'CO',
    name: 'Colorado',
    appreciation: { oneYear: 0.6, fiveYear: 35.4, medianValue: 567724 },
    mortgageRates: { thirtyYear: 6.05, fifteenYear: 5.32, trend: 'down' },
    migration: { netMigration: 114234, migrationRate: 19.78, topInbound: ['CA', 'TX', 'IL'], topOutbound: ['TX', 'AZ', 'FL'] },
    rental: { shortTermMonthly: 3200, longTermMonthly: 1750, occupancyRate: 62, avgADR: 245 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 10.25,
      salesTax: 2.9,
      localTaxRange: '2-8%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Denver: primary residence only, 180-day cap. Mountain towns vary widely. Breckenridge requires license.'
    },
    marketScore: { overall: 68, demand: 88, affordability: 40, regulation: 55, seasonality: 85, verdict: 'hold' },
    demandDrivers: { tourism: ['Ski resorts', 'Rocky Mountain NP'], attractions: ['Denver', 'Craft breweries'], events: ['X Games', 'Great American Beer Festival'], corporateDemand: true, seasonalPeak: 'Dec-Mar, Jun-Aug', seasonalLow: 'Apr-May, Oct-Nov' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Mountain modern', mustHaveAmenities: ['Hot tub', 'Ski storage', 'Fireplace', 'Garage'], avoidList: ['No hot tub', 'Far from lifts', 'Steep access'], targetGuest: 'Ski groups, families, outdoor enthusiasts' }
  },
  CT: {
    id: 'CT',
    name: 'Connecticut',
    appreciation: { oneYear: 6.5, fiveYear: 45.8, medianValue: 465586 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 70954, migrationRate: 19.67, topInbound: ['NY', 'MA', 'NJ'], topOutbound: ['FL', 'NC', 'SC'] },
    rental: { shortTermMonthly: 2450, longTermMonthly: 1520, occupancyRate: 60, avgADR: 195 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 15,
      salesTax: 6.35,
      localTaxRange: '0-3%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'State lodging tax 15%. Local regulations vary. Coastal towns popular for summer rentals.'
    },
    marketScore: { overall: 62, demand: 65, affordability: 50, regulation: 65, seasonality: 68, verdict: 'hold' },
    demandDrivers: { tourism: ['Coastal beaches', 'Fall foliage'], attractions: ['Mystic Seaport', 'Yale University'], events: ['Jazz festivals'], corporateDemand: true, seasonalPeak: 'Jun-Sep', seasonalLow: 'Jan-Mar' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'New England coastal', mustHaveAmenities: ['Beach access', 'Outdoor shower', 'Kayaks'], avoidList: ['No water views', 'Far from attractions'], targetGuest: 'NYC weekenders, families' }
  },
  DE: {
    id: 'DE',
    name: 'Delaware',
    appreciation: { oneYear: 5.2, fiveYear: 51.3, medianValue: 406448 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 64105, migrationRate: 64.76, topInbound: ['PA', 'NJ', 'MD'], topOutbound: ['FL', 'PA', 'NC'] },
    rental: { shortTermMonthly: 2100, longTermMonthly: 1380, occupancyRate: 58, avgADR: 175 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 8,
      salesTax: 0,
      localTaxRange: '0-3%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-10',
      notes: 'No state sales tax. Beach towns like Rehoboth have rental licensing. Generally STR-friendly.'
    },
    marketScore: { overall: 70, demand: 72, affordability: 55, regulation: 78, seasonality: 72, verdict: 'buy' },
    demandDrivers: { tourism: ['Rehoboth Beach', 'Dewey Beach'], attractions: ['Tax-free shopping', 'Coastal trails'], events: ['Sea Witch Festival'], corporateDemand: false, seasonalPeak: 'Jun-Aug', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Beach cottage', mustHaveAmenities: ['Beach chairs', 'Outdoor shower', 'Bikes'], avoidList: ['No AC', 'Far from beach'], targetGuest: 'DC/Philly weekenders, families' }
  },
  FL: {
    id: 'FL',
    name: 'Florida',
    appreciation: { oneYear: 0.0, fiveYear: 58.5, medianValue: 405280 },
    mortgageRates: { thirtyYear: 6.00, fifteenYear: 5.25, trend: 'down' },
    migration: { netMigration: 1931865, migrationRate: 89.69, topInbound: ['NY', 'NJ', 'CA'], topOutbound: ['GA', 'TX', 'NC'] },
    rental: { shortTermMonthly: 3100, longTermMonthly: 1680, occupancyRate: 72, avgADR: 225 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 6,
      localTaxRange: '2-6%',
      enforcementLevel: 'moderate',
      lastUpdated: '2025-01',
      notes: 'State law prohibits local STR bans. State registration required. Miami Beach has strict rules. Most areas STR-friendly.'
    },
    marketScore: { overall: 85, demand: 95, affordability: 60, regulation: 88, seasonality: 92, verdict: 'strong-buy' },
    demandDrivers: { tourism: ['Disney World', 'Miami Beach', 'Keys'], attractions: ['Theme parks', 'Beaches', 'Golf'], events: ['Art Basel', 'Ultra Music Festival', 'Spring Break'], corporateDemand: true, seasonalPeak: 'Dec-Apr', seasonalLow: 'Sep-Oct' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Tropical modern', mustHaveAmenities: ['Pool', 'Game room', 'Beach gear'], avoidList: ['No pool', 'Flood zone', 'HOA bans'], targetGuest: 'Families, snowbirds, tourists' }
  },
  GA: {
    id: 'GA',
    name: 'Georgia',
    appreciation: { oneYear: 2.8, fiveYear: 52.1, medianValue: 359439 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 475697, migrationRate: 44.85, topInbound: ['FL', 'NY', 'CA'], topOutbound: ['FL', 'TX', 'NC'] },
    rental: { shortTermMonthly: 2400, longTermMonthly: 1420, occupancyRate: 62, avgADR: 175 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5,
      salesTax: 4,
      localTaxRange: '3-8%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Atlanta requires registration. Savannah has specific STR zones. Mountain areas generally permissive.'
    },
    marketScore: { overall: 76, demand: 78, affordability: 70, regulation: 72, seasonality: 82, verdict: 'buy' },
    demandDrivers: { tourism: ['Savannah historic district', 'Blue Ridge Mountains'], attractions: ['Atlanta', 'Georgia Aquarium'], events: ['Masters Tournament'], corporateDemand: true, seasonalPeak: 'Mar-May, Sep-Nov', seasonalLow: 'Jan-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Southern charm', mustHaveAmenities: ['Porch', 'Hot tub', 'Fire pit'], avoidList: ['No outdoor space', 'HOA restrictions'], targetGuest: 'Couples, families, business travelers' }
  },
  HI: {
    id: 'HI',
    name: 'Hawaii',
    appreciation: { oneYear: 4.8, fiveYear: 35.2, medianValue: 1015000 },
    mortgageRates: { thirtyYear: 6.15, fifteenYear: 5.42, trend: 'stable' },
    migration: { netMigration: -35000, migrationRate: -24.5, topInbound: ['CA', 'WA', 'TX'], topOutbound: ['CA', 'NV', 'WA'] },
    rental: { shortTermMonthly: 4500, longTermMonthly: 2200, occupancyRate: 75, avgADR: 350 },
    strRegulation: {
      status: 'restricted',
      permitRequired: true,
      primaryResidenceOnly: true,
      maxDaysPerYear: 90,
      occupancyTax: 10.25,
      salesTax: 4.5,
      localTaxRange: '3-4.5%',
      enforcementLevel: 'strict',
      lastUpdated: '2025-01',
      notes: 'Very strict regulations. Many areas require 30-day minimum. Honolulu banned most STRs. TAT + GET taxes high.'
    },
    marketScore: { overall: 48, demand: 98, affordability: 15, regulation: 25, seasonality: 55, verdict: 'caution' },
    demandDrivers: { tourism: ['Beaches', 'Volcanoes', 'Luaus'], attractions: ['Pearl Harbor', 'Na Pali Coast'], events: ['Ironman', 'Merrie Monarch'], corporateDemand: false, seasonalPeak: 'Dec-Apr, Jun-Aug', seasonalLow: 'Sep-Nov' },
    playbook: { idealBedBath: '2BR/2BA condo', designStyle: 'Hawaiian tropical', mustHaveAmenities: ['Ocean view', 'Lanai', 'Beach gear'], avoidList: ['No legal permit', 'Condo rules', 'Far from beach'], targetGuest: 'Honeymooners, families, luxury travelers' }
  },
  ID: {
    id: 'ID',
    name: 'Idaho',
    appreciation: { oneYear: 1.2, fiveYear: 62.8, medianValue: 468952 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 95000, migrationRate: 50.2, topInbound: ['CA', 'WA', 'OR'], topOutbound: ['WA', 'UT', 'AZ'] },
    rental: { shortTermMonthly: 2800, longTermMonthly: 1450, occupancyRate: 58, avgADR: 210 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 8,
      salesTax: 6,
      localTaxRange: '0-3%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-11',
      notes: 'Generally STR-friendly. McCall and Sun Valley have specific regulations. Growing market.'
    },
    marketScore: { overall: 72, demand: 75, affordability: 55, regulation: 82, seasonality: 75, verdict: 'buy' },
    demandDrivers: { tourism: ['Sun Valley skiing', 'Coeur d\'Alene Lake'], attractions: ['Boise', 'Sawtooth Mountains'], events: ['Treefort Music Fest'], corporateDemand: false, seasonalPeak: 'Dec-Mar, Jun-Sep', seasonalLow: 'Apr-May, Oct-Nov' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Mountain lodge', mustHaveAmenities: ['Hot tub', 'Ski storage', 'Fire pit'], avoidList: ['No winter access', 'Far from activities'], targetGuest: 'Ski families, outdoor enthusiasts' }
  },
  IL: {
    id: 'IL',
    name: 'Illinois',
    appreciation: { oneYear: 5.8, fiveYear: 32.4, medianValue: 285000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: -340000, migrationRate: -26.8, topInbound: ['CA', 'NY', 'TX'], topOutbound: ['IN', 'WI', 'FL'] },
    rental: { shortTermMonthly: 2200, longTermMonthly: 1350, occupancyRate: 58, avgADR: 165 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 4.5,
      salesTax: 6.25,
      localTaxRange: '0-17%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Chicago has strict registration and licensing. Suburban areas more relaxed. High combined taxes in Chicago.'
    },
    marketScore: { overall: 58, demand: 72, affordability: 68, regulation: 48, seasonality: 45, verdict: 'hold' },
    demandDrivers: { tourism: ['Chicago architecture', 'Magnificent Mile'], attractions: ['Museums', 'Sports venues'], events: ['Lollapalooza', 'Chicago Marathon'], corporateDemand: true, seasonalPeak: 'May-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '2BR/1BA', designStyle: 'Urban modern', mustHaveAmenities: ['Parking', 'Fast WiFi', 'Washer/dryer'], avoidList: ['No parking', 'Far from transit'], targetGuest: 'Business travelers, tourists, event-goers' }
  },
  IN: {
    id: 'IN',
    name: 'Indiana',
    appreciation: { oneYear: 5.2, fiveYear: 48.5, medianValue: 245000 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 45000, migrationRate: 6.7, topInbound: ['IL', 'CA', 'OH'], topOutbound: ['FL', 'TX', 'AZ'] },
    rental: { shortTermMonthly: 1650, longTermMonthly: 1050, occupancyRate: 52, avgADR: 125 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 7,
      localTaxRange: '0-6%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-10',
      notes: 'State preempts most local STR bans. Very STR-friendly environment. Indianapolis has some regulations.'
    },
    marketScore: { overall: 70, demand: 55, affordability: 88, regulation: 90, seasonality: 48, verdict: 'buy' },
    demandDrivers: { tourism: ['Indianapolis Motor Speedway', 'Brown County'], attractions: ['Indianapolis', 'Amish Country'], events: ['Indy 500', 'Gen Con'], corporateDemand: true, seasonalPeak: 'May-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Midwestern comfort', mustHaveAmenities: ['Parking', 'Game room', 'Outdoor space'], avoidList: ['No parking', 'High crime areas'], targetGuest: 'Event travelers, families, business' }
  },
  IA: {
    id: 'IA',
    name: 'Iowa',
    appreciation: { oneYear: 4.5, fiveYear: 35.2, medianValue: 215000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: -15000, migrationRate: -4.8, topInbound: ['IL', 'NE', 'MN'], topOutbound: ['TX', 'AZ', 'FL'] },
    rental: { shortTermMonthly: 1400, longTermMonthly: 950, occupancyRate: 48, avgADR: 110 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5,
      salesTax: 6,
      localTaxRange: '0-7%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-09',
      notes: 'Generally permissive. Des Moines and Iowa City have some registration requirements.'
    },
    marketScore: { overall: 58, demand: 42, affordability: 92, regulation: 85, seasonality: 35, verdict: 'hold' },
    demandDrivers: { tourism: ['Field of Dreams', 'Bridges of Madison County'], attractions: ['Des Moines', 'State Fair'], events: ['Iowa State Fair', 'RAGBRAI'], corporateDemand: false, seasonalPeak: 'Jun-Aug', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '2BR/1BA', designStyle: 'Farmhouse modern', mustHaveAmenities: ['Parking', 'Outdoor space', 'Grill'], avoidList: ['Remote locations', 'No AC'], targetGuest: 'Event travelers, families' }
  },
  KS: {
    id: 'KS',
    name: 'Kansas',
    appreciation: { oneYear: 4.8, fiveYear: 38.5, medianValue: 225000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: -8000, migrationRate: -2.8, topInbound: ['TX', 'CA', 'MO'], topOutbound: ['TX', 'MO', 'CO'] },
    rental: { shortTermMonthly: 1500, longTermMonthly: 1000, occupancyRate: 50, avgADR: 115 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6.5,
      salesTax: 6.5,
      localTaxRange: '0-4%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-09',
      notes: 'Very STR-friendly. Minimal regulations. Kansas City area has some requirements.'
    },
    marketScore: { overall: 55, demand: 40, affordability: 90, regulation: 88, seasonality: 38, verdict: 'hold' },
    demandDrivers: { tourism: ['Dodge City history', 'Flint Hills'], attractions: ['Kansas City BBQ', 'Tallgrass Prairie'], events: ['Kansas State Fair'], corporateDemand: false, seasonalPeak: 'May-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '2BR/1BA', designStyle: 'Prairie modern', mustHaveAmenities: ['Parking', 'Outdoor space', 'Grill'], avoidList: ['Remote locations'], targetGuest: 'Road trippers, event travelers' }
  },
  KY: {
    id: 'KY',
    name: 'Kentucky',
    appreciation: { oneYear: 5.5, fiveYear: 52.8, medianValue: 235000 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 65000, migrationRate: 14.5, topInbound: ['OH', 'IN', 'FL'], topOutbound: ['TN', 'IN', 'OH'] },
    rental: { shortTermMonthly: 1750, longTermMonthly: 1050, occupancyRate: 55, avgADR: 135 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 6,
      localTaxRange: '0-8%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-11',
      notes: 'Generally STR-friendly. Louisville has registration requirements. Bourbon Trail drives tourism.'
    },
    marketScore: { overall: 72, demand: 68, affordability: 85, regulation: 78, seasonality: 58, verdict: 'buy' },
    demandDrivers: { tourism: ['Bourbon Trail', 'Kentucky Derby'], attractions: ['Louisville', 'Mammoth Cave'], events: ['Kentucky Derby', 'Bourbon festivals'], corporateDemand: false, seasonalPeak: 'Apr-Oct', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Southern bourbon', mustHaveAmenities: ['Bourbon bar', 'Porch', 'Hot tub'], avoidList: ['Far from distilleries', 'No character'], targetGuest: 'Bourbon tourists, Derby visitors, couples' }
  },
  LA: {
    id: 'LA',
    name: 'Louisiana',
    appreciation: { oneYear: 2.8, fiveYear: 28.5, medianValue: 225000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: -45000, migrationRate: -9.8, topInbound: ['TX', 'CA', 'FL'], topOutbound: ['TX', 'FL', 'GA'] },
    rental: { shortTermMonthly: 2200, longTermMonthly: 1100, occupancyRate: 62, avgADR: 175 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 13,
      salesTax: 4.45,
      localTaxRange: '2-7%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'New Orleans has strict STR regulations with caps and zones. Other areas more relaxed. High occupancy taxes.'
    },
    marketScore: { overall: 68, demand: 85, affordability: 72, regulation: 52, seasonality: 65, verdict: 'hold' },
    demandDrivers: { tourism: ['New Orleans', 'French Quarter'], attractions: ['Bourbon Street', 'Plantations'], events: ['Mardi Gras', 'Jazz Fest', 'Essence Festival'], corporateDemand: true, seasonalPeak: 'Feb-May, Oct-Dec', seasonalLow: 'Jun-Aug' },
    playbook: { idealBedBath: '2BR/2BA', designStyle: 'NOLA historic', mustHaveAmenities: ['Balcony', 'AC', 'Walking distance'], avoidList: ['Flood zones', 'No permit zone', 'No parking'], targetGuest: 'Festival-goers, couples, tourists' }
  },
  ME: {
    id: 'ME',
    name: 'Maine',
    appreciation: { oneYear: 6.2, fiveYear: 58.5, medianValue: 415000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 28000, migrationRate: 20.5, topInbound: ['MA', 'NH', 'NY'], topOutbound: ['FL', 'NH', 'NC'] },
    rental: { shortTermMonthly: 2400, longTermMonthly: 1350, occupancyRate: 58, avgADR: 195 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 9,
      salesTax: 5.5,
      localTaxRange: '0-1%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'Portland has strict STR regulations. Coastal towns vary. Strong seasonal demand.'
    },
    marketScore: { overall: 70, demand: 75, affordability: 52, regulation: 68, seasonality: 82, verdict: 'buy' },
    demandDrivers: { tourism: ['Acadia National Park', 'Coastal towns'], attractions: ['Portland food scene', 'Lighthouses'], events: ['Lobster festivals'], corporateDemand: false, seasonalPeak: 'Jun-Oct', seasonalLow: 'Nov-Apr' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Coastal New England', mustHaveAmenities: ['Water views', 'Kayaks', 'Fire pit'], avoidList: ['No water access', 'Too remote'], targetGuest: 'Families, couples, nature lovers' }
  },
  MD: {
    id: 'MD',
    name: 'Maryland',
    appreciation: { oneYear: 5.8, fiveYear: 42.5, medianValue: 445000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: -25000, migrationRate: -4.1, topInbound: ['VA', 'PA', 'NY'], topOutbound: ['VA', 'FL', 'PA'] },
    rental: { shortTermMonthly: 2300, longTermMonthly: 1650, occupancyRate: 60, avgADR: 185 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 6,
      localTaxRange: '0-5%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'Ocean City has specific STR regulations. Baltimore requires registration. DC suburbs regulated.'
    },
    marketScore: { overall: 65, demand: 70, affordability: 48, regulation: 65, seasonality: 75, verdict: 'hold' },
    demandDrivers: { tourism: ['Ocean City beaches', 'Baltimore Inner Harbor'], attractions: ['Annapolis', 'Chesapeake Bay'], events: ['Preakness Stakes'], corporateDemand: true, seasonalPeak: 'May-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Coastal mid-Atlantic', mustHaveAmenities: ['Beach access', 'Pool', 'Outdoor shower'], avoidList: ['No ocean view', 'Far from boardwalk'], targetGuest: 'DC families, beach vacationers' }
  },
  MA: {
    id: 'MA',
    name: 'Massachusetts',
    appreciation: { oneYear: 5.5, fiveYear: 38.2, medianValue: 635000 },
    mortgageRates: { thirtyYear: 6.05, fifteenYear: 5.32, trend: 'down' },
    migration: { netMigration: -85000, migrationRate: -12.3, topInbound: ['NY', 'CT', 'CA'], topOutbound: ['NH', 'FL', 'RI'] },
    rental: { shortTermMonthly: 3200, longTermMonthly: 2100, occupancyRate: 65, avgADR: 245 },
    strRegulation: {
      status: 'restricted',
      permitRequired: true,
      primaryResidenceOnly: true,
      maxDaysPerYear: null,
      occupancyTax: 5.7,
      salesTax: 6.25,
      localTaxRange: '0-6%',
      enforcementLevel: 'strict',
      lastUpdated: '2024-12',
      notes: 'Boston has strict regulations. Cape Cod towns vary widely. State requires registration and insurance.'
    },
    marketScore: { overall: 58, demand: 82, affordability: 32, regulation: 45, seasonality: 72, verdict: 'caution' },
    demandDrivers: { tourism: ['Cape Cod', 'Boston history'], attractions: ['Freedom Trail', 'Martha\'s Vineyard'], events: ['Boston Marathon', 'Head of Charles'], corporateDemand: true, seasonalPeak: 'Jun-Sep', seasonalLow: 'Jan-Mar' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Cape Cod classic', mustHaveAmenities: ['Beach access', 'Outdoor shower', 'Bikes'], avoidList: ['No beach proximity', 'HOA restrictions'], targetGuest: 'Families, couples, history buffs' }
  },
  MI: {
    id: 'MI',
    name: 'Michigan',
    appreciation: { oneYear: 5.2, fiveYear: 48.5, medianValue: 265000 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 25000, migrationRate: 2.5, topInbound: ['IL', 'CA', 'OH'], topOutbound: ['FL', 'TX', 'AZ'] },
    rental: { shortTermMonthly: 2100, longTermMonthly: 1200, occupancyRate: 55, avgADR: 165 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 6,
      localTaxRange: '0-5%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'Varies by township. Traverse City area has regulations. Lake communities popular for STRs.'
    },
    marketScore: { overall: 68, demand: 65, affordability: 72, regulation: 70, seasonality: 65, verdict: 'buy' },
    demandDrivers: { tourism: ['Great Lakes beaches', 'Traverse City'], attractions: ['Mackinac Island', 'Detroit'], events: ['Cherry Festival', 'Auto shows'], corporateDemand: false, seasonalPeak: 'Jun-Sep', seasonalLow: 'Dec-Mar' },
    playbook: { idealBedBath: '4BR/2BA', designStyle: 'Lake house modern', mustHaveAmenities: ['Lake access', 'Dock', 'Kayaks', 'Fire pit'], avoidList: ['No water access', 'Poor winter access'], targetGuest: 'Families, lake lovers, Midwest travelers' }
  },
  MN: {
    id: 'MN',
    name: 'Minnesota',
    appreciation: { oneYear: 3.8, fiveYear: 35.2, medianValue: 345000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: -18000, migrationRate: -3.2, topInbound: ['WI', 'ND', 'IL'], topOutbound: ['FL', 'AZ', 'TX'] },
    rental: { shortTermMonthly: 2000, longTermMonthly: 1350, occupancyRate: 52, avgADR: 155 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6.875,
      salesTax: 6.875,
      localTaxRange: '0-3%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-10',
      notes: 'Minneapolis has STR regulations. Lake communities vary. Duluth area growing market.'
    },
    marketScore: { overall: 62, demand: 58, affordability: 65, regulation: 68, seasonality: 58, verdict: 'hold' },
    demandDrivers: { tourism: ['10,000 Lakes', 'Boundary Waters'], attractions: ['Minneapolis', 'Mall of America'], events: ['State Fair', 'Winter Carnival'], corporateDemand: true, seasonalPeak: 'Jun-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '4BR/2BA', designStyle: 'Lake cabin modern', mustHaveAmenities: ['Lake access', 'Dock', 'Fire pit', 'Sauna'], avoidList: ['No lake access', 'Poor winter access'], targetGuest: 'Families, outdoor enthusiasts' }
  },
  MS: {
    id: 'MS',
    name: 'Mississippi',
    appreciation: { oneYear: 4.2, fiveYear: 42.5, medianValue: 185000 },
    mortgageRates: { thirtyYear: 6.15, fifteenYear: 5.42, trend: 'down' },
    migration: { netMigration: -28000, migrationRate: -9.5, topInbound: ['TX', 'LA', 'TN'], topOutbound: ['TX', 'TN', 'FL'] },
    rental: { shortTermMonthly: 1400, longTermMonthly: 900, occupancyRate: 48, avgADR: 110 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 3,
      salesTax: 7,
      localTaxRange: '0-3%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-09',
      notes: 'Very STR-friendly. Gulf Coast has some regulations. Low barriers to entry.'
    },
    marketScore: { overall: 58, demand: 45, affordability: 95, regulation: 88, seasonality: 45, verdict: 'hold' },
    demandDrivers: { tourism: ['Gulf Coast beaches', 'Natchez history'], attractions: ['Biloxi casinos', 'Blues Trail'], events: ['Mardi Gras'], corporateDemand: false, seasonalPeak: 'Mar-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Southern coastal', mustHaveAmenities: ['Pool', 'Outdoor space', 'Beach gear'], avoidList: ['Flood zones', 'Far from attractions'], targetGuest: 'Families, casino visitors, beach-goers' }
  },
  MO: {
    id: 'MO',
    name: 'Missouri',
    appreciation: { oneYear: 4.5, fiveYear: 42.8, medianValue: 255000 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 35000, migrationRate: 5.7, topInbound: ['IL', 'KS', 'CA'], topOutbound: ['TX', 'FL', 'AZ'] },
    rental: { shortTermMonthly: 1800, longTermMonthly: 1100, occupancyRate: 55, avgADR: 140 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 4,
      salesTax: 4.225,
      localTaxRange: '1-8%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-11',
      notes: 'Generally STR-friendly. Branson and Lake of the Ozarks are major STR markets. KC and STL have some regulations.'
    },
    marketScore: { overall: 72, demand: 70, affordability: 82, regulation: 78, seasonality: 58, verdict: 'buy' },
    demandDrivers: { tourism: ['Branson shows', 'Lake of the Ozarks'], attractions: ['St. Louis Arch', 'Kansas City BBQ'], events: ['Country music shows'], corporateDemand: false, seasonalPeak: 'May-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Lake house', mustHaveAmenities: ['Lake access', 'Dock', 'Hot tub', 'Game room'], avoidList: ['No water access', 'Steep terrain'], targetGuest: 'Families, lake lovers, show-goers' }
  },
  MT: {
    id: 'MT',
    name: 'Montana',
    appreciation: { oneYear: 2.5, fiveYear: 58.5, medianValue: 485000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: 32000, migrationRate: 29.5, topInbound: ['WA', 'CA', 'CO'], topOutbound: ['WA', 'ID', 'AZ'] },
    rental: { shortTermMonthly: 2800, longTermMonthly: 1400, occupancyRate: 58, avgADR: 215 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 4,
      salesTax: 0,
      localTaxRange: '3-4%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'No state sales tax. Bozeman and Big Sky have specific regulations. Growing market with increasing scrutiny.'
    },
    marketScore: { overall: 70, demand: 82, affordability: 45, regulation: 72, seasonality: 78, verdict: 'buy' },
    demandDrivers: { tourism: ['Glacier National Park', 'Yellowstone'], attractions: ['Big Sky skiing', 'Fly fishing'], events: ['Rodeos', 'Music festivals'], corporateDemand: false, seasonalPeak: 'Jun-Sep, Dec-Mar', seasonalLow: 'Apr-May, Oct-Nov' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Mountain lodge', mustHaveAmenities: ['Hot tub', 'Fire pit', 'Mountain views', 'Ski storage'], avoidList: ['No views', 'Poor winter access'], targetGuest: 'Outdoor enthusiasts, ski families, nature lovers' }
  },
  NE: {
    id: 'NE',
    name: 'Nebraska',
    appreciation: { oneYear: 5.2, fiveYear: 38.5, medianValue: 245000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: 5000, migrationRate: 2.6, topInbound: ['IA', 'CA', 'CO'], topOutbound: ['TX', 'CO', 'FL'] },
    rental: { shortTermMonthly: 1500, longTermMonthly: 1000, occupancyRate: 48, avgADR: 115 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5.5,
      salesTax: 5.5,
      localTaxRange: '0-4%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-09',
      notes: 'Very STR-friendly. Omaha and Lincoln have minimal regulations. Low demand market.'
    },
    marketScore: { overall: 52, demand: 38, affordability: 88, regulation: 90, seasonality: 35, verdict: 'hold' },
    demandDrivers: { tourism: ['College football', 'Omaha Zoo'], attractions: ['Old Market Omaha', 'Sandhills'], events: ['College World Series', 'Berkshire meeting'], corporateDemand: true, seasonalPeak: 'May-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '2BR/1BA', designStyle: 'Modern Midwest', mustHaveAmenities: ['Parking', 'Fast WiFi', 'Washer/dryer'], avoidList: ['Far from downtown'], targetGuest: 'Business travelers, event visitors' }
  },
  NV: {
    id: 'NV',
    name: 'Nevada',
    appreciation: { oneYear: 3.2, fiveYear: 48.5, medianValue: 465000 },
    mortgageRates: { thirtyYear: 6.05, fifteenYear: 5.32, trend: 'down' },
    migration: { netMigration: 185000, migrationRate: 59.2, topInbound: ['CA', 'AZ', 'WA'], topOutbound: ['CA', 'AZ', 'TX'] },
    rental: { shortTermMonthly: 2800, longTermMonthly: 1550, occupancyRate: 65, avgADR: 210 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 13.38,
      salesTax: 6.85,
      localTaxRange: '0-3%',
      enforcementLevel: 'strict',
      lastUpdated: '2025-01',
      notes: 'Las Vegas bans STRs in most residential areas. Reno permits with license. Lake Tahoe has strict caps. High taxes.'
    },
    marketScore: { overall: 62, demand: 88, affordability: 50, regulation: 42, seasonality: 68, verdict: 'hold' },
    demandDrivers: { tourism: ['Las Vegas Strip', 'Lake Tahoe'], attractions: ['Casinos', 'Shows', 'Skiing'], events: ['CES', 'EDC', 'F1 Grand Prix'], corporateDemand: true, seasonalPeak: 'Mar-May, Sep-Nov', seasonalLow: 'Jul-Aug' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Vegas glam or Tahoe lodge', mustHaveAmenities: ['Pool', 'Hot tub', 'Game room'], avoidList: ['Residential Vegas', 'No permit areas'], targetGuest: 'Bachelor parties, families, ski groups' }
  },
  NH: {
    id: 'NH',
    name: 'New Hampshire',
    appreciation: { oneYear: 6.8, fiveYear: 55.2, medianValue: 495000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 22000, migrationRate: 16.2, topInbound: ['MA', 'NY', 'CT'], topOutbound: ['FL', 'ME', 'NC'] },
    rental: { shortTermMonthly: 2400, longTermMonthly: 1550, occupancyRate: 58, avgADR: 195 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 8.5,
      salesTax: 0,
      localTaxRange: '0%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-10',
      notes: 'No state sales tax. Rooms and meals tax applies. Generally STR-friendly. Lake regions popular.'
    },
    marketScore: { overall: 72, demand: 72, affordability: 48, regulation: 82, seasonality: 82, verdict: 'buy' },
    demandDrivers: { tourism: ['White Mountains', 'Lakes Region'], attractions: ['Skiing', 'Fall foliage', 'Lake Winnipesaukee'], events: ['Laconia Bike Week'], corporateDemand: false, seasonalPeak: 'Jun-Oct, Dec-Mar', seasonalLow: 'Apr-May, Nov' },
    playbook: { idealBedBath: '4BR/2BA', designStyle: 'New England cabin', mustHaveAmenities: ['Lake access', 'Hot tub', 'Fire pit', 'Ski storage'], avoidList: ['No water/mountain access', 'Poor winter roads'], targetGuest: 'Families, skiers, leaf peepers' }
  },
  NJ: {
    id: 'NJ',
    name: 'New Jersey',
    appreciation: { oneYear: 7.2, fiveYear: 48.5, medianValue: 535000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: -95000, migrationRate: -10.4, topInbound: ['NY', 'PA', 'CA'], topOutbound: ['FL', 'PA', 'NC'] },
    rental: { shortTermMonthly: 3200, longTermMonthly: 1850, occupancyRate: 62, avgADR: 255 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5,
      salesTax: 6.625,
      localTaxRange: '0-3%',
      enforcementLevel: 'moderate',
      lastUpdated: '2025-01',
      notes: 'Shore towns have specific STR regulations. Jersey City has strict rules. Beach communities vary widely.'
    },
    marketScore: { overall: 65, demand: 78, affordability: 38, regulation: 62, seasonality: 80, verdict: 'hold' },
    demandDrivers: { tourism: ['Jersey Shore', 'Atlantic City'], attractions: ['Beaches', 'Boardwalks', 'Casinos'], events: ['Beach concerts'], corporateDemand: true, seasonalPeak: 'Jun-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '4BR/2BA', designStyle: 'Shore house', mustHaveAmenities: ['Beach badges', 'Outdoor shower', 'Bikes', 'Parking'], avoidList: ['No beach access', 'No parking'], targetGuest: 'NYC/Philly families, beach vacationers' }
  },
  NM: {
    id: 'NM',
    name: 'New Mexico',
    appreciation: { oneYear: 4.5, fiveYear: 45.2, medianValue: 335000 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 42000, migrationRate: 20.1, topInbound: ['CA', 'TX', 'AZ'], topOutbound: ['TX', 'AZ', 'CO'] },
    rental: { shortTermMonthly: 2100, longTermMonthly: 1150, occupancyRate: 58, avgADR: 165 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5,
      salesTax: 5.125,
      localTaxRange: '1-4%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-11',
      notes: 'Generally STR-friendly. Santa Fe has registration requirements. Growing market with art tourism.'
    },
    marketScore: { overall: 72, demand: 72, affordability: 68, regulation: 78, seasonality: 68, verdict: 'buy' },
    demandDrivers: { tourism: ['Santa Fe arts', 'Taos skiing'], attractions: ['Carlsbad Caverns', 'White Sands'], events: ['Balloon Fiesta', 'Indian Market'], corporateDemand: false, seasonalPeak: 'May-Oct, Dec-Mar', seasonalLow: 'Nov, Apr' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Adobe Southwest', mustHaveAmenities: ['Hot tub', 'Kiva fireplace', 'Mountain views'], avoidList: ['No character', 'Far from plaza'], targetGuest: 'Art lovers, skiers, nature enthusiasts' }
  },
  NY: {
    id: 'NY',
    name: 'New York',
    appreciation: { oneYear: 5.5, fiveYear: 35.8, medianValue: 485000 },
    mortgageRates: { thirtyYear: 6.05, fifteenYear: 5.32, trend: 'down' },
    migration: { netMigration: -580000, migrationRate: -29.2, topInbound: ['NJ', 'CA', 'FL'], topOutbound: ['FL', 'NJ', 'PA'] },
    rental: { shortTermMonthly: 3500, longTermMonthly: 1950, occupancyRate: 68, avgADR: 275 },
    strRegulation: {
      status: 'restricted',
      permitRequired: true,
      primaryResidenceOnly: true,
      maxDaysPerYear: null,
      occupancyTax: 5.875,
      salesTax: 4,
      localTaxRange: '4-8%',
      enforcementLevel: 'strict',
      lastUpdated: '2025-01',
      notes: 'NYC: Illegal to rent entire apartments <30 days unless host present. Upstate more permissive. High enforcement in NYC.'
    },
    marketScore: { overall: 52, demand: 95, affordability: 25, regulation: 28, seasonality: 62, verdict: 'caution' },
    demandDrivers: { tourism: ['NYC', 'Catskills', 'Adirondacks'], attractions: ['Broadway', 'Museums', 'Mountains'], events: ['Fashion Week', 'New Year\'s Eve'], corporateDemand: true, seasonalPeak: 'Year-round (NYC), Jun-Oct (upstate)', seasonalLow: 'Jan-Feb' },
    playbook: { idealBedBath: '2BR/1BA (upstate: 4BR/2BA)', designStyle: 'Modern urban or rustic cabin', mustHaveAmenities: ['Fast WiFi', 'Workspace', 'Hot tub (upstate)'], avoidList: ['NYC whole-home', 'No permit'], targetGuest: 'Business travelers, tourists, weekend escapers' }
  },
  NC: {
    id: 'NC',
    name: 'North Carolina',
    appreciation: { oneYear: 3.8, fiveYear: 55.2, medianValue: 365000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 485000, migrationRate: 46.5, topInbound: ['FL', 'NY', 'VA'], topOutbound: ['FL', 'SC', 'TX'] },
    rental: { shortTermMonthly: 2400, longTermMonthly: 1380, occupancyRate: 62, avgADR: 185 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 4.75,
      localTaxRange: '2-6%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Varies by municipality. Asheville has registration. Beach towns have specific rules. Mountains generally permissive.'
    },
    marketScore: { overall: 78, demand: 82, affordability: 62, regulation: 72, seasonality: 92, verdict: 'buy' },
    demandDrivers: { tourism: ['Blue Ridge Parkway', 'Outer Banks'], attractions: ['Asheville', 'Charlotte', 'Beaches'], events: ['Biltmore events', 'Beach festivals'], corporateDemand: true, seasonalPeak: 'May-Oct', seasonalLow: 'Jan-Feb' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Mountain modern or coastal', mustHaveAmenities: ['Hot tub', 'Fire pit', 'Views or beach access'], avoidList: ['Steep driveways', 'No outdoor space'], targetGuest: 'Families, couples, outdoor enthusiasts' }
  },
  ND: {
    id: 'ND',
    name: 'North Dakota',
    appreciation: { oneYear: 3.2, fiveYear: 22.5, medianValue: 265000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: -5000, migrationRate: -6.5, topInbound: ['MN', 'MT', 'SD'], topOutbound: ['MN', 'TX', 'AZ'] },
    rental: { shortTermMonthly: 1400, longTermMonthly: 950, occupancyRate: 42, avgADR: 105 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5,
      salesTax: 5,
      localTaxRange: '0-3%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-08',
      notes: 'Very STR-friendly. Minimal regulations. Low demand market outside oil boom areas.'
    },
    marketScore: { overall: 42, demand: 28, affordability: 82, regulation: 92, seasonality: 25, verdict: 'avoid' },
    demandDrivers: { tourism: ['Theodore Roosevelt NP', 'Medora'], attractions: ['Badlands', 'Lewis & Clark Trail'], events: ['Medora Musical'], corporateDemand: true, seasonalPeak: 'Jun-Aug', seasonalLow: 'Nov-Mar' },
    playbook: { idealBedBath: '2BR/1BA', designStyle: 'Prairie functional', mustHaveAmenities: ['Parking', 'Heating', 'Fast WiFi'], avoidList: ['Remote locations', 'No heating'], targetGuest: 'Business travelers, road trippers' }
  },
  OH: {
    id: 'OH',
    name: 'Ohio',
    appreciation: { oneYear: 5.8, fiveYear: 48.5, medianValue: 245000 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: -45000, migrationRate: -3.9, topInbound: ['CA', 'NY', 'FL'], topOutbound: ['FL', 'TX', 'NC'] },
    rental: { shortTermMonthly: 1800, longTermMonthly: 1150, occupancyRate: 52, avgADR: 140 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 5.75,
      localTaxRange: '0-8%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'Columbus and Cleveland have registration requirements. Lake Erie communities popular. Hocking Hills growing market.'
    },
    marketScore: { overall: 65, demand: 58, affordability: 82, regulation: 68, seasonality: 52, verdict: 'hold' },
    demandDrivers: { tourism: ['Hocking Hills', 'Lake Erie Islands'], attractions: ['Rock Hall', 'Cedar Point'], events: ['Pro Football HOF'], corporateDemand: true, seasonalPeak: 'May-Oct', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '3BR/2BA cabin', designStyle: 'Rustic modern', mustHaveAmenities: ['Hot tub', 'Fire pit', 'Hiking access'], avoidList: ['No outdoor amenities', 'Far from attractions'], targetGuest: 'Couples, families, outdoor enthusiasts' }
  },
  OK: {
    id: 'OK',
    name: 'Oklahoma',
    appreciation: { oneYear: 4.2, fiveYear: 38.5, medianValue: 215000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: 45000, migrationRate: 11.4, topInbound: ['TX', 'CA', 'KS'], topOutbound: ['TX', 'AR', 'CO'] },
    rental: { shortTermMonthly: 1500, longTermMonthly: 950, occupancyRate: 50, avgADR: 115 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5.5,
      salesTax: 4.5,
      localTaxRange: '1-6%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-09',
      notes: 'Very STR-friendly. OKC and Tulsa have minimal regulations. Low barriers to entry.'
    },
    marketScore: { overall: 62, demand: 48, affordability: 92, regulation: 88, seasonality: 42, verdict: 'hold' },
    demandDrivers: { tourism: ['Route 66', 'Turner Falls'], attractions: ['OKC Memorial', 'Tulsa arts'], events: ['State Fair', 'Red Earth Festival'], corporateDemand: true, seasonalPeak: 'Apr-Oct', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Modern farmhouse', mustHaveAmenities: ['Parking', 'Outdoor space', 'Grill'], avoidList: ['Tornado alley concerns', 'No AC'], targetGuest: 'Business travelers, families, road trippers' }
  },
  OR: {
    id: 'OR',
    name: 'Oregon',
    appreciation: { oneYear: 0.8, fiveYear: 32.5, medianValue: 515000 },
    mortgageRates: { thirtyYear: 6.05, fifteenYear: 5.32, trend: 'down' },
    migration: { netMigration: 85000, migrationRate: 20.4, topInbound: ['CA', 'WA', 'ID'], topOutbound: ['WA', 'ID', 'TX'] },
    rental: { shortTermMonthly: 2600, longTermMonthly: 1550, occupancyRate: 60, avgADR: 195 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 1.8,
      salesTax: 0,
      localTaxRange: '6-11%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'No state sales tax. Portland has strict STR rules. Coastal towns and Bend have specific regulations.'
    },
    marketScore: { overall: 65, demand: 75, affordability: 45, regulation: 58, seasonality: 78, verdict: 'hold' },
    demandDrivers: { tourism: ['Crater Lake', 'Oregon Coast'], attractions: ['Portland', 'Wine country', 'Mt. Hood'], events: ['Portland festivals'], corporateDemand: true, seasonalPeak: 'Jun-Sep', seasonalLow: 'Nov-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Pacific Northwest modern', mustHaveAmenities: ['Hot tub', 'Fire pit', 'Outdoor space'], avoidList: ['Portland restrictions', 'No outdoor amenities'], targetGuest: 'Outdoor enthusiasts, wine lovers, families' }
  },
  PA: {
    id: 'PA',
    name: 'Pennsylvania',
    appreciation: { oneYear: 5.5, fiveYear: 42.8, medianValue: 295000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: -65000, migrationRate: -5.1, topInbound: ['NY', 'NJ', 'CA'], topOutbound: ['FL', 'NJ', 'NC'] },
    rental: { shortTermMonthly: 2100, longTermMonthly: 1350, occupancyRate: 55, avgADR: 165 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 6,
      localTaxRange: '0-7%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Philadelphia has registration requirements. Poconos popular STR market. Pittsburgh growing.'
    },
    marketScore: { overall: 68, demand: 68, affordability: 72, regulation: 65, seasonality: 68, verdict: 'buy' },
    demandDrivers: { tourism: ['Poconos', 'Philadelphia history'], attractions: ['Amish Country', 'Gettysburg'], events: ['Philly events', 'Ski season'], corporateDemand: true, seasonalPeak: 'Jun-Oct, Dec-Mar', seasonalLow: 'Nov, Apr' },
    playbook: { idealBedBath: '4BR/2BA', designStyle: 'Mountain cabin or historic', mustHaveAmenities: ['Hot tub', 'Fire pit', 'Game room'], avoidList: ['No amenities', 'Far from attractions'], targetGuest: 'NYC/Philly families, couples, skiers' }
  },
  RI: {
    id: 'RI',
    name: 'Rhode Island',
    appreciation: { oneYear: 7.5, fiveYear: 52.8, medianValue: 485000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 8000, migrationRate: 7.4, topInbound: ['MA', 'CT', 'NY'], topOutbound: ['FL', 'MA', 'NC'] },
    rental: { shortTermMonthly: 2800, longTermMonthly: 1650, occupancyRate: 60, avgADR: 225 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 7,
      localTaxRange: '0-1%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-10',
      notes: 'Newport has specific STR regulations. Coastal communities vary. Strong summer demand.'
    },
    marketScore: { overall: 65, demand: 72, affordability: 42, regulation: 65, seasonality: 78, verdict: 'hold' },
    demandDrivers: { tourism: ['Newport mansions', 'Beaches'], attractions: ['Block Island', 'Providence'], events: ['Newport Jazz Festival', 'Sailing events'], corporateDemand: false, seasonalPeak: 'Jun-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Coastal New England', mustHaveAmenities: ['Beach access', 'Outdoor space', 'Bikes'], avoidList: ['No water proximity', 'No parking'], targetGuest: 'Boston/NYC weekenders, families' }
  },
  SC: {
    id: 'SC',
    name: 'South Carolina',
    appreciation: { oneYear: 4.2, fiveYear: 58.5, medianValue: 325000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 385000, migrationRate: 75.2, topInbound: ['NC', 'FL', 'NY'], topOutbound: ['NC', 'FL', 'GA'] },
    rental: { shortTermMonthly: 2600, longTermMonthly: 1350, occupancyRate: 65, avgADR: 195 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 7,
      salesTax: 6,
      localTaxRange: '1-3%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Generally STR-friendly. Charleston has registration. Myrtle Beach and Hilton Head have specific rules.'
    },
    marketScore: { overall: 80, demand: 85, affordability: 65, regulation: 78, seasonality: 88, verdict: 'strong-buy' },
    demandDrivers: { tourism: ['Myrtle Beach', 'Charleston'], attractions: ['Hilton Head', 'Historic districts'], events: ['Spoleto Festival', 'Golf tournaments'], corporateDemand: true, seasonalPeak: 'Mar-Oct', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Lowcountry or beach modern', mustHaveAmenities: ['Pool', 'Beach access', 'Golf cart'], avoidList: ['No pool', 'Far from beach', 'HOA bans'], targetGuest: 'Families, golf groups, beach vacationers' }
  },
  SD: {
    id: 'SD',
    name: 'South Dakota',
    appreciation: { oneYear: 4.8, fiveYear: 48.5, medianValue: 315000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: 18000, migrationRate: 20.4, topInbound: ['MN', 'NE', 'CA'], topOutbound: ['MN', 'CO', 'AZ'] },
    rental: { shortTermMonthly: 1800, longTermMonthly: 1050, occupancyRate: 52, avgADR: 145 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 4.5,
      salesTax: 4.5,
      localTaxRange: '0-2%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2025-01',
      notes: 'Very STR-friendly. No state income tax. Black Hills area popular. Minimal regulations.'
    },
    marketScore: { overall: 68, demand: 62, affordability: 72, regulation: 92, seasonality: 48, verdict: 'buy' },
    demandDrivers: { tourism: ['Mount Rushmore', 'Badlands'], attractions: ['Deadwood', 'Crazy Horse'], events: ['Sturgis Rally'], corporateDemand: false, seasonalPeak: 'Jun-Sep', seasonalLow: 'Nov-Mar' },
    playbook: { idealBedBath: '3BR/2BA cabin', designStyle: 'Black Hills rustic', mustHaveAmenities: ['Hot tub', 'Fire pit', 'Mountain views'], avoidList: ['Too remote', 'No winter access'], targetGuest: 'Road trippers, families, rally attendees' }
  },
  TN: {
    id: 'TN',
    name: 'Tennessee',
    appreciation: { oneYear: 2.5, fiveYear: 62.5, medianValue: 365000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 425000, migrationRate: 61.8, topInbound: ['CA', 'FL', 'TX'], topOutbound: ['FL', 'TX', 'GA'] },
    rental: { shortTermMonthly: 2400, longTermMonthly: 1350, occupancyRate: 65, avgADR: 185 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5,
      salesTax: 7,
      localTaxRange: '2-5%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Nashville has strict STR regulations with permit caps. Gatlinburg/Pigeon Forge STR-friendly. No state income tax.'
    },
    marketScore: { overall: 78, demand: 88, affordability: 62, regulation: 65, seasonality: 85, verdict: 'buy' },
    demandDrivers: { tourism: ['Nashville music', 'Smoky Mountains'], attractions: ['Gatlinburg', 'Memphis BBQ'], events: ['CMA Fest', 'Bonnaroo'], corporateDemand: true, seasonalPeak: 'Mar-Nov', seasonalLow: 'Jan-Feb' },
    playbook: { idealBedBath: '4BR/3BA cabin', designStyle: 'Mountain luxury or Nashville modern', mustHaveAmenities: ['Hot tub', 'Game room', 'Mountain views'], avoidList: ['Nashville non-owner occupied bans', 'Steep driveways'], targetGuest: 'Families, couples, music lovers' }
  },
  TX: {
    id: 'TX',
    name: 'Texas',
    appreciation: { oneYear: 1.2, fiveYear: 42.5, medianValue: 345000 },
    mortgageRates: { thirtyYear: 6.05, fifteenYear: 5.32, trend: 'down' },
    migration: { netMigration: 1285000, migrationRate: 44.2, topInbound: ['CA', 'FL', 'IL'], topOutbound: ['CA', 'FL', 'CO'] },
    rental: { shortTermMonthly: 2400, longTermMonthly: 1450, occupancyRate: 62, avgADR: 180 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 6.25,
      localTaxRange: '2-9%',
      enforcementLevel: 'moderate',
      lastUpdated: '2025-01',
      notes: 'Austin has strict STR regulations (Type 2 banned). Dallas/Houston more permissive. No state income tax. HOT varies.'
    },
    marketScore: { overall: 75, demand: 82, affordability: 68, regulation: 65, seasonality: 82, verdict: 'buy' },
    demandDrivers: { tourism: ['Austin music', 'San Antonio River Walk'], attractions: ['Hill Country', 'Gulf Coast', 'Big Bend'], events: ['SXSW', 'ACL', 'State Fair'], corporateDemand: true, seasonalPeak: 'Mar-May, Sep-Nov', seasonalLow: 'Jul-Aug' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Texas modern or Hill Country', mustHaveAmenities: ['Pool', 'Outdoor kitchen', 'Game room'], avoidList: ['Austin Type 2 zones', 'No pool in summer'], targetGuest: 'Families, event travelers, business' }
  },
  UT: {
    id: 'UT',
    name: 'Utah',
    appreciation: { oneYear: 1.5, fiveYear: 52.8, medianValue: 535000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 125000, migrationRate: 38.2, topInbound: ['CA', 'ID', 'AZ'], topOutbound: ['ID', 'AZ', 'TX'] },
    rental: { shortTermMonthly: 2800, longTermMonthly: 1550, occupancyRate: 62, avgADR: 215 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 4.7,
      salesTax: 6.1,
      localTaxRange: '1-4%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Salt Lake City has STR regulations. Park City has strict rules. Moab growing market. Ski towns vary.'
    },
    marketScore: { overall: 72, demand: 85, affordability: 45, regulation: 68, seasonality: 88, verdict: 'buy' },
    demandDrivers: { tourism: ['National Parks', 'Ski resorts'], attractions: ['Zion', 'Arches', 'Park City'], events: ['Sundance Film Festival'], corporateDemand: true, seasonalPeak: 'Dec-Mar, Jun-Sep', seasonalLow: 'Apr-May, Nov' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Mountain modern', mustHaveAmenities: ['Hot tub', 'Ski storage', 'Mountain views'], avoidList: ['No ski access', 'Park City restrictions'], targetGuest: 'Ski families, national park visitors' }
  },
  VT: {
    id: 'VT',
    name: 'Vermont',
    appreciation: { oneYear: 8.2, fiveYear: 55.8, medianValue: 425000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 12000, migrationRate: 18.8, topInbound: ['NY', 'MA', 'NH'], topOutbound: ['FL', 'NH', 'NC'] },
    rental: { shortTermMonthly: 2600, longTermMonthly: 1450, occupancyRate: 58, avgADR: 205 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 9,
      salesTax: 6,
      localTaxRange: '0-1%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'Generally STR-friendly. Ski towns have registration requirements. Strong seasonal demand.'
    },
    marketScore: { overall: 72, demand: 75, affordability: 52, regulation: 78, seasonality: 82, verdict: 'buy' },
    demandDrivers: { tourism: ['Ski resorts', 'Fall foliage'], attractions: ['Stowe', 'Burlington', 'Covered bridges'], events: ['Ski season'], corporateDemand: false, seasonalPeak: 'Dec-Mar, Sep-Oct', seasonalLow: 'Apr-May, Nov' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Vermont cabin', mustHaveAmenities: ['Hot tub', 'Ski storage', 'Fireplace', 'Mountain views'], avoidList: ['No ski access', 'Poor winter roads'], targetGuest: 'Ski families, leaf peepers, couples' }
  },
  VA: {
    id: 'VA',
    name: 'Virginia',
    appreciation: { oneYear: 4.8, fiveYear: 42.5, medianValue: 425000 },
    mortgageRates: { thirtyYear: 6.08, fifteenYear: 5.35, trend: 'down' },
    migration: { netMigration: 185000, migrationRate: 21.5, topInbound: ['MD', 'NY', 'CA'], topOutbound: ['NC', 'FL', 'TX'] },
    rental: { shortTermMonthly: 2400, longTermMonthly: 1550, occupancyRate: 60, avgADR: 185 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5,
      salesTax: 5.3,
      localTaxRange: '1-6%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Virginia Beach has STR regulations. Arlington/Alexandria have restrictions. Shenandoah area growing.'
    },
    marketScore: { overall: 70, demand: 72, affordability: 55, regulation: 68, seasonality: 82, verdict: 'buy' },
    demandDrivers: { tourism: ['Virginia Beach', 'Shenandoah'], attractions: ['DC suburbs', 'Williamsburg', 'Wine country'], events: ['Virginia Beach events'], corporateDemand: true, seasonalPeak: 'May-Oct', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Colonial or mountain modern', mustHaveAmenities: ['Pool', 'Hot tub', 'Outdoor space'], avoidList: ['HOA restrictions', 'No outdoor amenities'], targetGuest: 'DC families, beach vacationers, history buffs' }
  },
  WA: {
    id: 'WA',
    name: 'Washington',
    appreciation: { oneYear: 2.5, fiveYear: 38.5, medianValue: 615000 },
    mortgageRates: { thirtyYear: 6.05, fifteenYear: 5.32, trend: 'down' },
    migration: { netMigration: 185000, migrationRate: 24.2, topInbound: ['CA', 'OR', 'TX'], topOutbound: ['OR', 'ID', 'TX'] },
    rental: { shortTermMonthly: 2800, longTermMonthly: 1750, occupancyRate: 62, avgADR: 215 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6.5,
      salesTax: 6.5,
      localTaxRange: '1-4%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-12',
      notes: 'Seattle has strict STR regulations. San Juan Islands popular. No state income tax.'
    },
    marketScore: { overall: 65, demand: 78, affordability: 40, regulation: 58, seasonality: 82, verdict: 'hold' },
    demandDrivers: { tourism: ['Seattle', 'Olympic National Park'], attractions: ['San Juan Islands', 'Mt. Rainier'], events: ['Tech conferences'], corporateDemand: true, seasonalPeak: 'Jun-Sep', seasonalLow: 'Nov-Feb' },
    playbook: { idealBedBath: '3BR/2BA', designStyle: 'Pacific Northwest modern', mustHaveAmenities: ['Water views', 'Hot tub', 'Outdoor space'], avoidList: ['Seattle restrictions', 'No views'], targetGuest: 'Tech workers, nature lovers, families' }
  },
  WV: {
    id: 'WV',
    name: 'West Virginia',
    appreciation: { oneYear: 5.8, fiveYear: 42.5, medianValue: 165000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: 15000, migrationRate: 8.4, topInbound: ['VA', 'OH', 'PA'], topOutbound: ['VA', 'OH', 'FL'] },
    rental: { shortTermMonthly: 1600, longTermMonthly: 850, occupancyRate: 52, avgADR: 125 },
    strRegulation: {
      status: 'legal',
      permitRequired: false,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 6,
      salesTax: 6,
      localTaxRange: '0-6%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-09',
      notes: 'Very STR-friendly. Minimal regulations. Growing outdoor tourism market.'
    },
    marketScore: { overall: 68, demand: 55, affordability: 95, regulation: 90, seasonality: 55, verdict: 'buy' },
    demandDrivers: { tourism: ['New River Gorge NP', 'Ski resorts'], attractions: ['Whitewater rafting', 'Hiking'], events: ['Bridge Day'], corporateDemand: false, seasonalPeak: 'May-Oct, Dec-Mar', seasonalLow: 'Nov, Apr' },
    playbook: { idealBedBath: '3BR/2BA cabin', designStyle: 'Rustic Appalachian', mustHaveAmenities: ['Hot tub', 'Fire pit', 'River/mountain views'], avoidList: ['Too remote', 'No cell service'], targetGuest: 'Outdoor enthusiasts, families, adventure seekers' }
  },
  WI: {
    id: 'WI',
    name: 'Wisconsin',
    appreciation: { oneYear: 5.5, fiveYear: 45.2, medianValue: 295000 },
    mortgageRates: { thirtyYear: 6.10, fifteenYear: 5.38, trend: 'down' },
    migration: { netMigration: 25000, migrationRate: 4.3, topInbound: ['IL', 'MN', 'CA'], topOutbound: ['FL', 'AZ', 'TX'] },
    rental: { shortTermMonthly: 2000, longTermMonthly: 1150, occupancyRate: 55, avgADR: 155 },
    strRegulation: {
      status: 'varies',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 5.5,
      salesTax: 5,
      localTaxRange: '0-8%',
      enforcementLevel: 'moderate',
      lastUpdated: '2024-11',
      notes: 'Door County has specific STR regulations. Lake communities vary. Madison has registration.'
    },
    marketScore: { overall: 68, demand: 65, affordability: 72, regulation: 70, seasonality: 65, verdict: 'buy' },
    demandDrivers: { tourism: ['Door County', 'Wisconsin Dells'], attractions: ['Lakes', 'Cheese country'], events: ['EAA AirVenture'], corporateDemand: false, seasonalPeak: 'Jun-Sep', seasonalLow: 'Dec-Feb' },
    playbook: { idealBedBath: '4BR/2BA', designStyle: 'Lake house or cabin', mustHaveAmenities: ['Lake access', 'Dock', 'Fire pit', 'Game room'], avoidList: ['No water access', 'Poor winter access'], targetGuest: 'Chicago families, lake lovers' }
  },
  WY: {
    id: 'WY',
    name: 'Wyoming',
    appreciation: { oneYear: 3.8, fiveYear: 42.5, medianValue: 365000 },
    mortgageRates: { thirtyYear: 6.12, fifteenYear: 5.40, trend: 'down' },
    migration: { netMigration: 12000, migrationRate: 20.8, topInbound: ['CO', 'CA', 'TX'], topOutbound: ['CO', 'MT', 'ID'] },
    rental: { shortTermMonthly: 2400, longTermMonthly: 1200, occupancyRate: 55, avgADR: 185 },
    strRegulation: {
      status: 'legal',
      permitRequired: true,
      primaryResidenceOnly: false,
      maxDaysPerYear: null,
      occupancyTax: 4,
      salesTax: 4,
      localTaxRange: '0-4%',
      enforcementLevel: 'relaxed',
      lastUpdated: '2024-10',
      notes: 'Generally STR-friendly. Jackson Hole has specific regulations. No state income tax.'
    },
    marketScore: { overall: 72, demand: 78, affordability: 55, regulation: 82, seasonality: 72, verdict: 'buy' },
    demandDrivers: { tourism: ['Yellowstone', 'Grand Teton'], attractions: ['Jackson Hole skiing', 'Devils Tower'], events: ['Rodeos'], corporateDemand: false, seasonalPeak: 'Jun-Sep, Dec-Mar', seasonalLow: 'Apr-May, Nov' },
    playbook: { idealBedBath: '4BR/3BA', designStyle: 'Western lodge', mustHaveAmenities: ['Hot tub', 'Mountain views', 'Wildlife viewing'], avoidList: ['Too remote', 'No winter access'], targetGuest: 'National park visitors, ski families, nature lovers' }
  }
};
