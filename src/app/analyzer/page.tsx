"use client";
import { useState } from "react";
import AuthHeader from "@/components/AuthHeader";

export default function AnalyzerPage() {
  const [purchasePrice, setPurchasePrice] = useState(300000);
  const [downPayment, setDownPayment] = useState(20);
  const [interestRate, setInterestRate] = useState(7.5);
  const [monthlyRevenue, setMonthlyRevenue] = useState(4000);
  const [expenses, setExpenses] = useState(30);

  // Calculations
  const downPaymentAmount = purchasePrice * (downPayment / 100);
  const closingCosts = purchasePrice * 0.03; // 3% closing costs
  const totalCashInvested = downPaymentAmount + closingCosts;
  const loanAmount = purchasePrice - downPaymentAmount;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = 30 * 12;
  const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  const annualRevenue = monthlyRevenue * 12;
  const annualExpenses = annualRevenue * (expenses / 100);
  const annualMortgage = monthlyMortgage * 12;
  const netOperatingIncome = annualRevenue - annualExpenses;
  const annualCashFlow = netOperatingIncome - annualMortgage;
  const monthlyCashFlow = annualCashFlow / 12;
  
  // Cash-on-Cash Return = Annual Cash Flow / Total Cash Invested
  const cashOnCash = (annualCashFlow / totalCashInvested) * 100;

  const getCoCGrade = (coc: number) => {
    if (coc >= 20) return { grade: "A+", color: '#000000', label: "Elite" };
    if (coc >= 15) return { grade: "A", color: '#2b2823', label: "Excellent" };
    if (coc >= 10) return { grade: "B+", color: '#3d3a34', label: "Good" };
    if (coc >= 5) return { grade: "C", color: '#787060', label: "Marginal" };
    if (coc >= 0) return { grade: "D", color: '#787060', label: "Break-even" };
    return { grade: "F", color: '#9a9488', label: "Negative" };
  };

  const cocGrade = getCoCGrade(cashOnCash);
  const dsi = monthlyCashFlow > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
              >
                <span className="text-xl">🧮</span>
              </div>
              <div>
                <h1 
                  className="text-2xl font-bold"
                  style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  Deal Analyzer
                </h1>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>Calculate your STR investment returns in real-time</p>
              </div>
            </div>
            <AuthHeader variant="dark" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h3 
                className="font-semibold mb-4 flex items-center gap-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                <span className="text-lg">🏠</span> Property Details
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2b2823' }}>Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: '#787060' }}>$</span>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 rounded-xl transition-all"
                      style={{ backgroundColor: '#e5e3da', border: '1px solid #d8d6cd', color: '#2b2823' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium" style={{ color: '#2b2823' }}>Down Payment</label>
                    <span className="text-sm font-semibold" style={{ color: '#2b2823' }}>{downPayment}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ backgroundColor: '#d8d6cd', accentColor: '#2b2823' }}
                  />
                  <div className="text-sm font-semibold mt-1" style={{ color: '#2b2823' }}>${downPaymentAmount.toLocaleString()}</div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium" style={{ color: '#2b2823' }}>Interest Rate</label>
                    <span className="text-sm font-semibold" style={{ color: '#2b2823' }}>{interestRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="12"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ backgroundColor: '#d8d6cd', accentColor: '#2b2823' }}
                  />
                </div>
              </div>
            </div>

            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h3 
                className="font-semibold mb-4 flex items-center gap-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                <span className="text-lg">💰</span> Revenue & Expenses
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2b2823' }}>Monthly Revenue</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: '#787060' }}>$</span>
                    <input
                      type="number"
                      value={monthlyRevenue}
                      onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 rounded-xl transition-all"
                      style={{ backgroundColor: '#e5e3da', border: '1px solid #d8d6cd', color: '#2b2823' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium" style={{ color: '#2b2823' }}>Operating Expenses</label>
                    <span className="text-sm font-semibold" style={{ color: '#2b2823' }}>{expenses}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    value={expenses}
                    onChange={(e) => setExpenses(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ backgroundColor: '#d8d6cd', accentColor: '#2b2823' }}
                  />
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>Includes cleaning, supplies, utilities, repairs, etc.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Key Metrics */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h3 
                className="font-semibold mb-4 flex items-center gap-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                <span className="text-lg">📊</span> Key Metrics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl" style={{ backgroundColor: '#e5e3da' }}>
                  <div 
                    className="text-4xl font-bold"
                    style={{ color: cocGrade.color, fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    {cocGrade.grade}
                  </div>
                  <div className="text-sm font-medium mt-1" style={{ color: '#2b2823' }}>Deal Grade</div>
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>CoC: {cashOnCash.toFixed(1)}%</div>
                </div>
                
                <div className="text-center p-4 rounded-xl" style={{ backgroundColor: '#e5e3da' }}>
                  <div 
                    className="text-4xl font-bold"
                    style={{ color: dsi ? '#2b2823' : '#787060' }}
                  >
                    {dsi ? "✓" : "✗"}
                  </div>
                  <div className="text-sm font-medium mt-1" style={{ color: '#2b2823' }}>Pays Bills?</div>
                  <div className="text-xs mt-1" style={{ color: '#787060' }}>{dsi ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>

            {/* Cash Flow */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h3 
                className="font-semibold mb-4 flex items-center gap-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                <span className="text-lg">📈</span> Cash Flow Analysis
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span style={{ color: '#787060' }}>Annual Revenue</span>
                  <span className="font-semibold" style={{ color: '#000000' }}>${annualRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span style={{ color: '#787060' }}>Operating Expenses</span>
                  <span className="font-semibold" style={{ color: '#787060' }}>-${annualExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span style={{ color: '#787060' }}>Annual Mortgage</span>
                  <span className="font-semibold" style={{ color: '#787060' }}>-${Math.round(annualMortgage).toLocaleString()}</span>
                </div>
                <div style={{ borderTop: '1px solid #d8d6cd' }} className="my-2"></div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold" style={{ color: '#2b2823' }}>Annual Cash Flow</span>
                  <span 
                    className="text-xl font-bold"
                    style={{ color: annualCashFlow >= 0 ? '#000000' : '#787060', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    ${Math.round(annualCashFlow).toLocaleString()}
                  </span>
                </div>
                <div 
                  className="flex justify-between items-center py-2 rounded-xl px-3 -mx-1"
                  style={{ backgroundColor: '#e5e3da' }}
                >
                  <span style={{ color: '#787060' }}>Monthly Cash Flow</span>
                  <span 
                    className="font-semibold"
                    style={{ color: monthlyCashFlow >= 0 ? '#2b2823' : '#787060' }}
                  >
                    ${Math.round(monthlyCashFlow).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Returns */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h3 
                className="font-semibold mb-4 flex items-center gap-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                <span className="text-lg">💵</span> Returns
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span style={{ color: '#787060' }}>Cash-on-Cash Return</span>
                  <span 
                    className="text-2xl font-bold"
                    style={{ 
                      color: cashOnCash >= 10 ? '#000000' : cashOnCash >= 5 ? '#787060' : '#9a9488',
                      fontFamily: 'Source Serif Pro, Georgia, serif'
                    }}
                  >
                    {cashOnCash.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs mb-2" style={{ color: '#787060' }}>
                  Total Cash Invested: ${totalCashInvested.toLocaleString()} (${downPaymentAmount.toLocaleString()} down + ${closingCosts.toLocaleString()} closing)
                </div>
                <div 
                  className="text-sm rounded-xl p-3"
                  style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                >
                  {cashOnCash >= 20 ? "🚀 Elite return! This is an exceptional investment opportunity." :
                   cashOnCash >= 15 ? "🎯 Excellent return! This is a strong investment." :
                   cashOnCash >= 10 ? "✅ Good return. This deal meets investment criteria." :
                   cashOnCash >= 5 ? "⚠️ Marginal return. Consider if you can increase revenue." :
                   "❌ Negative cash flow. This deal loses money."}
                </div>
              </div>
            </div>

            {/* Bottom Line */}
            <div 
              className="rounded-2xl p-5"
              style={{ 
                backgroundColor: dsi && cashOnCash >= 10 ? 'rgba(43, 40, 35, 0.06)' : 
                                dsi && cashOnCash >= 5 ? 'rgba(120, 112, 96, 0.08)' : 
                                'rgba(120, 112, 96, 0.06)',
                border: '1px solid #d8d6cd'
              }}
            >
              <h3 
                className="font-semibold mb-2 flex items-center gap-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                <span className="text-lg">{dsi && cashOnCash >= 10 ? "🎯" : dsi && cashOnCash >= 5 ? "⚠️" : "❌"}</span> The Bottom Line
              </h3>
              <p className="text-sm" style={{ color: '#787060' }}>
                {dsi && cashOnCash >= 15 
                  ? "Great deal! Strong cash-on-cash return with positive cash flow. This property shows excellent investment potential."
                  : dsi && cashOnCash >= 10
                  ? "Good deal. Solid returns that meet investment criteria. Proceed with confidence."
                  : dsi && cashOnCash >= 5
                  ? "Decent deal. It pays the bills but returns could be better. Consider negotiating the price or finding ways to boost revenue."
                  : !dsi
                  ? "Skip this one. You won't be able to cover your expenses with the projected revenue. Look for properties with better cash flow potential."
                  : "Marginal deal. Consider negotiating a lower price or finding ways to increase revenue before proceeding."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
