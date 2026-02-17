import { Metadata } from 'next';
import { getCityById, getCitiesByState, getStateByCode } from '@/data/helpers';

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

// State code to full name mapping for SEO
const stateFullNames: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cityId = params.id;
  const city = getCityById(cityId);

  if (!city) {
    return {
      title: 'City Not Found | Edge by Teeco',
      description: 'This city page is not available.',
    };
  }

  const annualRevenue = city.strMonthlyRevenue * 12;
  const annualRevenueK = Math.round(annualRevenue / 1000);
  const stateFull = stateFullNames[city.stateCode.toUpperCase()] || city.stateCode;

  // Get nearby cities in same state for internal linking context
  const stateCities = getCitiesByState(city.stateCode);
  const nearbyCities = stateCities
    .filter(c => c.id !== city.id)
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, 3)
    .map(c => c.name);

  // SEO-optimized title: targets "airbnb market data [city]", "str investment [city]", "[city] airbnb revenue"
  const title = `Airbnb Market Data for ${city.name}, ${city.stateCode} — $${annualRevenueK}K/yr Revenue, Grade ${city.grade}`;

  // SEO-optimized description: includes key metrics investors search for, all dynamic
  const regulationLabel = city.regulation === 'Legal' ? 'STR-friendly' : city.regulation === 'Strict Rules' ? 'Strict STR rules' : 'Regulated STR market';
  const description = `${city.name}, ${stateFull} short-term rental market analysis. $${city.strMonthlyRevenue.toLocaleString()}/mo avg revenue · ${city.occupancy}% occupancy · $${Math.round(city.avgADR)} ADR · $${city.medianHomeValue.toLocaleString()} median home · ${regulationLabel}. Investment grade: ${city.grade} (${city.marketScore}/100). Powered by PriceLabs data.`;

  const ogImageUrl = `https://edge.teeco.co/api/og/city?name=${encodeURIComponent(city.name)}&state=${encodeURIComponent(city.stateCode)}&grade=${encodeURIComponent(city.grade)}&revenue=${Math.round(city.strMonthlyRevenue)}&occupancy=${city.occupancy}&adr=${Math.round(city.avgADR)}&score=${city.marketScore}&medianPrice=${Math.round(city.medianHomeValue)}&county=${encodeURIComponent(city.county)}`;

  // Build keywords dynamically from city data
  const keywords = [
    `${city.name} airbnb`,
    `${city.name} short term rental`,
    `${city.name} ${city.stateCode} STR investment`,
    `airbnb market data ${city.name}`,
    `${city.name} airbnb revenue`,
    `${city.name} occupancy rate`,
    `${city.name} ${stateFull} vacation rental`,
    `${city.name} airbnb calculator`,
  ].join(', ');

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `https://edge.teeco.co/city/${cityId}`,
    },
    openGraph: {
      title: `${city.name}, ${city.stateCode} — $${annualRevenueK}K/yr STR Market · Grade ${city.grade}`,
      description: `Analyze the ${city.name} short-term rental market. $${city.strMonthlyRevenue.toLocaleString()}/mo revenue · ${city.occupancy}% occupancy · Grade ${city.grade}. Free market data powered by PriceLabs.`,
      type: 'website',
      url: `https://edge.teeco.co/city/${cityId}`,
      siteName: 'Edge by Teeco',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `STR Market Analysis for ${city.name}, ${city.stateCode} — Grade ${city.grade}, $${annualRevenueK}K/yr`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${city.name}, ${city.stateCode} — $${annualRevenueK}K/yr STR Market · Grade ${city.grade}`,
      description: `Analyze the ${city.name} short-term rental market. $${city.strMonthlyRevenue.toLocaleString()}/mo revenue · ${city.occupancy}% occupancy · Grade ${city.grade}. Free market data powered by PriceLabs.`,
      images: [ogImageUrl],
    },
  };
}

export default function CityLayout({ children }: Props) {
  return <>{children}</>;
}
