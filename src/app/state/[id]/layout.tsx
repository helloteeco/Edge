import { Metadata } from 'next';
import { getStateByCode, getCitiesByState } from '@/data/helpers';

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

  const title = `${state.name} STR Markets - ${cities.length} Cities Analyzed | Edge by Teeco`;
  const description = `${state.name} · ${cities.length} STR markets · Avg ADR: $${Math.round(state.avgADR)} · Median Home: $${state.medianHomeValue.toLocaleString()} · Top markets: ${topCities.join(', ')}`;

  // Use the default OG image for state pages (the US map)
  return {
    title,
    description,
    openGraph: {
      title: `${state.name} - ${cities.length} STR Markets Analyzed`,
      description,
      type: 'website',
      url: `https://edge.teeco.co/state/${stateCode.toLowerCase()}`,
      siteName: 'Edge by Teeco',
      images: [
        {
          url: 'https://edge.teeco.co/og-image.png',
          width: 1200,
          height: 630,
          alt: `STR Markets in ${state.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${state.name} - ${cities.length} STR Markets Analyzed`,
      description,
      images: ['https://edge.teeco.co/og-image.png'],
    },
  };
}

export default function StateLayout({ children }: Props) {
  return <>{children}</>;
}
