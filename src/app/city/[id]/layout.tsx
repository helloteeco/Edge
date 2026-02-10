import { Metadata } from 'next';
import { getCityById } from '@/data/helpers';

type Props = {
  params: { id: string };
  children: React.ReactNode;
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
  const title = `${city.name}, ${city.stateCode} - STR Grade ${city.grade} | Edge by Teeco`;
  const description = `${city.name}, ${city.stateCode} · Monthly Revenue: $${city.strMonthlyRevenue.toLocaleString()} · Occupancy: ${city.occupancy}% · ADR: $${Math.round(city.avgADR)} · Score: ${city.marketScore}/100 · Median Home: $${city.medianHomeValue.toLocaleString()}`;

  const ogImageUrl = `https://edge.teeco.co/api/og/city?name=${encodeURIComponent(city.name)}&state=${encodeURIComponent(city.stateCode)}&grade=${encodeURIComponent(city.grade)}&revenue=${Math.round(city.strMonthlyRevenue)}&occupancy=${city.occupancy}&adr=${Math.round(city.avgADR)}&score=${city.marketScore}&medianPrice=${Math.round(city.medianHomeValue)}&county=${encodeURIComponent(city.county)}`;

  return {
    title,
    description,
    openGraph: {
      title: `${city.name}, ${city.stateCode} - $${annualRevenueK}K/yr STR Market`,
      description,
      type: 'website',
      url: `https://edge.teeco.co/city/${cityId}`,
      siteName: 'Edge by Teeco',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `STR Market Analysis for ${city.name}, ${city.stateCode}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${city.name}, ${city.stateCode} - $${annualRevenueK}K/yr STR Market`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function CityLayout({ children }: Props) {
  return <>{children}</>;
}
