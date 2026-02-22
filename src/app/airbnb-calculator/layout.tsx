import { Metadata } from 'next';
import { getMarketCounts } from '@/data/helpers';

type Props = {
  children: React.ReactNode;
};

export async function generateMetadata(): Promise<Metadata> {
  const counts = getMarketCounts();

  const title = 'Airbnb Investment Calculator — Analyze Any US Property for STR Revenue';
  const description = `Analyze any US property for Airbnb revenue, cash-on-cash return, and deal score — whether buying, arbitraging, or evaluating a home you already own. Estimated market data across ${counts.total.toLocaleString()}+ markets. Free AI agent, market data for 1,600+ cities, and funding quiz with 48+ strategies.`;

  return {
    title,
    description,
    keywords: [
      'airbnb calculator',
      'airbnb investment calculator',
      'str calculator',
      'short term rental calculator',
      'airbnb revenue calculator',
      'airbnb cash on cash calculator',
      'airbnb roi calculator',
      'vacation rental calculator',
      'airbnb deal analyzer',
      'str investment analysis',
      'airbnb market data',
      'pricelabs',
    ].join(', '),
    alternates: {
      canonical: 'https://edge.teeco.co/airbnb-calculator',
    },
    openGraph: {
      title: 'Airbnb Investment Calculator — Analyze Any US Property',
      description: `Data-driven STR analysis for ${counts.total.toLocaleString()}+ markets. Revenue projections, cash-on-cash return, deal scores, and free AI agent. Built by investors, for investors.`,
      type: 'website',
      url: 'https://edge.teeco.co/airbnb-calculator',
      siteName: 'Edge by Teeco',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Edge by Teeco — Airbnb Investment Calculator',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Airbnb Investment Calculator — Analyze Any US Property',
      description: `Data-driven STR analysis for ${counts.total.toLocaleString()}+ markets. Revenue projections, cash-on-cash return, deal scores, and free AI agent.`,
      images: ['/og-image.png'],
    },
  };
}

export default function AirbnbCalculatorLayout({ children }: Props) {
  return <>{children}</>;
}
