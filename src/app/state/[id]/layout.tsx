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
    .slice(0, 3)
    .map(c => c.name);

  // Get raw state data for rental info
  const rawState = stateDataByCode[stateCode.toUpperCase()];
  const avgRevenue = rawState?.rental?.shortTermMonthly || 0;
  const avgOccupancy = rawState?.rental?.occupancyRate || 0;
  const annualRevenueK = Math.round((avgRevenue * 12) / 1000);

  const title = `${state.name} STR Markets - ${cities.length} Cities Analyzed | Edge by Teeco`;
  const description = `${state.name} · ${cities.length} STR markets · Avg Revenue: $${avgRevenue.toLocaleString()}/mo · Avg ADR: $${Math.round(state.avgADR)} · Median Home: $${state.medianHomeValue.toLocaleString()} · Top markets: ${topCities.join(', ')}`;

  const ogImageUrl = `https://edge.teeco.co/api/og/state?name=${encodeURIComponent(state.name)}&code=${encodeURIComponent(state.abbreviation)}&cities=${cities.length}&avgADR=${Math.round(state.avgADR)}&medianHome=${Math.round(state.medianHomeValue)}&topMarkets=${encodeURIComponent(topCities.join(', '))}&avgOccupancy=${avgOccupancy}&avgRevenue=${avgRevenue}`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://edge.teeco.co/state/${stateCode.toLowerCase()}`,
    },
    openGraph: {
      title: `${state.name} - $${annualRevenueK}K/yr Avg · ${cities.length} STR Markets`,
      description,
      type: 'website',
      url: `https://edge.teeco.co/state/${stateCode.toLowerCase()}`,
      siteName: 'Edge by Teeco',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `STR Markets in ${state.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${state.name} - $${annualRevenueK}K/yr Avg · ${cities.length} STR Markets`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function StateLayout({ children }: Props) {
  return <>{children}</>;
}
