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
    if (rpr >= 0.20) return { grade: "A+", color: "text-emerald-600", label: "Excellent" };
    if (rpr >= 0.18) return { grade: "A", color: "text-emerald-600", label: "Great" };
    if (rpr >= 0.15) return { grade: "B+", color: "text-emerald-500", label: "Good" };
    if (rpr >= 0.12) return { grade: "C", color: "text-yellow-600", label: "Fair" };
    return { grade: "F", color: "text-red-600", label: "Poor" };
  };

  const rprGrade = getRPRGrade(rpr);
  const dsi = monthlyCashFlow > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Deal Analyzer</h1>
        <p className="text-muted text-sm">Calculate your STR investment returns</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Property Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Down Payment: {downPayment}%</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-primary font-medium">${downPaymentAmount.toLocaleString()}</div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Interest Rate: {interestRate}%</label>
                <input
                  type="range"
                  min="5"
                  max="12"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Revenue & Expenses</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Monthly Revenue</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Operating Expenses: {expenses}%</label>
                <input
                  type="range"
                  min="20"
                  max="50"
                  value={expenses}
                  onChange={(e) => setExpenses(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-muted">Includes cleaning, supplies, utilities, repairs, etc.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Key Metrics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-surface rounded-xl">
                <div className={`text-3xl font-bold ${rprGrade.color}`}>{rprGrade.grade}</div>
                <div className="text-sm text-muted">Deal Grade</div>
                <div className="text-xs text-muted mt-1">RPR: {(rpr * 100).toFixed(1)}%</div>
              </div>
              
              <div className="text-center p-4 bg-surface rounded-xl">
                <div className={`text-3xl font-bold ${dsi ? "text-emerald-600" : "text-red-600"}`}>
                  {dsi ? "✓" : "✗"}
                </div>
                <div className="text-sm text-muted">Pays Bills?</div>
                <div className="text-xs text-muted mt-1">{dsi ? "Yes" : "No"}</div>
              </div>
            </div>
          </div>

          {/* Cash Flow */}
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Cash Flow Analysis</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">Annual Revenue</span>
                <span className="font-medium text-emerald-600">${annualRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Operating Expenses</span>
                <span className="font-medium text-red-600">-${annualExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Annual Mortgage</span>
                <span className="font-medium text-red-600">-${Math.round(annualMortgage).toLocaleString()}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between">
                <span className="font-semibold">Annual Cash Flow</span>
                <span className={`font-bold ${annualCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  ${Math.round(annualCashFlow).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Monthly Cash Flow</span>
                <span className={`font-medium ${monthlyCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  ${Math.round(monthlyCashFlow).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Returns */}
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Returns</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted">Cash-on-Cash Return</span>
                <span className={`text-xl font-bold ${cashOnCash >= 10 ? "text-emerald-600" : cashOnCash >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                  {cashOnCash.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-muted">
                {cashOnCash >= 10 ? "Excellent return! This is a strong investment." :
                 cashOnCash >= 5 ? "Decent return. Consider if you can increase revenue." :
                 "Low return. Look for ways to reduce costs or increase revenue."}
              </div>
            </div>
          </div>

          {/* Bottom Line */}
          <div className={`rounded-xl p-4 ${dsi && cashOnCash >= 8 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            <h3 className="font-semibold mb-2">The Bottom Line</h3>
            <p className="text-sm">
              {dsi && cashOnCash >= 10 
                ? "Great deal! You'll make good money and easily pay your bills."
                : dsi && cashOnCash >= 5
                ? "Decent deal. It pays the bills but returns could be better."
                : !dsi
                ? "Skip this one. You won't be able to cover your expenses."
                : "Marginal deal. Consider negotiating a lower price."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
