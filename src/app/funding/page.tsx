export default function FundingPage() {
  const loanOptions = [
    {
      name: "DSCR Loans",
      icon: "📊",
      badge: "Most Popular",
      description: "Debt Service Coverage Ratio loans qualify based on property income, not personal income. Great for investors with multiple properties.",
      minDown: "15-25%",
      rates: "7-9%",
      pros: ["No income verification", "Unlimited properties", "Fast closing"],
      cons: ["Higher rates", "Larger down payment"],
    },
    {
      name: "Conventional Loans",
      icon: "🏦",
      badge: "Best Rates",
      description: "Traditional mortgages with the best rates, but require income verification and have property limits.",
      minDown: "15-20%",
      rates: "6-7.5%",
      pros: ["Lowest rates", "Widely available", "Predictable terms"],
      cons: ["Income verification required", "Limited to 10 properties"],
    },
    {
      name: "Hard Money Loans",
      icon: "⚡",
      badge: "Fastest",
      description: "Short-term loans for quick purchases or renovations. Higher rates but fast approval.",
      minDown: "20-30%",
      rates: "10-15%",
      pros: ["Fast approval (days)", "Credit flexible", "Good for flips"],
      cons: ["Very high rates", "Short terms (6-24 months)"],
    },
    {
      name: "Portfolio Loans",
      icon: "🤝",
      badge: "Flexible",
      description: "Loans held by local banks, offering more flexibility for unique situations.",
      minDown: "20-25%",
      rates: "7-8.5%",
      pros: ["Flexible terms", "Relationship-based", "Creative structures"],
      cons: ["Varies by bank", "May require local presence"],
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
            >
              <span className="text-xl">💰</span>
            </div>
            <h1 
              className="text-2xl font-bold"
              style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Funding Options
            </h1>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.75)' }}>Explore financing options for your STR investment</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Quick Tips */}
        <div 
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: 'rgba(43, 40, 35, 0.04)', border: '1px solid #d8d6cd' }}
        >
          <h3 
            className="font-semibold mb-3 flex items-center gap-2"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            <span className="text-lg">💡</span> Quick Tips for STR Financing
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: "📊", text: "DSCR loans are most popular for STR investors" },
              { icon: "💵", text: "Aim for 20%+ down to get better rates" },
              { icon: "✅", text: "Get pre-approved before shopping for properties" },
              { icon: "📋", text: "Consider closing costs (2-5% of purchase price)" },
            ].map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm" style={{ color: '#787060' }}>
                <span>{tip.icon}</span>
                <span>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Loan Options */}
        <div className="space-y-4">
          {loanOptions.map((loan) => (
            <div 
              key={loan.name} 
              className="rounded-2xl overflow-hidden transition-all"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              {/* Header */}
              <div className="p-5" style={{ borderBottom: '1px solid #e5e3da' }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: '#e5e3da' }}
                    >
                      {loan.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 
                          className="font-semibold text-lg"
                          style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                        >
                          {loan.name}
                        </h3>
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
                        >
                          {loan.badge}
                        </span>
                      </div>
                      <p className="text-sm mt-1 max-w-lg" style={{ color: '#787060' }}>{loan.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center rounded-xl px-4 py-2" style={{ backgroundColor: '#e5e3da' }}>
                      <div className="text-xs" style={{ color: '#787060' }}>Down Payment</div>
                      <div className="font-bold" style={{ color: '#2b2823' }}>{loan.minDown}</div>
                    </div>
                    <div className="text-center rounded-xl px-4 py-2" style={{ backgroundColor: '#e5e3da' }}>
                      <div className="text-xs" style={{ color: '#787060' }}>Rates</div>
                      <div className="font-bold" style={{ color: '#2b2823' }}>{loan.rates}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid sm:grid-cols-2">
                <div className="p-4" style={{ borderRight: '1px solid #e5e3da' }}>
                  <div className="text-sm font-semibold mb-2 flex items-center gap-1" style={{ color: '#2b2823' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Pros
                  </div>
                  <ul className="space-y-1.5">
                    {loan.pros.map((pro) => (
                      <li key={pro} className="text-sm flex items-start gap-2" style={{ color: '#787060' }}>
                        <span style={{ color: '#2b2823' }} className="mt-0.5">•</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4">
                  <div className="text-sm font-semibold mb-2 flex items-center gap-1" style={{ color: '#787060' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cons
                  </div>
                  <ul className="space-y-1.5">
                    {loan.cons.map((con) => (
                      <li key={con} className="text-sm flex items-start gap-2" style={{ color: '#787060' }}>
                        <span style={{ color: '#787060' }} className="mt-0.5">•</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div 
          className="mt-8 rounded-2xl p-6 text-center"
          style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}
        >
          <h3 
            className="font-semibold text-lg mb-2"
            style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Need Help Finding Financing?
          </h3>
          <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            Our mentorship program includes connections to STR-friendly lenders who understand your investment goals.
          </p>
          <a
            href="mailto:hello@teeco.co"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
            style={{ 
              backgroundColor: '#ffffff', 
              color: '#2b2823',
              boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.2)'
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
