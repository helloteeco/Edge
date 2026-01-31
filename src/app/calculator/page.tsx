"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { lookupAddress, FlatCity, StateBenchmark } from "@/data/helpers";
import {
  calculateDeal,
  DealInputs,
  DealOutput,
  DEFAULT_FINANCING,
  DEFAULT_STARTUP,
  DEFAULT_EXPENSES,
  LTRComparison,
  StartupCosts,
  DetailedExpenses,
  estimateFurnishings,
  estimateLTRRent,
  getBedroomMultiplier,
} from "@/lib/deal-calculator";

// ============================================================================
// SIMPLIFIED STATE - Removed confusing sliders
// ============================================================================

interface CalculatorState {
  // Address
  address: string;
  lookupResult: 'idle' | 'loading' | 'city' | 'state_fallback' | 'not_found';
  cityData: FlatCity | null;
  stateBenchmark: StateBenchmark | null;
  parsedCity: string;
  parsedState: string;
  
  // Property Profile (user enters these)
  bedrooms: number;
  bathrooms: number;
  propertyType: 'house' | 'condo' | 'cabin' | 'apartment' | 'townhouse';
  purchasePrice: number;
  squareFeet: number;
  
  // Market Data (auto-filled, hidden from user)
  marketADR: number;
  marketOccupancy: number;
  
  // Financing
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  closingCostsPct: number;
  
  // Startup Costs
  renoRehab: number;
  furnishings: number;
  amenities: number;
  holdingCosts: number;
  legal: number;
  
  // Operating Expenses
  electric: number;
  water: number;
  gas: number;
  trash: number;
  internet: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  lawnCare: number;
  houseSupplies: number;
  pestControl: number;
  rentalSoftware: number;
  businessLicense: number;
  managementPct: number;
  cleaningPerStay: number;
  capexReservePct: number;
  otaFeesPct: number;
  
  // LTR Comparison
  showLtrComparison: boolean;
  ltrMonthlyRent: number;
  ltrVacancyPct: number;
  ltrRepairsPct: number;
  ltrManagementPct: number;
  ltrUtilities: number;
  
  // UI State
  showStartupCosts: boolean;
  showDetailedExpenses: boolean;
  showMethodology: boolean;
  
  // Autocomplete
  suggestions: Array<{
    displayName: string;
    address: { street: string; city: string; state: string; zipCode: string };
  }>;
  showSuggestions: boolean;
  
