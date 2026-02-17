"use client";

import Link from "next/link";
import Image from "next/image";
import { getMarketCounts } from "@/data/helpers";

export default function AirbnbCalculatorLanding() {
  const counts = getMarketCounts();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Hero Section */}
      <section 
        className="relative px-4 pt-12 pb-16 text-center"
        style={{ background: 'linear-gradient(180deg, #2b2823 0%, #3d3a34 100%)' }}
      >
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 opacity-80 hover:opacity-100 transition-opacity">
            <Image src="/teeco-icon.png" alt="Edge by Teeco" width={28} height={28} className="w-7 h-7" />
            <span style={{ color: '#e5e3da', fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: '1.1rem' }}>
              Edge by Teeco
            </span>
          </Link>
          
          <h1 
            className="text-3xl sm:text-4xl font-bold mb-4 leading-tight"
            style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Airbnb Investment Calculator &amp; STR Market Analysis
          </h1>
          
          <p className="text-base sm:text-lg mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Analyze any US property for Airbnb revenue, cash-on-cash return, and deal score — whether you&apos;re buying, arbitraging, or evaluating a home you already own. 
            Powered by <strong>PriceLabs</strong> data across {counts.total.toLocaleString()}+ markets.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/calculator"
              className="inline-block px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:opacity-90"
              style={{ backgroundColor: '#ffffff', color: '#2b2823', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.2)' }}
            >
              Analyze a Property
            </Link>
            <Link
              href="/search"
              className="inline-block px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:opacity-90"
              style={{ backgroundColor: 'transparent', color: '#ffffff', border: '1.5px solid rgba(255,255,255,0.4)' }}
            >
              Browse Markets
            </Link>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <h2 
          className="text-2xl font-bold mb-8 text-center"
          style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
        >
          Everything You Need to Find Your Next STR Investment
        </h2>

        <div className="grid gap-4">
          {/* Free Features */}
          {[
            {
              icon: "🤖",
              title: "AI Investment Agent",
              desc: "Ask Edge AI anything about STR markets. Compare cities, get recommendations, and analyze deals — powered by real data from 1,611+ markets.",
              tag: "Free",
              href: "/",
            },
            {
              icon: "🗺️",
              title: "Interactive US Market Map",
              desc: `Color-coded map of ${counts.total.toLocaleString()}+ STR markets. See investment grades, revenue data, and occupancy rates at a glance.`,
              tag: "Free",
              href: "/",
            },
            {
              icon: "🔍",
              title: "Smart Market Search & Filters",
              desc: "Search 13,647+ cities. Filter by budget, nightly rate, revenue, regulation status, and property size. Sort by score, cash-on-cash, or revenue.",
              tag: "Free",
              href: "/search",
            },
            {
              icon: "💰",
              title: "Funding Quiz & 48+ Strategies",
              desc: "Answer 8 questions and get personalized funding recommendations. DSCR loans, seller financing, partnerships, and more.",
              tag: "Free",
              href: "/funding",
            },
            {
              icon: "🎓",
              title: "Rural Airbnb Video Course",
              desc: "Free video course on how to invest in your first rural Airbnb. Learn the full process from market research to launch.",
              tag: "Free",
              href: "/funding",
            },
            {
              icon: "🏠",
              title: "Property Investment Calculator",
              desc: "Analyze any US property for buying, rental arbitrage, or converting your existing home to an STR. Get projected revenue, cash-on-cash return, deal score, nearby comps, and a full investment report. Powered by PriceLabs dynamic pricing data.",
              tag: "3 free analyses",
              href: "/calculator",
            },
            {
              icon: "📊",
              title: "Save Reports & Track History",
              desc: "Save your property analyses, add personal notes, and access your full analysis history. Synced across all your devices.",
              tag: "Free",
              href: "/saved",
            },
            {
              icon: "📤",
              title: "Share & Download Reports",
              desc: "Share deals with friends, partners, and investors via link or download a professional PDF report.",
              tag: "Free",
              href: "/calculator",
            },
          ].map((feature, i) => (
            <Link
              key={i}
              href={feature.href}
              className="flex gap-4 p-5 rounded-2xl transition-all hover:shadow-md"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
            >
              <div className="text-2xl flex-shrink-0 mt-0.5">{feature.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm" style={{ color: '#2b2823' }}>{feature.title}</h3>
                  <span 
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: feature.tag === 'Free' ? '#e8f5e9' : '#fff8e1',
                      color: feature.tag === 'Free' ? '#2e7d32' : '#f57f17',
                    }}
                  >
                    {feature.tag}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#787060' }}>{feature.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <h2 
          className="text-2xl font-bold mb-8 text-center"
          style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
        >
          How the Calculator Works
        </h2>

        <div className="grid gap-4">
          {[
            { step: "1", title: "Enter Any US Address", desc: "Paste a Zillow link or type any property address. Works for properties you want to buy, arbitrage, or already own." },
            { step: "2", title: "We Pull Real Comp Data", desc: "Edge finds nearby Airbnb comps using PriceLabs dynamic pricing data — real nightly rates, occupancy, and revenue from actual listings." },
            { step: "3", title: "Get Your Investment Report", desc: "See projected annual revenue, cash-on-cash return, deal score, monthly cash flow, expense breakdown, and seasonality trends." },
            { step: "4", title: "Save, Share, or Analyze More", desc: "Save reports to your account with personal notes, share with investors via link or PDF, and track your analysis history across devices." },
          ].map((step, i) => (
            <div 
              key={i}
              className="flex gap-4 p-5 rounded-2xl"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
              >
                {step.step}
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: '#2b2823' }}>{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#787060' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Professional Services */}
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <h2 
          className="text-2xl font-bold mb-3 text-center"
          style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
        >
          Beyond Data — Full-Service STR Support
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: '#787060' }}>
          Teeco also offers à la carte professional services for investors who want hands-on help.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🎨", title: "Professional Design", desc: "Designers with TV show, boutique hotel, and luxury design experience" },
            { icon: "🔧", title: "Setup Team", desc: "Professional setup anywhere in America" },
            { icon: "🧭", title: "1:1 Mentorship", desc: "Personal coaching from experienced STR investors" },
            { icon: "🏡", title: "Concierge Property Finding", desc: "Done-for-you Airbnb property sourcing" },
            { icon: "🤝", title: "Cohosting", desc: "Available for clients who go through design & setup" },
            { icon: "🎬", title: "Free Video Course", desc: "Learn how to invest in your first rural Airbnb" },
          ].map((service, i) => (
            <div 
              key={i}
              className="p-4 rounded-2xl"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
            >
              <div className="text-xl mb-2">{service.icon}</div>
              <h3 className="font-semibold text-xs mb-1" style={{ color: '#2b2823' }}>{service.title}</h3>
              <p className="text-[11px] leading-relaxed" style={{ color: '#787060' }}>{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section — also generates FAQ schema */}
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <h2 
          className="text-2xl font-bold mb-8 text-center"
          style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
        >
          Frequently Asked Questions
        </h2>

        <div className="grid gap-3">
          {faqs.map((faq, i) => (
            <details 
              key={i}
              className="rounded-2xl overflow-hidden group"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
            >
              <summary 
                className="p-5 cursor-pointer font-semibold text-sm list-none flex items-center justify-between"
                style={{ color: '#2b2823' }}
              >
                {faq.question}
                <svg className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-180" style={{ color: '#787060' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-xs leading-relaxed" style={{ color: '#787060' }}>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-12 max-w-3xl mx-auto">
        <div 
          className="rounded-2xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}
        >
          <h2 
            className="text-xl font-bold mb-3"
            style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Ready to Find Your Next Investment?
          </h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Join thousands of investors using Edge to make data-driven STR decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/calculator"
              className="inline-block px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: '#ffffff', color: '#2b2823' }}
            >
              Analyze a Property
            </Link>
            <Link
              href="/search"
              className="inline-block px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: 'transparent', color: '#ffffff', border: '1.5px solid rgba(255,255,255,0.4)' }}
            >
              Browse {counts.total.toLocaleString()}+ Markets
            </Link>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <nav className="px-4 py-6 max-w-3xl mx-auto" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs" style={{ color: '#787060' }}>
          <li><Link href="/" className="hover:underline">Home</Link></li>
          <li>/</li>
          <li><Link href="/calculator" className="hover:underline">Calculator</Link></li>
          <li>/</li>
          <li style={{ color: '#2b2823' }}>Airbnb Investment Calculator</li>
        </ol>
      </nav>

      {/* FAQ Schema (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(faq => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://edge.teeco.co" },
              { "@type": "ListItem", position: 2, name: "Calculator", item: "https://edge.teeco.co/calculator" },
              { "@type": "ListItem", position: 3, name: "Airbnb Investment Calculator", item: "https://edge.teeco.co/airbnb-calculator" },
            ],
          }),
        }}
      />

      {/* SoftwareApplication Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Edge by Teeco — Airbnb Investment Calculator",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            url: "https://edge.teeco.co/airbnb-calculator",
            description: `Analyze any US property for Airbnb revenue, cash-on-cash return, and deal score. Powered by PriceLabs data across ${counts.total.toLocaleString()}+ markets. Free AI agent, market data, and funding quiz included.`,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Free AI agent, market data for 1,600+ cities, and 3 free property analyses.",
            },
            creator: {
              "@type": "Organization",
              name: "Teeco",
              url: "https://teeco.co",
            },
          }),
        }}
      />
    </div>
  );
}

// FAQ data — used for both rendering and JSON-LD schema
const faqs = [
  {
    question: "How does the Airbnb investment calculator work?",
    answer: "Enter any US property address or paste a Zillow link. Edge pulls real comparable Airbnb listings using PriceLabs dynamic pricing data, then projects your annual revenue, cash-on-cash return, monthly cash flow, and deal score. Works for buying, rental arbitrage, or analyzing a home you already own. You get a full investment report with nearby comps, expense breakdown, seasonality trends, and market context.",
  },
  {
    question: "Where does the data come from?",
    answer: "Market data is powered by PriceLabs, one of the most reliable dynamic Airbnb pricing platforms used by professional hosts. City-level data covers 1,611 markets with full STR metrics including revenue, occupancy, ADR, and investment grades.",
  },
  {
    question: "Is Edge really free?",
    answer: "Yes — the AI agent, market data for 1,600+ cities, interactive US map, smart search with filters, funding quiz with 48+ strategies, saved reports, sharing, and a free video course are all completely free. The property calculator includes 3 free analyses, then additional analyses use credits.",
  },
  {
    question: "What is an STR investment grade?",
    answer: "Edge grades every market from A+ to F based on a transparent scoring model. The score factors in cash-on-cash return potential, occupancy rates, market saturation, regulation friendliness, and seasonality. A+ markets (85+ score) are rated 'Strong Buy' while F markets are rated 'Avoid.'",
  },
  {
    question: "How many markets does Edge cover?",
    answer: "Edge tracks 13,647+ US cities, with 1,611 having full STR data including revenue projections, occupancy rates, ADR, investment grades, income by property size, and top amenity recommendations. All 50 states are covered.",
  },
  {
    question: "Can I share my analysis with investors or partners?",
    answer: "Yes. Every property analysis can be shared via a direct link or downloaded as a professional PDF report. You can also save reports to your account with personal notes, and your saved data syncs across all your devices.",
  },
  {
    question: "What professional services does Teeco offer?",
    answer: "Teeco offers à la carte services including professional interior design (designers with TV show and boutique hotel experience), property setup teams anywhere in America, 1:1 mentorship, concierge Airbnb property finding, and cohosting for clients who go through the design and setup program. There's also a free video course on rural Airbnb investing.",
  },
  {
    question: "How is Edge different from AirDNA or Mashvisor?",
    answer: "Edge is built by active STR investors, not just data analysts. The free tier includes an AI agent that can answer questions about any market, a funding quiz with 48+ strategies, and investment grades that go beyond raw numbers. The calculator uses PriceLabs data for accurate revenue projections, and Teeco offers hands-on services like design, setup, and mentorship that pure data platforms don't provide.",
  },
];
