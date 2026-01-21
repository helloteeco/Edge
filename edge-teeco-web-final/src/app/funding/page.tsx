export default function FundingPage() {
  const loanOptions = [
    {
      name: "DSCR Loans",
      description: "Debt Service Coverage Ratio loans qualify based on property income, not personal income. Great for investors with multiple properties.",
      minDown: "15-25%",
      rates: "7-9%",
      pros: ["No income verification", "Unlimited properties", "Fast closing"],
      cons: ["Higher rates", "Larger down payment"],
    },
    {
      name: "Conventional Loans",
      description: "Traditional mortgages with the best rates, but require income verification and have property limits.",
      minDown: "15-20%",
      rates: "6-7.5%",
      pros: ["Lowest rates", "Widely available", "Predictable terms"],
      cons: ["Income verification required", "Limited to 10 properties"],
    },
    {
      name: "Hard Money Loans",
      description: "Short-term loans for quick purchases or renovations. Higher rates but fast approval.",
      minDown: "20-30%",
      rates: "10-15%",
      pros: ["Fast approval (days)", "Credit flexible", "Good for flips"],
      cons: ["Very high rates", "Short terms (6-24 months)"],
    },
    {
      name: "Portfolio Loans",
      description: "Loans held by local banks, offering more flexibility for unique situations.",
      minDown: "20-25%",
      rates: "7-8.5%",
      pros: ["Flexible terms", "Relationship-based", "Creative structures"],
      cons: ["Varies by bank", "May require local presence"],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Funding Options</h1>
        <p className="text-muted text-sm">Explore financing options for your STR investment</p>
      </div>

      {/* Quick Tips */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-primary mb-2">💡 Quick Tips</h3>
        <ul className="text-sm space-y-1 text-foreground">
          <li>• DSCR loans are most popular for STR investors</li>
          <li>• Aim for 20%+ down to get better rates</li>
          <li>• Get pre-approved before shopping for properties</li>
          <li>• Consider closing costs (2-5% of purchase price)</li>
        </ul>
      </div>

      {/* Loan Options */}
      <div className="space-y-4">
        {loanOptions.map((loan) => (
          <div key={loan.name} className="bg-white border border-border rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-semibold text-lg">{loan.name}</h3>
                <p className="text-sm text-muted mt-1">{loan.description}</p>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <div className="text-sm text-muted">Down Payment</div>
                  <div className="font-semibold text-primary">{loan.minDown}</div>
                </div>
                <div>
                  <div className="text-sm text-muted">Rates</div>
                  <div className="font-semibold text-primary">{loan.rates}</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-emerald-600 mb-1">✓ Pros</div>
                <ul className="text-sm text-muted space-y-0.5">
                  {loan.pros.map((pro) => (
                    <li key={pro}>{pro}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium text-red-600 mb-1">✗ Cons</div>
                <ul className="text-sm text-muted space-y-0.5">
                  {loan.cons.map((con) => (
                    <li key={con}>{con}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 bg-surface rounded-xl p-6 text-center">
        <h3 className="font-semibold mb-2">Need Help Finding Financing?</h3>
        <p className="text-sm text-muted mb-4">
          Our mentorship program includes connections to STR-friendly lenders.
        </p>
        <a
          href="mailto:hello@teeco.co"
          className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}