  // Mashvisor Data
  mashvisorData: {
    neighborhood: {
      name: string;
      occupancy: number;
      adr: number;
      monthlyRevenue: number;
      traditionalRent: number;
      strCapRate: number;
      ltrCapRate: number;
      listingsCount: number;
      mashMeter: number;
      walkScore: number;
    } | null;
    dataSource: 'mashvisor' | 'local' | null;
  } | null;
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
  squareFeet: 1500,
  marketADR: 150,
  marketOccupancy: 60,
  downPaymentPct: 25,
  interestRate: 7.0,
  loanTermYears: 30,
  closingCostsPct: 3,
  // Startup Costs
  renoRehab: 15000,
  furnishings: 0,
  amenities: 5000,
  holdingCosts: 3000,
  legal: 1000,
  // Operating Expenses
  electric: 100,
  water: 60,
  gas: 30,
  trash: 25,
  internet: 60,
  propertyTaxAnnual: 0,
  insuranceAnnual: 2000,
  lawnCare: 50,
  houseSupplies: 50,
  pestControl: 40,
  rentalSoftware: 20,
  businessLicense: 100,
  managementPct: 0,
  cleaningPerStay: 150,
  capexReservePct: 5,
  otaFeesPct: 3,
  // LTR
  showLtrComparison: false,
  ltrMonthlyRent: 1500,
  ltrVacancyPct: 5,
  ltrRepairsPct: 5,
  ltrManagementPct: 8,
  ltrUtilities: 0,
  // UI
  showStartupCosts: false,
  showDetailedExpenses: false,
  showMethodology: false,
  // Autocomplete
  suggestions: [],
  showSuggestions: false,
  // Mashvisor
  mashvisorData: null,
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function DealCalculatorPage() {
  const [state, setState] = useState<CalculatorState>(initialState);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch address suggestions for autocomplete
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setState(s => ({ ...s, suggestions: [], showSuggestions: false }));
      return;
    }
    
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setState(s => ({
        ...s,
        suggestions: data.suggestions || [],
        showSuggestions: (data.suggestions?.length || 0) > 0,
      }));
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };
  
  // Handle address input change with debounce
  const handleAddressChange = (value: string) => {
    setState(s => ({ ...s, address: value }));
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };
  
  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: typeof state.suggestions[0]) => {
    const { street, city, state: stateCode, zipCode } = suggestion.address;
    const fullAddress = `${street}, ${city}, ${stateCode} ${zipCode}`;
    setState(s => ({
      ...s,
      address: fullAddress,
      suggestions: [],
      showSuggestions: false,
    }));
  };
  
  // Auto-calculate values
  const autoFurnishings = estimateFurnishings(state.squareFeet);
  const autoPropertyTax = Math.round(state.purchasePrice * 0.015);
  
  // Calculate ADR adjusted for bedrooms
  const bedroomMultiplier = getBedroomMultiplier(state.bedrooms);
  const adjustedADR = Math.round(state.marketADR * bedroomMultiplier);
  
  // Calculate annual revenue estimate
  const estimatedAnnualRevenue = Math.round(adjustedADR * (state.marketOccupancy / 100) * 365);
  const revenueRangeLow = Math.round(estimatedAnnualRevenue * 0.75);
  const revenueRangeHigh = Math.round(estimatedAnnualRevenue * 1.25);
  
  // Calculate deal output
  const dealOutput = useMemo<DealOutput | null>(() => {
    if (state.lookupResult === 'idle' || state.lookupResult === 'loading') {
      return null;
    }
    
    const startup: StartupCosts = {
      renoRehab: state.renoRehab,
      furnishings: state.furnishings > 0 ? state.furnishings : autoFurnishings,
      amenities: state.amenities,
      holdingCosts: state.holdingCosts,
      legal: state.legal,
    };
    
    const expenses: DetailedExpenses = {
      electric: state.electric,
      water: state.water,
      gas: state.gas,
      trash: state.trash,
      internet: state.internet,
      propertyTaxAnnual: state.propertyTaxAnnual > 0 ? state.propertyTaxAnnual : autoPropertyTax,
      insuranceAnnual: state.insuranceAnnual,
      lawnCare: state.lawnCare,
      houseSupplies: state.houseSupplies,
      pestControl: state.pestControl,
      rentalSoftware: state.rentalSoftware,
      businessLicense: state.businessLicense,
      managementPct: state.managementPct,
      cleaningPerStay: state.cleaningPerStay,
      capexReservePct: state.capexReservePct,
      otaFeesPct: state.otaFeesPct,
    };
    
    // Build ranges based on market data
    const adrBase = adjustedADR;
    const occBase = state.marketOccupancy;
    
    const inputs: DealInputs = {
      property: {
        bedrooms: state.bedrooms,
        bathrooms: state.bathrooms,
        propertyType: state.propertyType,
        purchasePrice: state.purchasePrice,
        squareFeet: state.squareFeet,
      },
      benchmark: {
        adr: {
          low: Math.round(adrBase * 0.85),
          base: adrBase,
          high: Math.round(adrBase * 1.15),
        },
        occupancy: {
          low: Math.max(35, occBase - 12),
          base: occBase,
          high: Math.min(85, occBase + 10),
        },
        source: state.lookupResult === 'city' ? 'city_data' : 
                state.lookupResult === 'state_fallback' ? 'state_fallback' : 'user_estimate',
        marketName: state.cityData?.name || state.stateBenchmark?.stateName || 'Unknown',
        sampleSize: state.lookupResult === 'city' ? 50 : 20,
      },
      financing: {
        downPaymentPct: state.downPaymentPct,
        interestRate: state.interestRate,
        loanTermYears: state.loanTermYears,
        closingCostsPct: state.closingCostsPct,
      },
      startup,
      expenses,
      seasonality: { type: 'year_round' },
      adrAdjustment: 0,
      occupancyAdjustment: 0,
      avgStayLength: 3,
    };
    
    const ltr: LTRComparison | undefined = state.showLtrComparison ? {
      monthlyRent: state.ltrMonthlyRent,
      vacancyPct: state.ltrVacancyPct,
      repairsPct: state.ltrRepairsPct,
      managementPct: state.ltrManagementPct,
      utilitiesMonthly: state.ltrUtilities,
    } : undefined;
    
    return calculateDeal(inputs, ltr);
  }, [state, adjustedADR, autoFurnishings, autoPropertyTax]);
  
  // Handle address lookup - tries Mashvisor API first, falls back to local data
  const handleAnalyze = async () => {
    if (!state.address.trim()) return;
    
    setState(s => ({ ...s, lookupResult: 'loading', showSuggestions: false }));
    
    try {
      // Try Mashvisor API first
      const response = await fetch('/api/mashvisor/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: state.address }),
      });
      
      const data = await response.json();
      
      if (data.success && data.neighborhood) {
        // Mashvisor data found!
        const nb = data.neighborhood;
        const prop = data.property;
        setState(s => ({
          ...s,
          lookupResult: 'city',
          cityData: null,
          stateBenchmark: null,
          parsedCity: prop.city || '',
          parsedState: prop.state || '',
          purchasePrice: prop.listPrice || prop.lastSalePrice || s.purchasePrice,
          marketADR: nb.adr || 150,
          marketOccupancy: nb.occupancy || 60,
          bedrooms: prop.bedrooms || s.bedrooms,
          bathrooms: prop.bathrooms || s.bathrooms,
          squareFeet: prop.sqft || s.squareFeet,
          ltrMonthlyRent: nb.traditionalRent || Math.round((prop.listPrice || 250000) * 0.006),
          propertyTaxAnnual: Math.round((prop.listPrice || 250000) * 0.015),
          mashvisorData: {
            neighborhood: {
              name: nb.name,
              occupancy: nb.occupancy,
              adr: nb.adr,
              monthlyRevenue: nb.monthlyRevenue,
              traditionalRent: nb.traditionalRent,
              strCapRate: nb.strCapRate,
              ltrCapRate: nb.ltrCapRate,
              listingsCount: nb.listingsCount,
              mashMeter: nb.mashMeter,
              walkScore: nb.walkScore,
            },
            dataSource: 'mashvisor',
          },
        }));
        return;
      }
    } catch (error) {
      console.error('Mashvisor API error:', error);
    }
    
    // Fall back to local data
    const result = lookupAddress(state.address);
    
    if (result.type === 'city' && result.city) {
      const city = result.city;
      setState(s => ({
        ...s,
        lookupResult: 'city',
        cityData: city,
        stateBenchmark: null,
        parsedCity: city.name,
        parsedState: city.stateCode,
        purchasePrice: city.medianHomeValue,
        marketADR: city.avgADR,
        marketOccupancy: city.occupancy,
        ltrMonthlyRent: estimateLTRRent(city.strMonthlyRevenue),
        propertyTaxAnnual: Math.round(city.medianHomeValue * 0.015),
        mashvisorData: { neighborhood: null, dataSource: 'local' },
      }));
    } else if (result.type === 'state_fallback' && result.stateBenchmark) {
      const benchmark = result.stateBenchmark;
      setState(s => ({
        ...s,
        lookupResult: 'state_fallback',
        cityData: null,
        stateBenchmark: benchmark,
        parsedCity: result.parsedAddress?.city || '',
        parsedState: benchmark.stateCode,
        purchasePrice: benchmark.medianHomePrice,
        marketADR: benchmark.adr.base,
        marketOccupancy: benchmark.occupancy.base,
        ltrMonthlyRent: Math.round(benchmark.medianHomePrice * 0.006),
        propertyTaxAnnual: Math.round(benchmark.medianHomePrice * 0.015),
        mashvisorData: { neighborhood: null, dataSource: 'local' },
      }));
    } else {
      setState(s => ({
        ...s,
        lookupResult: 'not_found',
        cityData: null,
        stateBenchmark: null,
        parsedCity: result.parsedAddress?.city || '',
        parsedState: result.parsedAddress?.state || '',
        mashvisorData: null,
      }));
    }
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
  
  // Build Airbnb search URL
  const airbnbSearchUrl = state.parsedCity && state.parsedState
    ? `https://www.airbnb.com/s/${encodeURIComponent(state.parsedCity)}--${encodeURIComponent(state.parsedState)}/homes`
    : 'https://www.airbnb.com';
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-6" style={{ backgroundColor: '#2b2823' }}>
        <Link href="/" className="inline-flex items-center gap-1 text-sm mb-4" style={{ color: '#9a9488' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Map
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
          Deal Calculator
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9a9488' }}>
          Analyze any property&apos;s STR investment potential
        </p>
      </div>
      
      <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
        
        {/* ================================================================ */}
        {/* MODULE 1: ADDRESS INPUT */}
        {/* ================================================================ */}
        <div 
          className="rounded-2xl p-5"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          <h2 className="font-semibold mb-3" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Property Address
          </h2>
          
          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Start typing an address..."
                value={state.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => state.suggestions.length > 0 && setState(s => ({ ...s, showSuggestions: true }))}
                className="flex-1 px-4 py-3 rounded-xl text-sm"
                style={{ border: '2px solid #d8d6cd', color: '#2b2823' }}
              />
              <button
                onClick={handleAnalyze}
                disabled={state.lookupResult === 'loading'}
                className="px-5 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ backgroundColor: '#787060', color: '#ffffff' }}
              >
                {state.lookupResult === 'loading' ? '...' : 'Analyze'}
              </button>
            </div>
            
            {/* Autocomplete Suggestions */}
            {state.showSuggestions && state.suggestions.length > 0 && (
              <div 
                className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              >
                {state.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: '#2b2823', borderBottom: index < state.suggestions.length - 1 ? '1px solid #e5e3da' : 'none' }}
                  >
                    <div className="font-medium">{suggestion.address.street}</div>
                    <div className="text-xs" style={{ color: '#787060' }}>
                      {suggestion.address.city}, {suggestion.address.state} {suggestion.address.zipCode}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <p className="text-xs mt-2" style={{ color: '#787060' }}>
            Powered by Mashvisor • Real-time STR market data
          </p>
          
          {/* Status Badge */}
          {state.lookupResult === 'city' && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: state.mashvisorData?.dataSource === 'mashvisor' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: state.mashvisorData?.dataSource === 'mashvisor' ? '#22c55e' : '#3b82f6' }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {state.mashvisorData?.dataSource === 'mashvisor' ? 'Live Mashvisor Data' : 'Local Market Data'}
                </span>
                <span className="text-xs" style={{ color: '#787060' }}>{state.parsedCity}, {state.parsedState}</span>
              </div>
              
              {/* Mashvisor Market Intelligence Panel */}
              {state.mashvisorData?.neighborhood && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f8f7f4', border: '1px solid #e5e3da' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold" style={{ color: '#2b2823' }}>Market Intelligence</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#2b2823', color: '#fff' }}>
                      {state.mashvisorData.neighborhood.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs" style={{ color: '#787060' }}>Occupancy</div>
                      <div className="text-lg font-bold" style={{ color: '#2b2823' }}>{state.mashvisorData.neighborhood.occupancy}%</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#787060' }}>Avg Nightly Rate</div>
                      <div className="text-lg font-bold" style={{ color: '#2b2823' }}>${state.mashvisorData.neighborhood.adr}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#787060' }}>STR Monthly Revenue</div>
                      <div className="text-lg font-bold" style={{ color: '#2b2823' }}>${state.mashvisorData.neighborhood.monthlyRevenue?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#787060' }}>Active Listings</div>
                      <div className="text-lg font-bold" style={{ color: '#2b2823' }}>{state.mashvisorData.neighborhood.listingsCount}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#787060' }}>STR Cap Rate</div>
                      <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{state.mashvisorData.neighborhood.strCapRate}%</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: '#787060' }}>LTR Cap Rate</div>
                      <div className="text-lg font-bold" style={{ color: '#787060' }}>{state.mashvisorData.neighborhood.ltrCapRate}%</div>
                    </div>
                  </div>
                  {state.mashvisorData.neighborhood.mashMeter && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid #e5e3da' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#787060' }}>Mash Meter Score</span>
                        <span className="text-sm font-bold" style={{ color: state.mashvisorData.neighborhood.mashMeter >= 70 ? '#22c55e' : state.mashvisorData.neighborhood.mashMeter >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {state.mashvisorData.neighborhood.mashMeter}/100
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              <span className="text-xs" style={{ color: '#787060' }}>{state.parsedState}</span>
            </div>
          )}
          
          {state.lookupResult === 'not_found' && (
            <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#fef2f2' }}>
              <p className="text-xs" style={{ color: '#ef4444' }}>
                City not in our database. Enter property details manually below.
              </p>
            </div>
          )}
        </div>
        
        {/* Show rest of calculator after address lookup */}
        {state.lookupResult !== 'idle' && state.lookupResult !== 'loading' && (
          <>
            {/* ================================================================ */}
            {/* HERO: ESTIMATED ANNUAL REVENUE */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: '#2b2823', boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.2)' }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: '#9a9488' }}>ESTIMATED ANNUAL REVENUE</p>
              <p className="text-4xl font-bold mb-2" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                {formatCurrency(estimatedAnnualRevenue)}
              </p>
              <p className="text-sm" style={{ color: '#787060' }}>
                Range: {formatCurrency(revenueRangeLow)} – {formatCurrency(revenueRangeHigh)}
              </p>
              
              {/* How we calculated this */}
              <button
                onClick={() => updateState({ showMethodology: !state.showMethodology })}
                className="mt-4 text-xs font-medium underline"
                style={{ color: '#9a9488' }}
              >
                {state.showMethodology ? 'Hide methodology' : 'How we calculated this'}
              </button>
              
              {state.showMethodology && (
                <div className="mt-4 p-4 rounded-xl text-left" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-xs mb-3" style={{ color: '#e5e3da' }}>
                    <strong>Formula:</strong> ADR × Occupancy × 365 days
                  </p>
                  <div className="space-y-2 text-xs" style={{ color: '#9a9488' }}>
                    <div className="flex justify-between">
                      <span>Market Base ADR ({state.parsedCity || state.parsedState})</span>
                      <span style={{ color: '#e5e3da' }}>${state.marketADR}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bedroom Adjustment ({state.bedrooms}BR = {Math.round((bedroomMultiplier - 1) * 100)}% premium)</span>
                      <span style={{ color: '#e5e3da' }}>×{bedroomMultiplier.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your Adjusted ADR</span>
                      <span style={{ color: '#22c55e' }}>${adjustedADR}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Occupancy</span>
                      <span style={{ color: '#e5e3da' }}>{state.marketOccupancy}%</span>
                    </div>
                    <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <span>Calculation</span>
                      <span style={{ color: '#e5e3da' }}>${adjustedADR} × {state.marketOccupancy}% × 365</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* ================================================================ */}
            {/* MODULE 2: PROPERTY PROFILE */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h2 className="font-semibold mb-4" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Property Details
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Purchase Price */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#787060' }}>$</span>
                    <input
                      type="number"
                      value={state.purchasePrice}
                      onChange={(e) => updateState({ purchasePrice: parseInt(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-3 rounded-xl text-lg font-semibold"
                      style={{ border: '2px solid #d8d6cd', color: '#2b2823' }}
                    />
                  </div>
                </div>
                
                {/* Bedrooms */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Bedrooms</label>
                  <select
                    value={state.bedrooms}
                    onChange={(e) => updateState({ bedrooms: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
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
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                  >
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4].map(n => (
                      <option key={n} value={n}>{n} BA</option>
                    ))}
                  </select>
                </div>
                
                {/* Square Feet */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Square Feet</label>
                  <input
                    type="number"
                    value={state.squareFeet}
                    onChange={(e) => updateState({ squareFeet: parseInt(e.target.value) || 1000 })}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                  />
                </div>
                
                {/* Property Type */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Property Type</label>
                  <select
                    value={state.propertyType}
                    onChange={(e) => updateState({ propertyType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                  >
                    <option value="house">House</option>
                    <option value="condo">Condo</option>
                    <option value="cabin">Cabin</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </div>
              </div>
              
              {/* Research Comps Link */}
              <a
                href={airbnbSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-sm transition-all"
                style={{ backgroundColor: '#FF5A5F', color: '#ffffff' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Research Comps on Airbnb
              </a>
              <p className="text-xs text-center mt-2" style={{ color: '#787060' }}>
                See what similar properties charge in this area
              </p>
            </div>
            
            {/* ================================================================ */}
            {/* FINANCING */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <h2 className="font-semibold mb-4" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Financing
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Down Payment */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Down Payment %</label>
                  <input
                    type="number"
                    value={state.downPaymentPct}
                    onChange={(e) => updateState({ downPaymentPct: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                  />
                  {state.downPaymentPct < 20 && (
                    <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>PMI will apply</p>
                  )}
                </div>
                
                {/* Interest Rate */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Interest Rate %</label>
                  <input
                    type="number"
                    step="0.125"
                    value={state.interestRate}
                    onChange={(e) => updateState({ interestRate: parseFloat(e.target.value) || 7 })}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                  />
                </div>
                
                {/* Loan Term */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Loan Term</label>
                  <select
                    value={state.loanTermYears}
                    onChange={(e) => updateState({ loanTermYears: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                  >
                    <option value={15}>15 Years</option>
                    <option value={20}>20 Years</option>
                    <option value={30}>30 Years</option>
                  </select>
                </div>
                
                {/* Closing Costs */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Closing Costs %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={state.closingCostsPct}
                    onChange={(e) => updateState({ closingCostsPct: parseFloat(e.target.value) || 3 })}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                  />
                </div>
              </div>
            </div>
            
            {/* ================================================================ */}
            {/* STARTUP COSTS (Expandable) */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <button
                onClick={() => updateState({ showStartupCosts: !state.showStartupCosts })}
                className="w-full flex items-center justify-between p-5"
              >
                <div>
                  <h2 className="font-semibold text-left" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                    Startup Costs
                  </h2>
                  <p className="text-xs mt-1" style={{ color: '#787060' }}>
                    Total: {formatCurrency(state.renoRehab + (state.furnishings || autoFurnishings) + state.amenities + state.holdingCosts + state.legal)}
                  </p>
                </div>
                <svg 
                  className={`w-5 h-5 transition-transform ${state.showStartupCosts ? 'rotate-180' : ''}`} 
                  fill="none" stroke="#787060" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {state.showStartupCosts && (
                <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid #e5e3da' }}>
                  <div className="pt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Reno/Rehab</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                        <input
                          type="number"
                          value={state.renoRehab}
                          onChange={(e) => updateState({ renoRehab: parseInt(e.target.value) || 0 })}
                          className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                          style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>
                        Furnishings <span className="text-xs" style={{ color: '#9a9488' }}>($15/sqft)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                        <input
                          type="number"
                          value={state.furnishings || autoFurnishings}
                          onChange={(e) => updateState({ furnishings: parseInt(e.target.value) || 0 })}
                          className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                          style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: state.furnishings === 0 ? '#fafaf8' : '#fff' }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Amenities</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                        <input
                          type="number"
                          value={state.amenities}
                          onChange={(e) => updateState({ amenities: parseInt(e.target.value) || 0 })}
                          className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                          style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Holding Costs</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                        <input
                          type="number"
                          value={state.holdingCosts}
                          onChange={(e) => updateState({ holdingCosts: parseInt(e.target.value) || 0 })}
                          className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                          style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#787060' }}>Legal Fees</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                        <input
                          type="number"
                          value={state.legal}
                          onChange={(e) => updateState({ legal: parseInt(e.target.value) || 0 })}
                          className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                          style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* ================================================================ */}
            {/* OPERATING EXPENSES (Expandable) */}
            {/* ================================================================ */}
            <div 
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <button
                onClick={() => updateState({ showDetailedExpenses: !state.showDetailedExpenses })}
                className="w-full flex items-center justify-between p-5"
              >
                <div>
                  <h2 className="font-semibold text-left" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                    Operating Expenses
                  </h2>
                  <p className="text-xs mt-1" style={{ color: '#787060' }}>
                    15 line items • Tap to customize
                  </p>
                </div>
                <svg 
                  className={`w-5 h-5 transition-transform ${state.showDetailedExpenses ? 'rotate-180' : ''}`} 
                  fill="none" stroke="#787060" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {state.showDetailedExpenses && (
                <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid #e5e3da' }}>
                  {/* Utilities */}
                  <div className="pt-4">
                    <h3 className="text-xs font-semibold mb-3" style={{ color: '#787060' }}>UTILITIES (Monthly)</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'electric', label: 'Electric' },
                        { key: 'water', label: 'Water' },
                        { key: 'gas', label: 'Gas' },
                        { key: 'trash', label: 'Trash' },
                        { key: 'internet', label: 'Internet' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs mb-1" style={{ color: '#787060' }}>{label}</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                            <input
                              type="number"
                              value={(state as any)[key]}
                              onChange={(e) => updateState({ [key]: parseInt(e.target.value) || 0 })}
                              className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                              style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Property Costs */}
                  <div>
                    <h3 className="text-xs font-semibold mb-3" style={{ color: '#787060' }}>PROPERTY (Annual)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#787060' }}>
                          Property Tax <span style={{ color: '#9a9488' }}>(1.5% default)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                          <input
                            type="number"
                            value={state.propertyTaxAnnual || autoPropertyTax}
                            onChange={(e) => updateState({ propertyTaxAnnual: parseInt(e.target.value) || 0 })}
                            className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid #d8d6cd', color: '#2b2823', backgroundColor: state.propertyTaxAnnual === 0 ? '#fafaf8' : '#fff' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#787060' }}>Insurance</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                          <input
                            type="number"
                            value={state.insuranceAnnual}
                            onChange={(e) => updateState({ insuranceAnnual: parseInt(e.target.value) || 0 })}
                            className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Variable Costs */}
                  <div>
                    <h3 className="text-xs font-semibold mb-3" style={{ color: '#787060' }}>VARIABLE COSTS</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#787060' }}>Management Fee %</label>
                        <input
                          type="number"
                          value={state.managementPct}
                          onChange={(e) => updateState({ managementPct: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                        />
                        {state.managementPct === 0 && (
                          <p className="text-xs mt-1" style={{ color: '#22c55e' }}>Self-managed</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#787060' }}>Cleaning (per stay)</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787060' }}>$</span>
                          <input
                            type="number"
                            value={state.cleaningPerStay}
                            onChange={(e) => updateState({ cleaningPerStay: parseInt(e.target.value) || 0 })}
                            className="w-full pl-5 pr-2 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* ================================================================ */}
            {/* INVESTMENT ANALYSIS */}
            {/* ================================================================ */}
            {dealOutput && (
              <div 
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
              >
                {/* Cash on Cash - Hero Metric */}
                <div className="p-6 text-center" style={{ backgroundColor: dealOutput.returns.cashOnCash.base >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#787060' }}>CASH-ON-CASH RETURN</p>
                  <p 
                    className="text-4xl font-bold"
                    style={{ 
                      color: dealOutput.returns.cashOnCash.base >= 8 ? '#22c55e' : 
                             dealOutput.returns.cashOnCash.base >= 0 ? '#f59e0b' : '#ef4444',
                      fontFamily: 'Source Serif Pro, Georgia, serif'
                    }}
                  >
                    {dealOutput.returns.cashOnCash.base.toFixed(1)}%
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#787060' }}>
                    Range: {dealOutput.returns.cashOnCash.low.toFixed(1)}% to {dealOutput.returns.cashOnCash.high.toFixed(1)}%
                  </p>
                  
                  {/* Quick verdict */}
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: dealOutput.returns.cashOnCash.base >= 8 ? 'rgba(34, 197, 94, 0.1)' : 
                                       dealOutput.returns.cashOnCash.base >= 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: dealOutput.returns.cashOnCash.base >= 8 ? '#22c55e' : 
                             dealOutput.returns.cashOnCash.base >= 0 ? '#f59e0b' : '#ef4444'
                    }}
                  >
                    {dealOutput.returns.cashOnCash.base >= 12 ? '🔥 Excellent Deal' :
                     dealOutput.returns.cashOnCash.base >= 8 ? '✅ Good Deal' :
                     dealOutput.returns.cashOnCash.base >= 4 ? '⚠️ Marginal' :
                     dealOutput.returns.cashOnCash.base >= 0 ? '⚠️ Break-even' : '❌ Negative Cash Flow'}
                  </div>
                </div>
                
                {/* Monthly Cash Flow */}
                <div className="p-5" style={{ borderTop: '1px solid #e5e3da' }}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium" style={{ color: '#2b2823' }}>Monthly Cash Flow</span>
                    <span 
                      className="text-xl font-bold"
                      style={{ color: dealOutput.returns.cashFlowMonthly.base >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {formatCurrency(dealOutput.returns.cashFlowMonthly.base)}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#787060' }}>
                    Range: {formatCurrency(dealOutput.returns.cashFlowMonthly.low)} to {formatCurrency(dealOutput.returns.cashFlowMonthly.high)}
                  </p>
                </div>
                
                {/* Cash to Close */}
                <div className="p-5" style={{ borderTop: '1px solid #e5e3da' }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: '#2b2823' }}>Total Cash Required</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between py-1">
                      <span style={{ color: '#787060' }}>Down Payment ({state.downPaymentPct}%)</span>
                      <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.cashToClose.downPayment)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span style={{ color: '#787060' }}>Closing Costs</span>
                      <span className="font-medium" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.cashToClose.closingCosts)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span style={{ color: '#787060' }}>Startup (Reno + Furnish + etc)</span>
                      <span className="font-medium" style={{ color: '#2b2823' }}>
                        {formatCurrency(dealOutput.cashToClose.renoRehab + dealOutput.cashToClose.furnishings + dealOutput.cashToClose.amenities + dealOutput.cashToClose.holdingCosts + dealOutput.cashToClose.legal)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 mt-2" style={{ borderTop: '1px solid #e5e3da' }}>
                      <span className="font-semibold" style={{ color: '#2b2823' }}>Total</span>
                      <span className="font-bold text-lg" style={{ color: '#2b2823' }}>{formatCurrency(dealOutput.cashToClose.total)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Key Metrics */}
                <div className="p-5" style={{ borderTop: '1px solid #e5e3da' }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#fafaf8' }}>
                      <p className="text-xs" style={{ color: '#787060' }}>Break-Even Occupancy</p>
                      <p className="text-lg font-semibold" style={{ color: '#2b2823' }}>{dealOutput.returns.breakEvenOccupancy}%</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#fafaf8' }}>
                      <p className="text-xs" style={{ color: '#787060' }}>Payback Period</p>
                      <p className="text-lg font-semibold" style={{ color: '#2b2823' }}>
                        {dealOutput.returns.paybackMonths.base < 999 
                          ? `${Math.round(dealOutput.returns.paybackMonths.base / 12 * 10) / 10} years`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
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
                  STR vs Long-Term Rental
                </h2>
                <button
                  onClick={() => updateState({ showLtrComparison: !state.showLtrComparison })}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
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
                  <div className="grid grid-cols-2 gap-3">
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
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: '1px solid #d8d6cd', color: '#2b2823' }}
                      />
                    </div>
                  </div>
                  
                  {/* Comparison Results */}
                  {dealOutput?.comparison && (
                    <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#fafaf8' }}>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#ffffff' }}>
                          <p className="text-xs font-medium mb-1" style={{ color: '#787060' }}>STR Monthly</p>
                          <p className="text-lg font-bold" style={{ color: dealOutput.returns.cashFlowMonthly.base >= 0 ? '#22c55e' : '#ef4444' }}>
                            {formatCurrency(dealOutput.returns.cashFlowMonthly.base)}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#ffffff' }}>
                          <p className="text-xs font-medium mb-1" style={{ color: '#787060' }}>LTR Monthly</p>
                          <p className="text-lg font-bold" style={{ color: dealOutput.comparison.ltrCashFlowMonthly >= 0 ? '#22c55e' : '#ef4444' }}>
                            {formatCurrency(dealOutput.comparison.ltrCashFlowMonthly)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Verdict */}
                      <div className="text-center p-3 rounded-lg" style={{ 
                        backgroundColor: dealOutput.comparison.difference.base >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                      }}>
                        <p className="text-sm font-semibold" style={{ 
                          color: dealOutput.comparison.difference.base >= 0 ? '#22c55e' : '#ef4444'
                        }}>
                          {dealOutput.comparison.difference.base >= 0 
                            ? `STR wins by ${formatCurrency(dealOutput.comparison.difference.base)}/mo`
                            : `LTR wins by ${formatCurrency(Math.abs(dealOutput.comparison.difference.base))}/mo`}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#787060' }}>
                          Break-even STR occupancy: {dealOutput.comparison.breakEvenOccupancy}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </>
        )}
        
        {/* Bottom Padding for Navigation */}
        <div className="h-24"></div>
      </div>
    </div>
  );
}
