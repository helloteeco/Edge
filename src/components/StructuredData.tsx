'use client';

import { getMarketCounts } from '@/data/helpers';

export function StructuredData() {
  const counts = getMarketCounts();

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Edge by Teeco',
    url: 'https://edge.teeco.co',
    description: `Airbnb investment calculator and STR market analysis tool with free AI agent, market data for ${counts.total.toLocaleString()}+ cities, and funding quiz with 48+ strategies.`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://edge.teeco.co/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Edge by Teeco',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: 'https://edge.teeco.co',
    description: 'AI-powered short-term rental investment analysis tool with real Airbnb comp data, free AI agent, and market data for 1,600+ US cities.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free AI agent, market data, and funding quiz. Property calculator includes 3 free analyses.',
    },
    creator: {
      '@type': 'Organization',
      name: 'Teeco',
      url: 'https://teeco.co',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Teeco',
    url: 'https://teeco.co',
    logo: 'https://edge.teeco.co/og-image.png',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@teeco.co',
      contactType: 'customer service',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}
