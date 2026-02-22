'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface AnalysisData {
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  guestCount: number;
  purchasePrice: number;
  annualRevenue: number;
  occupancyRate: number;
  adr: number;
  cashFlow: number;
  cashOnCash: number;
  analysisData: any;
}

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.id as string;
  
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'expired' | 'viewed' | 'notfound' | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/share?id=${shareId}`);
        
        if (!response.ok) {
          const data = await response.json();
          if (response.status === 410) {
            if (data.error === 'This analysis has expired') {
              setErrorType('expired');
              setError('This analysis link has expired.');
            } else {
              setErrorType('viewed');
              setError('This analysis has already been viewed.');
            }
          } else if (response.status === 404) {
            setErrorType('notfound');
            setError('Analysis not found.');
          } else {
            setError('Failed to load analysis.');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAnalysis(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load analysis.');
        setLoading(false);
      }
    };

    if (shareId) {
      fetchAnalysis();
    }
  }, [shareId]);

  const handleClose = () => {
    router.push('/calculator');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8E4DD] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D3D3D] mx-auto mb-4"></div>
          <p className="text-[#3D3D3D]">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#E8E4DD] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            {errorType === 'expired' && (
              <svg className="w-16 h-16 mx-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {errorType === 'viewed' && (
              <svg className="w-16 h-16 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
            {errorType === 'notfound' && (
              <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#3D3D3D] mb-2">
            {errorType === 'expired' && 'Link Expired'}
            {errorType === 'viewed' && 'Already Viewed'}
            {errorType === 'notfound' && 'Not Found'}
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            {errorType === 'viewed' 
              ? 'Shared analysis links can only be viewed once for privacy.'
              : 'Shared analysis links are available for 90 days.'}
          </p>
          <Link 
            href="/calculator"
            className="inline-block bg-[#3D3D3D] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#2D2D2D] transition-colors"
          >
            Run Your Own Analysis
          </Link>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const fullAnalysis = analysis.analysisData || {};

  return (
    <div className="min-h-screen bg-[#E8E4DD]">
      {/* Header with close button */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/teeco-logo.svg" alt="Teeco" className="h-6" />
            <span className="text-sm text-gray-500">Shared Analysis</span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* One-time view notice */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-4xl mx-auto px-4 py-2 text-center">
          <p className="text-sm text-blue-700">
            👁️ This is a one-time view. Once you close this page, the link will no longer work.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Property Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h1 className="text-2xl font-bold text-[#3D3D3D] mb-2">{analysis.address}</h1>
          <p className="text-[#22C55E] font-medium">
            {analysis.city}, {analysis.state} · {analysis.bedrooms} Bed / {analysis.bathrooms} Bath · Sleeps {analysis.guestCount}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="bg-[#3D3D3D] rounded-2xl p-6 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Projected Annual Revenue</p>
              <p className="text-[#22C55E] text-2xl font-bold">{formatCurrency(analysis.annualRevenue)}</p>
              <p className="text-gray-400 text-xs">{formatCurrency(analysis.annualRevenue / 12)}/month</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Annual Cash Flow</p>
              <p className="text-[#22C55E] text-2xl font-bold">{formatCurrency(analysis.cashFlow)}</p>
              <p className="text-gray-400 text-xs">{formatCurrency(analysis.cashFlow / 12)}/month</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Cash-on-Cash Return</p>
              <p className="text-[#22C55E] text-2xl font-bold">{analysis.cashOnCash.toFixed(1)}%</p>
              <p className="text-gray-400 text-xs">on investment</p>
            </div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-4 gap-3 mb-1">
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#3D3D3D]">{formatCurrency(analysis.adr)}</p>
            <p className="text-xs text-gray-500 uppercase">Avg Nightly Rate</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#3D3D3D]">{analysis.occupancyRate}%</p>
            <p className="text-xs text-gray-500 uppercase">Occupancy Rate</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#3D3D3D]">{fullAnalysis.activeListings || 'N/A'}</p>
            <p className="text-xs text-gray-500 uppercase">Active Listings</p>
          </div>
          <div className="bg-[#DCFCE7] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#22C55E]">{fullAnalysis.peakMonth ? formatCurrency(fullAnalysis.peakMonthRevenue) : 'N/A'}</p>
            <p className="text-xs text-gray-500 uppercase">Peak Month</p>
          </div>
        </div>
        <p className="text-[10px] mb-4 text-right" style={{ color: '#9e9a8f' }}>Market estimates · Updated Feb 2026</p>

        {/* Investment Analysis */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-[#3D3D3D] mb-4 uppercase tracking-wide">Investment Analysis</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Purchase Price</span>
              <span className="font-semibold">{formatCurrency(analysis.purchasePrice)}</span>
            </div>
            {fullAnalysis.downPayment && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Down Payment ({fullAnalysis.downPaymentPercent || 20}%)</span>
                <span className="font-semibold">{formatCurrency(fullAnalysis.downPayment)}</span>
              </div>
            )}
            {fullAnalysis.loanAmount && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Loan Amount</span>
                <span className="font-semibold">{formatCurrency(fullAnalysis.loanAmount)}</span>
              </div>
            )}
            {fullAnalysis.monthlyMortgage && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Monthly Mortgage (P&I)</span>
                <span className="font-semibold">{formatCurrency(fullAnalysis.monthlyMortgage)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Comp Selection Info (if shared with custom selections) */}
        {fullAnalysis.compSelection && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600 text-lg">🎯</span>
              <h3 className="text-sm font-bold text-amber-800">Custom Comp Selection Applied</h3>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              This analysis was shared with a curated comp selection{fullAnalysis.compSelection.selectOnlyMode ? ' (Select Only mode)' : ''}
              {fullAnalysis.compSelection.excludedIds?.length > 0 && ` — ${fullAnalysis.compSelection.excludedIds.length} comp${fullAnalysis.compSelection.excludedIds.length !== 1 ? 's' : ''} ${fullAnalysis.compSelection.selectOnlyMode ? 'not selected' : 'excluded'}`}
              {fullAnalysis.compSelection.distanceFilter && ` • ${fullAnalysis.compSelection.distanceFilter}mi radius filter`}
              {fullAnalysis.compSelection.revenuePercentile && fullAnalysis.compSelection.revenuePercentile !== 'average' && ` • ${fullAnalysis.compSelection.revenuePercentile === 'p75' ? '75th' : '90th'} percentile`}
              . Revenue figures reflect this custom selection.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-[#3D3D3D] rounded-2xl p-6 text-center">
          <h3 className="text-white text-xl font-bold mb-2">Want to run your own analysis?</h3>
          <p className="text-gray-400 mb-4">Edge by Teeco helps you analyze any STR investment property</p>
          <Link
            href="/calculator"
            className="inline-block bg-white text-[#3D3D3D] px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Try Edge Calculator Free
          </Link>
        </div>

        {/* Footer notice */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Analysis shared via Edge by Teeco · edge.teeco.co
        </p>
      </div>
    </div>
  );
}
