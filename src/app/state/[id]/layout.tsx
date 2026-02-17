import { Metadata } from 'next';
import { getStateByCode, getCitiesByState } from '@/data/helpers';
import { stateData as stateDataByCode } from '@/data/state-data';

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateCode = params.id;
  const state = getStateByCode(stateCode);

  if (!state) {
    return {
      title: 'State Not Found | Edge by Teeco',
      description: 'This state page is not available.',
    };
  }

  const cities = getCitiesByState(stateCode);
  const topCities = cities
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, 5)
    .map(c => c.name);

  // Get raw state data for rental info
  const rawState = stateDataByCode[stateCode.toUpperCase()];
  const avgRevenue = rawState?.rental?.shortTermMonthly || 0;
  const avgOccupancy = rawState?.rental?.occupancyRate || 0;
  const annualRevenueK = Math.round((avgRevenue * 12) / 1000);

  // Count grades for rich description
  const gradeA = cities.filter(c => c.grade === 'A+' || c.grade === 'A').length;
  const gradeBPlus = cities.filter(c => c.grade === 'B+').length;

  // SEO-optimized title: targets "best airbnb markets [state]", "[state] str investment"
  const title = `Best Airbnb Markets in ${state.name} — ${cities.length} Cities Analyzed, Grade ${state.grade}`;

  // SEO-optimized description with key metrics
  const regulationLabel = state.regulation === 'Legal' ? 'STR-friendly state' : 'Regulated STR state';
  const description = `${state.name} short-term rental investment analysis. ${cities.length} markets analyzed · ${gradeA > 0 ? `${gradeA} A-rated markets · ` : ''}$${avgRevenue.toLocaleString()}/mo avg revenue · ${avgOccupancy}% avg occupancy · $${state.medianHomeValue.toLocaleString()} median home · ${regulationLabel}. Top markets: ${topCities.slice(0, 3).join(', ')}. Free data powered by PriceLabs.`;

  // Dynamic keywords
  const keywords = [
    `best airbnb markets ${state.name}`,
    `${state.name} short term rental investment`,
    `${state.name} STR markets`,
    `airbnb ${state.name}`,
    `${state.name} vacation rental data`,
    `${state.name} airbnb revenue`,
    `${state.name} airbnb occupancy`,
    ...topCities.slice(0, 3).map(c => `${c} ${state.abbreviation} airbnb`),
  ].join(', ');

  const ogImageUrl = `https://edge.teeco.co/api/og/state?name=${encodeURIComponent(state.name)}&code=${encodeURIComponent(state.abbreviation)}&cities=${cities.length}&avgADR=${Math.round(state.avgADR)}&medianHome=${Math.round(state.medianHomeValue)}&topMarkets=${encodeURIComponent(topCities.slice(0, 3).join(', '))}&avgOccupancy=${avgOccupancy}&avgRevenue=${avgRevenue}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `https://edge.teeco.co/state/${stateCode.toLowerCase()}`,
    },
    openGraph: {
      title: `Best Airbnb Markets in ${state.name} — ${cities.length} Cities · Grade ${state.grade}`,
      description: `Explore ${cities.length} STR markets in ${state.name}. $${avgRevenue.toLocaleString()}/mo avg revenue · Top markets: ${topCities.slice(0, 3).join(', ')}. Free market data.`,
      type: 'website',
      url: `https://edge.teeco.co/state/${stateCode.toLowerCase()}`,
      siteName: 'Edge by Teeco',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `STR Markets in ${state.name} — ${cities.length} Cities Analyzed`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Best Airbnb Markets in ${state.name} — ${cities.length} Cities · Grade ${state.grade}`,
      description: `Explore ${cities.length} STR markets in ${state.name}. $${avgRevenue.toLocaleString()}/mo avg revenue · Top markets: ${topCities.slice(0, 3).join(', ')}. Free market data.`,
      images: [ogImageUrl],
    },
  };
}

export default function StateLayout({ children }: Props) {
  return <>{children}</>;
}
