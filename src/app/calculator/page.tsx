"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { lookupAddress, FlatCity, StateBenchmark } from "@/data/helpers";
import {
  calculateDeal,
  DealInputs,
  DealOutput,
  Range,
  DEFAULT_FINANCING,
  DEFAULT_OPERATING,
  DEFAULT_LTR,
  LTRComparison,
  estimateLTRRent,
  getBedroomMultiplier,
} from "@/lib/deal-calculator";

// ============================================================================
// STATE TYPES
// ============================================================================

interface CalculatorState {
  // Module 1: Address
  address: string;
  lookupResult: 'idle' | 'loading' | 'city' | 'state_fallback' | 'not_found';
  cityData: FlatCity | null;
  stateBenchmark: StateBenchmark | null;
  parsedCity: string;
  parsedState: string;
  
  // Module 2: Property Profile
  bedrooms: number;
  bathrooms: number;
  propertyType: 'house' | 'condo' | 'cabin' | 'apartment' | 'townhouse';
  purchasePrice: number;
  
  // Module 3: Market Benchmark (editable)
  adrLow: number;
  adrBase: number;
  adrHigh: number;
  occLow: number;
  occBase: number;
  occHigh: number;
  
  // Module 4: Assumptions
  adrAdjustment: number;
  occupancyAdjustment: number;
  downPaymentPct: number;
  interestRate: number;
  managementPct: number;
  cleaningCost: number;
  seasonality: 'year_round' | 'summer_peak' | 'winter_peak';
  
  // Module 5: LTR Comparison
  showLtrComparison: boolean;
  ltrMonthlyRent: number;
  ltrVacancyPct: number;
  ltrManagementPct: number;
  
  // UI State
  showAssumptions: boolean;
}

