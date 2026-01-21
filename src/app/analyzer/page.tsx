"use client";

import { useState } from "react";

export default function AnalyzerPage() {
  const [purchasePrice, setPurchasePrice] = useState(300000);
  const [downPayment, setDownPayment] = useState(20);
  const [interestRate, setInterestRate] = useState(7.5);
  const [monthlyRevenue, setMonthlyRevenue] = useState(4000);
  const [expenses, setExpenses] = useState(30);

  // Calculations
  const downPaymentAmount = purchasePrice * (downPayment / 100);
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
  const cashOnCash = (annualCashFlow / downPaymentAmount) * 100;
  const rpr = annualRevenue / purchasePrice;

  const getRPRGrade = (rpr: number) => {
    if (rpr >= 0.20) return { grade: "A+", color: "text-emerald-600", bgColor: "bg-emerald-500", label: "Excellent" };
    if (rpr >= 0.18) return { grade: "A", color: "text-emerald-600", bgColor: "bg-emerald-500", label: "Great" };
    if (rpr >= 0.15) return { grade: "B+", color: "text-green-600", bgColor: "bg-green-500", label: "Good" };
    if (rpr >= 0.12) return { grade: "C", color: "text-amber-600", bgColor: "bg-amber-500", label: "Fair" };
    return { grade: "F", color: "text-red-600", bgColor: "bg-red-500", label: "Poor" };
  };

  const rprGrade = getRPRGrade(rpr);
  const dsi = monthlyCashFlow > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <span className="text-xl">🧮</span>
            </div>
            <h1 className="text-2xl font-bold">Deal Analyzer</h1>
          </div>
          <p className="text-slate-300">Calculate your STR investment returns in real-time</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">🏠</span> Property Details
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Down Payment</label>
                    <span className="text-sm font-semibold text-teal-600">{downPayment}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="text-sm text-teal-600 font-semibold mt-1">${downPaymentAmount.toLocaleString()}</div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Interest Rate</label>
                    <span className="text-sm font-semibold text-teal-600">{interestRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="12"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">💰</span> Revenue & Expenses
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Monthly Revenue</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input
                      type="number"
                      value={monthlyRevenue}
                      onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Operating Expenses</label>
                    <span className="text-sm font-semibold text-teal-600">{expenses}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    value={expenses}
                    onChange={(e) => setExpenses(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="text-xs text-slate-500 mt-1">Includes cleaning, supplies, utilities, repairs, etc.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">📊</span> Key Metrics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className={`text-4xl font-bold ${rprGrade.color}`}>{rprGrade.grade}</div>
                  <div className="text-sm font-medium text-slate-700 mt-1">Deal Grade</div>
                  <div className="text-xs text-slate-500 mt-1">RPR: {(rpr * 100).toFixed(1)}%</div>
                </div>
                
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className={`text-4xl font-bold ${dsi ? "text-emerald-600" : "text-red-600"}`}>
                    {dsi ? "✓" : "✗"}
                  </div>
                  <div className="text-sm font-medium text-slate-700 mt-1">Pays Bills?</div>
                  <div className="text-xs text-slate-500 mt-1">{dsi ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>

            {/* Cash Flow */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">📈</span> Cash Flow Analysis
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">Annual Revenue</span>
                  <span className="font-semibold text-emerald-600">${annualRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">Operating Expenses</span>
                  <span className="font-semibold text-red-500">-${annualExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">Annual Mortgage</span>
                  <span className="font-semibold text-red-500">-${Math.round(annualMortgage).toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-200 my-2"></div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-slate-900">Annual Cash Flow</span>
                  <span className={`text-xl font-bold ${annualCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    ${Math.round(annualCashFlow).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-slate-50 rounded-xl px-3 -mx-1">
                  <span className="text-slate-600">Monthly Cash Flow</span>
                  <span className={`font-semibold ${monthlyCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    ${Math.round(monthlyCashFlow).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Returns */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-lg">💵</span> Returns
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Cash-on-Cash Return</span>
                  <span className={`text-2xl font-bold ${cashOnCash >= 10 ? "text-emerald-600" : cashOnCash >= 5 ? "text-amber-600" : "text-red-600"}`}>
                    {cashOnCash.toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">
                  {cashOnCash >= 10 ? "🚀 Excellent return! This is a strong investment." :
                   cashOnCash >= 5 ? "⚠️ Decent return. Consider if you can increase revenue." :
                   "❌ Low return. Look for ways to reduce costs or increase revenue."}
                </div>
              </div>
            </div>

            {/* Bottom Line */}
            <div className={`rounded-2xl p-5 ${dsi && cashOnCash >= 8 ? "bg-emerald-50 border border-emerald-200" : dsi ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"}`}>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-lg">{dsi && cashOnCash >= 8 ? "🎯" : dsi ? "⚠️" : "❌"}</span> The Bottom Line
              </h3>
              <p className="text-sm text-slate-600">
                {dsi && cashOnCash >= 10 
                  ? "Great deal! You'll make good money and easily pay your bills. This property shows strong investment potential."
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