const initialState: CalculatorState = {
  address: '',
  lookupResult: 'idle',
  cityData: null,
  stateBenchmark: null,
  parsedCity: '',
  parsedState: '',
  bedrooms: 3,
  bathrooms: 2,
  propertyType: 'house',
  purchasePrice: 250000,
  adrLow: 100,
  adrBase: 150,
  adrHigh: 200,
  occLow: 45,
  occBase: 60,
  occHigh: 75,
  adrAdjustment: 0,
  occupancyAdjustment: 0,
  downPaymentPct: 25,
  interestRate: 7.0,
  managementPct: 0,
  cleaningCost: 150,
  seasonality: 'year_round',
  showLtrComparison: false,
  ltrMonthlyRent: 1500,
  ltrVacancyPct: 5,
  ltrManagementPct: 8,
  showAssumptions: false,
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function DealCalculatorPage() {
  const [state, setState] = useState<CalculatorState>(initialState);
  
  // Calculate deal output whenever inputs change
  const dealOutput = useMemo<DealOutput | null>(() => {
    if (state.lookupResult === 'idle' || state.lookupResult === 'loading') {
      return null;
    }
    
    // Apply bedroom multiplier to ADR
    const bedroomMultiplier = getBedroomMultiplier(state.bedrooms);
    
    const inputs: DealInputs = {
      property: {
        bedrooms: state.bedrooms,
        bathrooms: state.bathrooms,
        propertyType: state.propertyType,
        purchasePrice: state.purchasePrice,
      },
      benchmark: {
        adr: {
          low: Math.round(state.adrLow * bedroomMultiplier),
          base: Math.round(state.adrBase * bedroomMultiplier),
          high: Math.round(state.adrHigh * bedroomMultiplier),
        },
        occupancy: {
          low: state.occLow,
          base: state.occBase,
          high: state.occHigh,
        },
        source: state.lookupResult === 'city' ? 'city_data' : 
                state.lookupResult === 'state_fallback' ? 'state_fallback' : 'user_estimate',
        marketName: state.cityData?.name || state.stateBenchmark?.stateName || 'Unknown',
        sampleSize: state.lookupResult === 'city' ? 50 : 20,
      },
      financing: {
        ...DEFAULT_FINANCING,
        downPaymentPct: state.downPaymentPct,
        interestRate: state.interestRate,
      },
      operating: {
        ...DEFAULT_OPERATING,
        managementPct: state.managementPct,
        cleaningCostPerStay: state.cleaningCost,
      },
      seasonality: {
        type: state.seasonality,
      },
      adrAdjustment: state.adrAdjustment,
      occupancyAdjustment: state.occupancyAdjustment,
    };
    
    const ltr: LTRComparison | undefined = state.showLtrComparison ? {
      ...DEFAULT_LTR,
      monthlyRent: state.ltrMonthlyRent,
      vacancyPct: state.ltrVacancyPct,
      managementPct: state.ltrManagementPct,
    } : undefined;
    
    return calculateDeal(inputs, ltr);
  }, [state]);
  
  // Handle address lookup
  const handleAnalyze = () => {
    if (!state.address.trim()) return;
    
    setState(s => ({ ...s, lookupResult: 'loading' }));
    
    // Simulate brief loading for UX
    setTimeout(() => {
      const result = lookupAddress(state.address);
      
      if (result.type === 'city' && result.city) {
        // Full city data available
        const city = result.city;
        const bedroomMultiplier = getBedroomMultiplier(3); // Base on 3BR
        setState(s => ({
          ...s,
          lookupResult: 'city',
          cityData: city,
          stateBenchmark: null,
          parsedCity: city.name,
          parsedState: city.stateCode,
          purchasePrice: city.medianHomeValue,
          adrLow: Math.round(city.avgADR * 0.8),
          adrBase: city.avgADR,
          adrHigh: Math.round(city.avgADR * 1.25),
          occLow: Math.max(35, city.occupancy - 15),
          occBase: city.occupancy,
          occHigh: Math.min(85, city.occupancy + 10),
          ltrMonthlyRent: estimateLTRRent(city.strMonthlyRevenue),
        }));
      } else if (result.type === 'state_fallback' && result.stateBenchmark) {
        // State-level fallback
        const benchmark = result.stateBenchmark;
        setState(s => ({
          ...s,
          lookupResult: 'state_fallback',
          cityData: null,
          stateBenchmark: benchmark,
          parsedCity: result.parsedAddress?.city || '',
          parsedState: benchmark.stateCode,
          purchasePrice: benchmark.medianHomePrice,
          adrLow: benchmark.adr.low,
          adrBase: benchmark.adr.base,
          adrHigh: benchmark.adr.high,
          occLow: benchmark.occupancy.low,
          occBase: benchmark.occupancy.base,
          occHigh: benchmark.occupancy.high,
          ltrMonthlyRent: Math.round(benchmark.medianHomePrice * 0.006), // 0.6% rule
        }));
      } else {
        // Not found - allow manual entry
        setState(s => ({
          ...s,
          lookupResult: 'not_found',
          cityData: null,
          stateBenchmark: null,
          parsedCity: result.parsedAddress?.city || '',
          parsedState: result.parsedAddress?.state || '',
        }));
      }
    }, 400);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  };
  
  const updateState = (updates: Partial<CalculatorState>) => {
    setState(s => ({ ...s, ...updates }));
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const formatRange = (range: Range, prefix = '$') => {
    if (prefix === '$') {
      return `${formatCurrency(range.low)} – ${formatCurrency(range.high)}`;
    }
    return `${range.low}${prefix} – ${range.high}${prefix}`;
  };
  
  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#787060';
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm mb-3 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Map
          </Link>
          <h1 
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Edge Deal Calculator
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Analyze any US property for STR investment potential
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        
        {/* ================================================================ */}
        {/* MODULE 1: ADDRESS INPUT */}
        {/* ================================================================ */}
        <div 
          className="rounded-2xl p-5"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <label className="block text-sm font-semibold mb-2" style={{ color: '#2b2823' }}>
            Property Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={state.address}
              onChange={(e) => updateState({ address: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 123 Main St, Orlando, FL 32801"
              className="flex-1 px-4 py-3 rounded-xl text-sm"
              style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#ffffff' }}
            />
            <button
              onClick={handleAnalyze}
              disabled={state.lookupResult === 'loading' || !state.address.trim()}
              className="px-5 py-3 font-semibold rounded-xl transition-all disabled:opacity-50"
              style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
            >
              {state.lookupResult === 'loading' ? '...' : 'Analyze'}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: '#787060' }}>
            Works with any US address. We&apos;ll auto-fill market data when available.
          </p>
          
          {/* Data Source Badge */}
          {state.lookupResult === 'city' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" 
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Market Data Found
              </span>
              <span className="text-xs" style={{ color: '#787060' }}>
                {state.cityData?.name}, {state.cityData?.stateCode}
              </span>
            </div>
          )}
          
          {state.lookupResult === 'state_fallback' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Using State Averages
              </span>
              <span className="text-xs" style={{ color: '#787060' }}>
                {state.parsedCity ? `${state.parsedCity}, ` : ''}{state.stateBenchmark?.stateName} — adjust values below
              </span>
            </div>
          )}
          
          {state.lookupResult === 'not_found' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(120, 112, 96, 0.1)', color: '#787060' }}>
                Manual Mode
              </span>
              <span className="text-xs" style={{ color: '#787060' }}>
                Enter your own estimates below
              </span>
            </div>
          )}
        </div>

        {/* Show remaining modules only after address lookup */}
        {state.lookupResult !== 'idle' && state.lookupResult !== 'loading' && (
          <>
            {/* ================================================================ */}
            {/* MODULE 2: PROPERTY PROFILE */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h2 className="font-semibold mb-4" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Property Profile
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Bedrooms */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Bedrooms</label>
                  <select
                    value={state.bedrooms}
                    onChange={(e) => updateState({ bedrooms: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#ffffff' }}
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n} BR</option>
                    ))}
                  </select>
                </div>
                
                {/* Bathrooms */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Bathrooms</label>
                  <select
                    value={state.bathrooms}
                    onChange={(e) => updateState({ bathrooms: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#ffffff' }}
                  >
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4].map(n => (
                      <option key={n} value={n}>{n} BA</option>
                    ))}
                  </select>
                </div>
                
                {/* Property Type */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Property Type</label>
                  <select
                    value={state.propertyType}
                    onChange={(e) => updateState({ propertyType: e.target.value as CalculatorState['propertyType'] })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#ffffff' }}
                  >
                    <option value="house">House</option>
                    <option value="condo">Condo</option>
                    <option value="cabin">Cabin</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </div>
                
                {/* Purchase Price */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#787060' }}>$</span>
                    <input
                      type="number"
                      value={state.purchasePrice}
                      onChange={(e) => updateState({ purchasePrice: parseInt(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 rounded-lg text-sm"
                      style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================ */}
            {/* MODULE 3: MARKET BENCHMARK */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                  Market Benchmark
                </h2>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#e5e3da', color: '#787060' }}>
                  {state.lookupResult === 'city' ? 'City Data' : state.lookupResult === 'state_fallback' ? 'State Estimate' : 'Manual'}
                </span>
              </div>
              
              {/* ADR Range */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: '#787060' }}>
                  Average Daily Rate (ADR) — Low / Base / High
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                    <input
                      type="number"
                      value={state.adrLow}
                      onChange={(e) => updateState({ adrLow: parseInt(e.target.value) || 0 })}
                      className="w-full pl-5 pr-2 py-2 rounded-lg text-sm text-center"
                      style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#fafaf8' }}
                    />
                    <span className="block text-center text-xs mt-1" style={{ color: '#787060' }}>Low</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                    <input
                      type="number"
                      value={state.adrBase}
                      onChange={(e) => updateState({ adrBase: parseInt(e.target.value) || 0 })}
                      className="w-full pl-5 pr-2 py-2 rounded-lg text-sm text-center font-semibold"
                      style={{ border: '1px solid #2b2823', color: '#2b2823', backgroundColor: '#ffffff' }}
                    />
                    <span className="block text-center text-xs mt-1 font-medium" style={{ color: '#2b2823' }}>Base</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                    <input
                      type="number"
                      value={state.adrHigh}
                      onChange={(e) => updateState({ adrHigh: parseInt(e.target.value) || 0 })}
                      className="w-full pl-5 pr-2 py-2 rounded-lg text-sm text-center"
                      style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#fafaf8' }}
                    />
                    <span className="block text-center text-xs mt-1" style={{ color: '#787060' }}>High</span>
                  </div>
                </div>
              </div>
              
              {/* Occupancy Range */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#787060' }}>
                  Occupancy Rate (%) — Low / Base / High
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="number"
                      value={state.occLow}
                      onChange={(e) => updateState({ occLow: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-2 rounded-lg text-sm text-center"
                      style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#fafaf8' }}
                    />
                    <span className="block text-center text-xs mt-1" style={{ color: '#787060' }}>Low</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={state.occBase}
                      onChange={(e) => updateState({ occBase: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-2 rounded-lg text-sm text-center font-semibold"
                      style={{ border: '1px solid #2b2823', color: '#2b2823', backgroundColor: '#ffffff' }}
                    />
                    <span className="block text-center text-xs mt-1 font-medium" style={{ color: '#2b2823' }}>Base</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={state.occHigh}
                      onChange={(e) => updateState({ occHigh: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-2 rounded-lg text-sm text-center"
                      style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: '#fafaf8' }}
                    />
                    <span className="block text-center text-xs mt-1" style={{ color: '#787060' }}>High</span>
                  </div>
                </div>
              </div>
              
              {/* Research Comps Link */}
              <a
                href={`https://www.airbnb.com/s/${encodeURIComponent((state.parsedCity || state.cityData?.name || '') + ', ' + (state.parsedState || state.cityData?.stateCode || ''))}/homes`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#FF5A5F', color: '#ffffff' }}
              >
                Research Comps on Airbnb
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* ================================================================ */}
            {/* MODULE 4: ASSUMPTIONS SLIDERS */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h2 className="font-semibold mb-4" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Assumptions
              </h2>
              
              <div className="space-y-5">
                {/* ADR Adjustment */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium" style={{ color: '#787060' }}>ADR Adjustment</label>
                    <span className="text-sm font-semibold" style={{ color: state.adrAdjustment >= 0 ? '#22c55e' : '#ef4444' }}>
                      {state.adrAdjustment >= 0 ? '+' : ''}{state.adrAdjustment}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={state.adrAdjustment}
                    onChange={(e) => updateState({ adrAdjustment: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ backgroundColor: '#e5e3da' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#9a9488' }}>
                    Adjust for premium amenities, location, or design
                  </p>
                </div>
                
                {/* Occupancy Adjustment */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium" style={{ color: '#787060' }}>Occupancy Adjustment</label>
                    <span className="text-sm font-semibold" style={{ color: state.occupancyAdjustment >= 0 ? '#22c55e' : '#ef4444' }}>
                      {state.occupancyAdjustment >= 0 ? '+' : ''}{state.occupancyAdjustment}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={state.occupancyAdjustment}
                    onChange={(e) => updateState({ occupancyAdjustment: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ backgroundColor: '#e5e3da' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#9a9488' }}>
                    Adjust for marketing effort, reviews, or competition
                  </p>
                </div>
                
                {/* Down Payment */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium" style={{ color: '#787060' }}>Down Payment</label>
                    <span className="text-sm font-semibold" style={{ color: '#2b2823' }}>{state.downPaymentPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={state.downPaymentPct}
                    onChange={(e) => updateState({ downPaymentPct: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ backgroundColor: '#e5e3da' }}
                  />
                </div>
                
                {/* Interest Rate */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium" style={{ color: '#787060' }}>Interest Rate</label>
                    <span className="text-sm font-semibold" style={{ color: '#2b2823' }}>{state.interestRate.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="10"
                    step="0.25"
                    value={state.interestRate}
                    onChange={(e) => updateState({ interestRate: parseFloat(e.target.value) })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ backgroundColor: '#e5e3da' }}
                  />
                </div>
                
                {/* Management Fee */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium" style={{ color: '#787060' }}>Management Fee</label>
                    <span className="text-sm font-semibold" style={{ color: '#2b2823' }}>
                      {state.managementPct === 0 ? 'Self-Managed' : `${state.managementPct}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="5"
                    value={state.managementPct}
                    onChange={(e) => updateState({ managementPct: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ backgroundColor: '#e5e3da' }}
                  />
                </div>
                
                {/* Cleaning Cost */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium" style={{ color: '#787060' }}>Cleaning Cost (per stay)</label>
                    <span className="text-sm font-semibold" style={{ color: '#2b2823' }}>${state.cleaningCost}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="25"
                    value={state.cleaningCost}
                    onChange={(e) => updateState({ cleaningCost: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ backgroundColor: '#e5e3da' }}
                  />
                </div>
                
                {/* Seasonality */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: '#787060' }}>Seasonality Pattern</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['year_round', 'summer_peak', 'winter_peak'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => updateState({ seasonality: type })}
                        className="py-2 px-3 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: state.seasonality === type ? '#2b2823' : '#e5e3da',
                          color: state.seasonality === type ? '#ffffff' : '#787060',
                        }}
                      >
                        {type === 'year_round' ? 'Year-Round' : type === 'summer_peak' ? 'Summer Peak' : 'Winter Peak'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================ */}
            {/* MODULE 5: OUTPUTS */}
            {/* ================================================================ */}
            {dealOutput && (
              <div 
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
              >
                {/* Header with Key Metrics */}
                <div className="p-5" style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
                  <h2 className="font-semibold mb-4" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                    Investment Analysis
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Cash-on-Cash */}
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Cash-on-Cash Return</div>
                      <div className="text-2xl font-bold" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                        {dealOutput.returns.cashOnCash.base}%
                      </div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {dealOutput.returns.cashOnCash.low}% – {dealOutput.returns.cashOnCash.high}%
                      </div>
                    </div>
                    
                    {/* Monthly Cash Flow */}
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Monthly Cash Flow</div>
                      <div className="text-2xl font-bold" style={{ color: dealOutput.returns.cashFlow.base >= 0 ? '#4ade80' : '#f87171', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                        {formatCurrency(dealOutput.returns.cashFlow.base)}
                      </div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {formatCurrency(dealOutput.returns.cashFlow.low)} – {formatCurrency(dealOutput.returns.cashFlow.high)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Detailed Breakdown */}
                <div className="p-5 space-y-4">
                  {/* Revenue */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: '#2b2823' }}>Revenue</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Annual Gross</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.revenue.grossAnnual.base)}</span>
                      </div>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Monthly Gross</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.revenue.grossMonthly.base)}</span>
                      </div>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Effective ADR</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>${dealOutput.revenue.effectiveADR.base}</span>
                      </div>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Occupancy</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{dealOutput.revenue.effectiveOccupancy.base}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expenses */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: '#2b2823' }}>Annual Expenses</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Mortgage (P&I)</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.expenses.mortgage.annualPayment)}</span>
                      </div>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Property Tax</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.expenses.propertyTax)}</span>
                      </div>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Insurance</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.expenses.insurance)}</span>
                      </div>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Cleaning</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.expenses.cleaning.base)}</span>
                      </div>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>Utilities</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.expenses.utilities)}</span>
                      </div>
                      {state.managementPct > 0 && (
                        <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                          <span style={{ color: '#787060' }}>Management ({state.managementPct}%)</span>
                          <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.expenses.management.base)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #e5e3da' }}>
                        <span style={{ color: '#787060' }}>CapEx Reserve (5%)</span>
                        <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.expenses.capexReserve.base)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Returns Summary */}
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#fafaf8' }}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs" style={{ color: '#787060' }}>NOI (Annual)</div>
                        <div className="font-semibold" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.returns.noi.base)}</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: '#787060' }}>Cap Rate</div>
                        <div className="font-semibold" style={{ color: '#2b2823' }}>{dealOutput.returns.capRate.base}%</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: '#787060' }}>Cash Invested</div>
                        <div className="font-semibold" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.returns.totalCashInvested)}</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: '#787060' }}>Break-Even Occ.</div>
                        <div className="font-semibold" style={{ color: '#2b2823' }}>{dealOutput.returns.breakEvenOccupancy}%</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Confidence Score */}
                  <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid #e5e3da' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: '#787060' }}>Confidence</span>
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${getConfidenceColor(dealOutput.confidence.level)}20`,
                          color: getConfidenceColor(dealOutput.confidence.level)
                        }}
                      >
                        {dealOutput.confidence.level.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => updateState({ showAssumptions: !state.showAssumptions })}
                      className="text-xs font-medium"
                      style={{ color: '#2b2823' }}
                    >
                      {state.showAssumptions ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                  
                  {/* Assumptions Drawer */}
                  {state.showAssumptions && (
                    <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: '#fafaf8' }}>
                      <h4 className="text-xs font-semibold mb-2" style={{ color: '#2b2823' }}>Confidence Factors</h4>
                      {dealOutput.confidence.factors.map((factor, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span style={{ color: factor.impact === 'positive' ? '#22c55e' : factor.impact === 'negative' ? '#ef4444' : '#787060' }}>
                            {factor.impact === 'positive' ? '✓' : factor.impact === 'negative' ? '✗' : '○'}
                          </span>
                          <div>
                            <div className="font-medium" style={{ color: '#2b2823' }}>{factor.name}</div>
                            <div style={{ color: '#787060' }}>{factor.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* STR vs LTR COMPARISON */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                  STR vs LTR Comparison
                </h2>
                <button
                  onClick={() => updateState({ showLtrComparison: !state.showLtrComparison })}
                  className="text-xs font-medium px-3 py-1 rounded-full transition-all"
                  style={{ 
                    backgroundColor: state.showLtrComparison ? '#2b2823' : '#e5e3da',
                    color: state.showLtrComparison ? '#ffffff' : '#787060'
                  }}
                >
                  {state.showLtrComparison ? 'Hide' : 'Compare'}
                </button>
              </div>
              
              {state.showLtrComparison && (
                <div className="space-y-4">
                  {/* LTR Inputs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Monthly Rent</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                        <input
                          type="number"
                          value={state.ltrMonthlyRent}
                          onChange={(e) => updateState({ ltrMonthlyRent: parseInt(e.target.value) || 0 })}
                          className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                          style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Vacancy %</label>
                      <input
                        type="number"
                        value={state.ltrVacancyPct}
                        onChange={(e) => updateState({ ltrVacancyPct: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Mgmt %</label>
                      <input
                        type="number"
                        value={state.ltrManagementPct}
                        onChange={(e) => updateState({ ltrManagementPct: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                      />
                    </div>
                  </div>
                  
                  {/* Comparison Results */}
                  {dealOutput?.comparison && dealOutput?.ltr && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#e5e3da' }}>
                        <div className="text-xs mb-1" style={{ color: '#787060' }}>STR Monthly</div>
                        <div className="text-xl font-bold" style={{ color: '#2b2823' }}>
                          {formatCurrency(dealOutput.returns.cashFlow.base)}
                        </div>
                        <div className="text-xs" style={{ color: '#787060' }}>
                          {dealOutput.returns.cashOnCash.base}% CoC
                        </div>
                      </div>
                      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#fafaf8' }}>
                        <div className="text-xs mb-1" style={{ color: '#787060' }}>LTR Monthly</div>
                        <div className="text-xl font-bold" style={{ color: '#2b2823' }}>
                          {formatCurrency(dealOutput.ltr.cashFlow)}
                        </div>
                        <div className="text-xs" style={{ color: '#787060' }}>
                          {dealOutput.ltr.cashOnCash}% CoC
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {dealOutput?.comparison && (
                    <div className="rounded-xl p-4" style={{ backgroundColor: dealOutput.comparison.recommendation === 'str' ? 'rgba(34, 197, 94, 0.1)' : dealOutput.comparison.recommendation === 'ltr' ? 'rgba(245, 158, 11, 0.1)' : '#fafaf8' }}>
                      <div className="text-center">
                        <div className="text-sm font-semibold mb-1" style={{ color: '#2b2823' }}>
                          {dealOutput.comparison.recommendation === 'str' 
                            ? `STR wins by ${formatCurrency(dealOutput.comparison.strVsLtrCashFlow.base)}/mo`
                            : dealOutput.comparison.recommendation === 'ltr'
                            ? `LTR wins by ${formatCurrency(Math.abs(dealOutput.comparison.strVsLtrCashFlow.base))}/mo`
                            : 'Similar returns — consider your time commitment'}
                        </div>
                        <div className="text-xs" style={{ color: '#787060' }}>
                          Break-even STR occupancy: {dealOutput.comparison.breakEvenOccupancy}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* View Full Market Analysis Link */}
            {state.cityData && (
              <Link
                href={`/city/${state.cityData.id}`}
                className="flex items-center justify-center gap-2 w-full py-4 font-semibold rounded-xl transition-all hover:opacity-90"
                style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
              >
                View Full {state.cityData.name} Market Analysis
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </>
        )}
        
        {/* How It Works (shown when idle) */}
        {state.lookupResult === 'idle' && (
          <div 
            className="rounded-2xl p-6 text-center"
            style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd' }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#e5e3da' }}>
              <span className="text-3xl">🏡</span>
            </div>
            <h3 className="font-semibold mb-2" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
              Analyze Any Property
            </h3>
            <p className="text-sm mb-4" style={{ color: '#787060' }}>
              Paste any US address to get instant STR investment metrics including cash-on-cash return, 
              monthly cash flow, and break-even analysis.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">268</div>
                <div className="text-xs" style={{ color: '#787060' }}>Markets with full data</div>
              </div>
              <div>
                <div className="text-2xl mb-1">50</div>
                <div className="text-xs" style={{ color: '#787060' }}>States covered</div>
              </div>
              <div>
                <div className="text-2xl mb-1">∞</div>
                <div className="text-xs" style={{ color: '#787060' }}>Addresses supported</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
