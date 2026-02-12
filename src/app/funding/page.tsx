'use client';

import { useState } from 'react';
import {
  BankIcon,
  CreativeIcon,
  AlternativeIcon,
  RetirementIcon,
  PartnershipIcon,
  GovernmentIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  DollarIcon,
  LightbulbIcon,
  WarningIcon,
  TargetIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  BuildingIcon,
  ArrowRightIcon,
} from '@/components/Icons';
import AuthHeader from '@/components/AuthHeader';
import { StuckHelper } from '@/components/StuckHelper';

// Types
interface FundingMethod {
  id: string;
  name: string;
  icon: string;
  category: 'traditional' | 'creative' | 'alternative' | 'retirement' | 'partnership' | 'government';
  riskLevel: 'low' | 'medium' | 'high';
  legalNote?: string; // For grey-zone strategies
  description: string;
  bestFor: string[];
  requirements: string[];
  pros: string[];
  cons: string[];
  typicalTerms?: string;
  howToMakeSafe?: string; // For grey-zone strategies
  tags: string[]; // For quiz matching
}

interface QuizQuestion {
  id: string;
  question: string;
  options: { value: string; label: string; tags: string[] }[];
}

// Quiz Questions
const quizQuestions: QuizQuestion[] = [
  {
    id: 'credit',
    question: 'What is your credit score range?',
    options: [
      { value: '750+', label: '750+ (Excellent)', tags: ['good-credit', 'conventional-eligible'] },
      { value: '700-749', label: '700-749 (Good)', tags: ['good-credit'] },
      { value: '650-699', label: '650-699 (Fair)', tags: ['fair-credit'] },
      { value: 'below-650', label: 'Below 650 or Unknown', tags: ['poor-credit', 'credit-flexible'] },
    ],
  },
  {
    id: 'cash',
    question: 'How much cash do you have available for down payment?',
    options: [
      { value: '100k+', label: '$100,000+', tags: ['high-cash', 'can-partner'] },
      { value: '50-100k', label: '$50,000 - $100,000', tags: ['medium-cash'] },
      { value: '20-50k', label: '$20,000 - $50,000', tags: ['low-cash'] },
      { value: 'under-20k', label: 'Under $20,000', tags: ['no-cash', 'creative-needed'] },
    ],
  },
  {
    id: 'income',
    question: 'Can you document W-2 or stable self-employment income?',
    options: [
      { value: 'w2', label: 'Yes, W-2 employee with 2+ years', tags: ['w2-income', 'conventional-eligible'] },
      { value: 'self-employed', label: 'Self-employed with tax returns', tags: ['self-employed', 'bank-statement-eligible'] },
      { value: 'variable', label: 'Variable/gig income', tags: ['variable-income', 'dscr-needed'] },
      { value: 'none', label: 'Cannot document income', tags: ['no-income-docs', 'dscr-needed', 'creative-needed'] },
    ],
  },
  {
    id: 'existing-property',
    question: 'Do you own any real estate currently?',
    options: [
      { value: 'primary-equity', label: 'Yes, primary home with equity', tags: ['has-equity', 'heloc-eligible', 'cashout-eligible'] },
      { value: 'investment', label: 'Yes, investment property', tags: ['has-equity', 'experienced-investor'] },
      { value: 'multiple', label: 'Yes, multiple properties', tags: ['has-equity', 'experienced-investor', 'portfolio-eligible'] },
      { value: 'none', label: 'No, first-time buyer', tags: ['first-time', 'no-equity'] },
    ],
  },
  {
    id: 'military',
    question: 'Are you a veteran or active military?',
    options: [
      { value: 'yes', label: 'Yes', tags: ['veteran', 'va-eligible'] },
      { value: 'no', label: 'No', tags: [] },
    ],
  },
  {
    id: 'retirement',
    question: 'Do you have retirement accounts (401k, IRA)?',
    options: [
      { value: '100k+', label: 'Yes, $100,000+', tags: ['retirement-funds', '401k-eligible', 'sdira-eligible'] },
      { value: '50-100k', label: 'Yes, $50,000 - $100,000', tags: ['retirement-funds', '401k-eligible'] },
      { value: 'under-50k', label: 'Yes, under $50,000', tags: ['small-retirement'] },
      { value: 'none', label: 'No retirement accounts', tags: [] },
    ],
  },
  {
    id: 'timeline',
    question: 'How quickly do you need to close?',
    options: [
      { value: 'asap', label: 'ASAP (under 2 weeks)', tags: ['fast-close', 'hard-money-fit'] },
      { value: '30-days', label: '30 days', tags: ['normal-timeline'] },
      { value: '60-days', label: '60+ days', tags: ['flexible-timeline', 'seller-finance-fit'] },
      { value: 'no-rush', label: 'No rush, finding the right deal', tags: ['flexible-timeline'] },
    ],
  },
  {
    id: 'risk-tolerance',
    question: 'What is your risk tolerance?',
    options: [
      { value: 'conservative', label: 'Conservative - proven methods only', tags: ['low-risk'] },
      { value: 'moderate', label: 'Moderate - some creative strategies OK', tags: ['medium-risk'] },
      { value: 'aggressive', label: 'Aggressive - willing to try creative deals', tags: ['high-risk', 'creative-ok'] },
    ],
  },
];

// All 45 Funding Methods
const fundingMethods: FundingMethod[] = [
  // TRADITIONAL LOANS
  {
    id: 'vacation-home-loan',
    name: 'Vacation Home Loan',
    icon: '',
    category: 'traditional',
    riskLevel: 'low',
    description: 'A conventional mortgage for a second home you\'ll use personally AND rent out. Lower rates than investment property loans because it\'s classified as a second home.',
    bestFor: ['First-time STR investors', 'Those who will use the property personally', 'Good credit borrowers'],
    requirements: ['Primary residence 50+ miles away', 'Must occupy part of the year', 'Credit score 680+', 'DTI under 45%'],
    pros: ['Lower rates (often 0.5-1% less than investment)', 'Lower down payment (10-15%)', 'Easier qualification'],
    cons: ['Must be 50+ miles from primary home', 'Occupancy requirements', 'Limited to one second home'],
    typicalTerms: '10-15% down, 6.5-7.5% rates',
    tags: ['good-credit', 'conventional-eligible', 'w2-income', 'first-time', 'low-risk'],
  },
  {
    id: 'dscr-loan',
    name: 'DSCR Loan',
    icon: '',
    category: 'traditional',
    riskLevel: 'low',
    description: 'Debt Service Coverage Ratio loans qualify based on the property\'s rental income, not your personal income. The property must generate enough rent to cover the mortgage payment (typically 1.0-1.25x).',
    bestFor: ['Self-employed investors', 'Those with multiple properties', 'Anyone who can\'t document income'],
    requirements: ['DSCR ratio 1.0+ (rent covers mortgage)', 'Credit score 660+', '20-25% down payment'],
    pros: ['No income verification needed', 'Unlimited properties', 'Fast closing (2-3 weeks)', 'LLC-friendly'],
    cons: ['Higher rates than conventional', 'Larger down payment', 'Property must cash flow'],
    typicalTerms: '20-25% down, 7-9% rates',
    tags: ['dscr-needed', 'no-income-docs', 'self-employed', 'variable-income', 'experienced-investor', 'medium-cash', 'high-cash'],
  },
  {
    id: 'conventional-loan',
    name: 'Conventional Investment Loan',
    icon: '',
    category: 'traditional',
    riskLevel: 'low',
    description: 'Traditional mortgage for investment properties through Fannie Mae/Freddie Mac. Best rates available but requires full income documentation.',
    bestFor: ['W-2 employees', 'Those with fewer than 10 financed properties', 'Borrowers wanting lowest rates'],
    requirements: ['Credit score 680+', 'DTI under 45%', '2 years income history', 'Max 10 financed properties'],
    pros: ['Lowest rates available', 'Predictable 30-year terms', 'Widely available'],
    cons: ['Full income documentation required', 'Limited to 10 properties', 'Slower closing'],
    typicalTerms: '15-25% down, 6.5-7.5% rates',
    tags: ['good-credit', 'conventional-eligible', 'w2-income', 'low-risk', 'normal-timeline'],
  },
  {
    id: 'portfolio-loan',
    name: 'Credit Union Portfolio Loan',
    icon: '',
    category: 'traditional',
    riskLevel: 'low',
    description: 'Loans held by local banks or credit unions (not sold to Fannie/Freddie). More flexible underwriting for unique situations.',
    bestFor: ['Self-employed borrowers', 'Unique properties', 'Those over 10 property limit'],
    requirements: ['Varies by lender', 'Often requires local banking relationship', 'May need business accounts'],
    pros: ['Flexible underwriting', 'Can exceed 10 property limit', 'Relationship-based decisions'],
    cons: ['Rates vary widely', 'May require deposits/relationship', 'Less standardized'],
    typicalTerms: '20-25% down, 7-8.5% rates',
    tags: ['self-employed', 'experienced-investor', 'portfolio-eligible', 'flexible-timeline'],
  },
  {
    id: 'hard-money',
    name: 'Hard Money Bridge Loan',
    icon: '',
    category: 'traditional',
    riskLevel: 'medium',
    description: 'Short-term loans from private lenders, secured by the property. Used for quick purchases or renovations, then refinanced into permanent financing.',
    bestFor: ['Fix-and-flip investors', 'Auction purchases', 'Properties needing renovation'],
    requirements: ['Property as collateral', 'Exit strategy (refinance plan)', '25-30% down or equity'],
    pros: ['Close in days', 'Credit flexible', 'Fund renovations', 'Asset-based approval'],
    cons: ['Very high rates (10-15%)', 'Short terms (6-24 months)', 'Points and fees'],
    typicalTerms: '25-30% down, 10-15% rates, 6-24 month terms',
    tags: ['fast-close', 'hard-money-fit', 'credit-flexible', 'poor-credit', 'medium-risk', 'high-risk'],
  },
  
  // EQUITY-BASED
  {
    id: 'cash-out-refi',
    name: 'Cash-Out Refinance',
    icon: '',
    category: 'alternative',
    riskLevel: 'low',
    description: 'Refinance an existing property to pull out equity as cash. Use that cash as down payment for your STR.',
    bestFor: ['Homeowners with equity', 'Those wanting to leverage existing assets'],
    requirements: ['20%+ equity in existing property', 'Good credit', 'Stable income'],
    pros: ['Access large amounts of capital', 'Tax-advantaged (interest may be deductible)', 'Low rates'],
    cons: ['Increases debt on existing property', 'Closing costs', 'Extends mortgage term'],
    typicalTerms: 'Up to 80% LTV, 6.5-8% rates',
    tags: ['has-equity', 'cashout-eligible', 'good-credit', 'low-risk'],
  },
  {
    id: 'heloc',
    name: 'HELOC (Home Equity Line of Credit)',
    icon: '',
    category: 'alternative',
    riskLevel: 'low',
    description: 'A revolving line of credit secured by your home equity. Draw funds as needed, pay interest only on what you use.',
    bestFor: ['Homeowners needing flexible capital', 'Those who want to pay down and reuse'],
    requirements: ['Primary home with 15-20%+ equity', 'Good credit (680+)', 'Stable income'],
    pros: ['Flexible draw schedule', 'Interest-only payments available', 'Reusable as you pay down'],
    cons: ['Variable rates', 'Your home is collateral', 'Can be frozen in downturns'],
    typicalTerms: 'Up to 85% combined LTV, Prime + 0-2%',
    tags: ['has-equity', 'heloc-eligible', 'good-credit', 'flexible-timeline', 'low-risk'],
  },
  {
    id: 'home-equity-partner',
    name: 'Home Equity Investment (HEI)',
    icon: '',
    category: 'alternative',
    riskLevel: 'medium',
    description: 'Companies like Point or Hometap give you cash for a share of your home\'s future appreciation. No monthly payments.',
    bestFor: ['Those who can\'t qualify for HELOC', 'Wanting cash without monthly payments'],
    requirements: ['Primary home with equity', 'Property in eligible area'],
    pros: ['No monthly payments', 'No income verification', 'Doesn\'t affect DTI'],
    cons: ['Give up portion of appreciation', 'Must settle within 10-30 years', 'Can be expensive long-term'],
    typicalTerms: 'Up to 20% of home value, share appreciation',
    tags: ['has-equity', 'no-income-docs', 'credit-flexible', 'medium-risk'],
  },

  // RETIREMENT ACCOUNTS
  {
    id: '401k-loan',
    name: '401(k) Loan',
    icon: '',
    category: 'retirement',
    riskLevel: 'medium',
    description: 'Borrow from your own 401(k) - typically up to 50% or $50,000, whichever is less. You pay interest back to yourself.',
    bestFor: ['Those with substantial 401(k) balance', 'Needing quick access to capital'],
    requirements: ['Employer plan must allow loans', 'Currently employed with that employer'],
    pros: ['Pay interest to yourself', 'No credit check', 'Quick access (1-2 weeks)'],
    cons: ['Must repay if you leave job', 'Opportunity cost of market gains', 'Limited to $50k'],
    typicalTerms: 'Up to $50k or 50%, Prime + 1-2%',
    tags: ['retirement-funds', '401k-eligible', 'medium-risk'],
  },
  {
    id: 'sdira',
    name: 'Self-Directed IRA',
    icon: '',
    category: 'retirement',
    riskLevel: 'medium',
    legalNote: '⚠️ Complex IRS rules - work with a qualified SDIRA custodian and tax professional',
    description: 'Move retirement funds to a self-directed IRA that can invest in real estate. The IRA owns the property, not you personally.',
    bestFor: ['Those with large IRA/401(k) balances', 'Long-term investors', 'Tax-advantaged growth seekers'],
    requirements: ['SDIRA custodian', 'Cannot use property personally', 'All expenses paid from IRA'],
    pros: ['Tax-deferred or tax-free growth (Roth)', 'Diversify retirement into real estate'],
    cons: ['Cannot use property yourself', 'Complex rules', 'UBIT tax on leveraged properties', 'Custodian fees'],
    howToMakeSafe: 'Work with established SDIRA custodians (Equity Trust, Entrust, etc.) and consult a tax professional familiar with SDIRA real estate rules.',
    typicalTerms: 'Varies - property owned by IRA',
    tags: ['retirement-funds', 'sdira-eligible', 'flexible-timeline', 'medium-risk'],
  },
  {
    id: 'robs',
    name: 'ROBS (Rollover for Business Startups)',
    icon: '',
    category: 'retirement',
    riskLevel: 'high',
    legalNote: '⚠️ IRS scrutinizes ROBS structures - requires proper setup and ongoing compliance',
    description: 'Roll 401(k) funds into a new C-Corp that buys your STR business. Complex but allows penalty-free access to retirement funds.',
    bestFor: ['Those with $50k+ in retirement', 'Wanting to start STR as a business'],
    requirements: ['$50k+ in rollable retirement funds', 'Must operate as active business', 'C-Corp structure required'],
    pros: ['Access retirement funds without penalty', 'No debt/interest payments', 'Tax-advantaged structure'],
    cons: ['Complex setup ($3-5k)', 'Ongoing compliance requirements', 'IRS scrutiny risk', 'Must be active in business'],
    howToMakeSafe: 'Use established ROBS providers (Guidant, Benetrends) who handle compliance. Maintain proper corporate records and treat it as a real business.',
    typicalTerms: 'Setup $3-5k, ongoing compliance costs',
    tags: ['retirement-funds', '401k-eligible', 'high-risk', 'creative-ok'],
  },
  {
    id: 'life-insurance-loan',
    name: 'Cash Value Life Insurance Loan',
    icon: '',
    category: 'retirement',
    riskLevel: 'low',
    description: 'Borrow against the cash value of a whole life or universal life insurance policy. The policy remains in force while you use the funds.',
    bestFor: ['Those with established whole life policies', 'Wanting tax-advantaged borrowing'],
    requirements: ['Whole life or universal life policy with cash value', 'Policy in force for several years'],
    pros: ['No credit check', 'Tax-free loan', 'Flexible repayment', 'Policy stays active'],
    cons: ['Reduces death benefit if not repaid', 'Interest accrues', 'Takes years to build cash value'],
    typicalTerms: 'Up to 90% of cash value, 5-8% rates',
    tags: ['low-risk', 'flexible-timeline'],
  },

  // CREATIVE FINANCING
  {
    id: 'seller-financing',
    name: 'Seller Financing',
    icon: '',
    category: 'creative',
    riskLevel: 'medium',
    description: 'The seller acts as the bank - you make payments directly to them instead of a traditional lender. Great for properties that don\'t qualify for traditional financing.',
    bestFor: ['Properties with motivated sellers', 'Those who can\'t qualify traditionally', 'Unique/rural properties'],
    requirements: ['Willing seller', 'Negotiation skills', 'Down payment (negotiable)'],
    pros: ['Flexible terms', 'No bank qualification', 'Faster closing', 'Negotiable down payment'],
    cons: ['Seller must agree', 'Often shorter terms (5-10 years)', 'May have balloon payment'],
    howToMakeSafe: 'Use a real estate attorney to draft the promissory note and deed of trust. Record the deed properly. Consider title insurance.',
    typicalTerms: '10-20% down, 6-10% rates, 5-30 year terms',
    tags: ['creative-needed', 'credit-flexible', 'seller-finance-fit', 'flexible-timeline', 'medium-risk', 'creative-ok'],
  },
  {
    id: 'subject-to',
    name: 'Subject-To Financing',
    icon: '',
    category: 'creative',
    riskLevel: 'high',
    legalNote: '⚠️ GREY ZONE: Due-on-sale clause risk. Lender can call loan due if they discover transfer. Consult attorney.',
    description: 'Take over the seller\'s existing mortgage payments without formally assuming the loan. The loan stays in seller\'s name while you own the property.',
    bestFor: ['Motivated sellers', 'Properties with good existing loan terms', 'Experienced investors'],
    requirements: ['Seller willing to leave loan in their name', 'Trust between parties', 'Legal documentation'],
    pros: ['Keep seller\'s low interest rate', 'Little/no down payment possible', 'No new loan qualification'],
    cons: ['Due-on-sale clause risk', 'Seller\'s credit still tied to property', 'Complex legal structure'],
    howToMakeSafe: 'Use a real estate attorney experienced in subject-to deals. Set up proper insurance naming all parties. Create land trust for privacy. Keep payments current. Have reserves for potential loan call.',
    typicalTerms: 'Take over existing loan terms',
    tags: ['creative-needed', 'no-cash', 'creative-ok', 'high-risk'],
  },
  {
    id: 'lease-option',
    name: 'Lease Option (Rent-to-Own)',
    icon: '',
    category: 'creative',
    riskLevel: 'medium',
    description: 'Lease the property with an option to purchase at a predetermined price. Part of rent may credit toward purchase.',
    bestFor: ['Those building credit/savings', 'Testing a market before buying', 'Motivated sellers'],
    requirements: ['Willing seller', 'Option fee (typically 1-5%)', 'Lease agreement'],
    pros: ['Lock in purchase price', 'Time to improve credit/save', 'Test the property/market'],
    cons: ['Option fee usually non-refundable', 'Must exercise or lose option', 'Seller may not maintain property'],
    howToMakeSafe: 'Record a memorandum of option to protect your interest. Use attorney-drafted agreements. Verify seller owns property free of issues.',
    typicalTerms: '1-5% option fee, 1-3 year lease term',
    tags: ['creative-needed', 'low-cash', 'fair-credit', 'poor-credit', 'medium-risk', 'creative-ok'],
  },
  {
    id: 'wraparound-mortgage',
    name: 'Wraparound Mortgage',
    icon: '',
    category: 'creative',
    riskLevel: 'high',
    legalNote: '⚠️ GREY ZONE: Similar due-on-sale risks as subject-to. Illegal in some states. Consult local attorney.',
    description: 'Seller creates a new mortgage that "wraps around" their existing mortgage. You pay seller, seller pays their lender. Seller profits on rate spread.',
    bestFor: ['Sellers wanting ongoing income', 'Buyers who can\'t qualify traditionally'],
    requirements: ['Seller with existing mortgage', 'Legal in your state', 'Attorney involvement'],
    pros: ['Creative financing option', 'Seller earns spread', 'Buyer gets financing'],
    cons: ['Due-on-sale risk', 'Complex structure', 'Illegal in some states'],
    howToMakeSafe: 'Verify legality in your state. Use experienced real estate attorney. Set up escrow company to handle payments. Ensure proper insurance.',
    typicalTerms: 'Varies widely',
    tags: ['creative-needed', 'creative-ok', 'high-risk'],
  },
  {
    id: 'installment-sale',
    name: 'Installment Sale',
    icon: '',
    category: 'creative',
    riskLevel: 'medium',
    description: 'Seller spreads capital gains tax over multiple years by receiving payments over time. Win-win: seller saves taxes, buyer gets financing.',
    bestFor: ['Sellers with large capital gains', 'Buyers wanting seller financing'],
    requirements: ['Seller willing to defer gains', 'Proper legal structure', 'Down payment'],
    pros: ['Tax benefits for seller', 'Financing for buyer', 'Negotiable terms'],
    cons: ['Seller must be motivated by tax benefits', 'Complex tax implications'],
    howToMakeSafe: 'Both parties should consult CPAs. Use attorney for documentation. Structure payments to optimize seller\'s tax situation.',
    typicalTerms: '10-30% down, payments over 5-30 years',
    tags: ['seller-finance-fit', 'flexible-timeline', 'medium-risk', 'creative-ok'],
  },

  // PARTNERSHIPS
  {
    id: 'equity-partner',
    name: 'Equity Partner',
    icon: '',
    category: 'partnership',
    riskLevel: 'medium',
    description: 'Partner with someone who provides capital while you provide expertise, management, or sweat equity. Split ownership and profits.',
    bestFor: ['Those with skills but limited capital', 'Experienced operators', 'Those with deal flow'],
    requirements: ['Clear partnership agreement', 'Defined roles and responsibilities', 'Exit strategy'],
    pros: ['Access capital without debt', 'Shared risk', 'Leverage others\' resources'],
    cons: ['Give up ownership/control', 'Potential partner conflicts', 'Profit sharing'],
    howToMakeSafe: 'Use attorney to draft operating agreement. Define roles, responsibilities, decision-making, and exit clearly. Consider LLC structure.',
    typicalTerms: 'Varies - typically 50/50 to 70/30 splits',
    tags: ['can-partner', 'no-cash', 'low-cash', 'creative-needed', 'medium-risk'],
  },
  {
    id: 'gap-funding',
    name: 'Gap Funding Partner',
    icon: '',
    category: 'partnership',
    riskLevel: 'medium',
    description: 'A partner or private lender who provides the gap between your down payment and what you have. Often used with hard money loans.',
    bestFor: ['Those short on down payment', 'Fix-and-flip investors', 'Experienced operators'],
    requirements: ['Primary financing in place', 'Strong deal with equity', 'Track record helps'],
    pros: ['Close deals with less cash', 'Leverage other people\'s money'],
    cons: ['Higher total cost', 'More complex structure', 'Must have strong deal'],
    howToMakeSafe: 'Document everything. Use promissory note. Ensure primary lender allows subordinate financing. Have clear repayment terms.',
    typicalTerms: '12-18% rates, short term, may include equity kicker',
    tags: ['low-cash', 'creative-needed', 'hard-money-fit', 'medium-risk', 'creative-ok'],
  },
  {
    id: 'private-money',
    name: 'Private Money Lender',
    icon: '',
    category: 'partnership',
    riskLevel: 'medium',
    description: 'Borrow from individuals (not institutions) who want better returns than banks offer. Often friends, family, or professional private lenders.',
    bestFor: ['Those with strong deals', 'Networked investors', 'Experienced operators'],
    requirements: ['Strong deal/collateral', 'Relationship or track record', 'Legal documentation'],
    pros: ['Flexible terms', 'Relationship-based', 'Fast decisions', 'Creative structures'],
    cons: ['Higher rates than banks', 'Relationship risk', 'Must find lenders'],
    howToMakeSafe: 'Use attorney for promissory note and deed of trust. Be transparent about risks. Record lien properly. Maintain professional relationship.',
    typicalTerms: '8-15% rates, 1-5 year terms',
    tags: ['credit-flexible', 'fast-close', 'medium-risk', 'creative-ok'],
  },
  {
    id: 'friends-family',
    name: 'Friends & Family Loan',
    icon: '',
    category: 'partnership',
    riskLevel: 'medium',
    legalNote: '⚠️ Document properly to avoid gift tax issues and relationship damage',
    description: 'Borrow from people who know and trust you. Can be more flexible than any other source.',
    bestFor: ['First-time investors', 'Those with supportive network', 'Smaller amounts needed'],
    requirements: ['Willing friends/family', 'Clear documentation', 'Professional approach'],
    pros: ['Flexible terms', 'Lower/no interest possible', 'Patient capital'],
    cons: ['Relationship risk if deal goes bad', 'May feel awkward', 'Limited amounts'],
    howToMakeSafe: 'Treat it professionally. Use promissory note. Pay market-rate interest (or document as gift). Be transparent about risks. Have backup plan.',
    typicalTerms: 'Negotiable - often 4-8% or interest-free',
    tags: ['no-cash', 'low-cash', 'credit-flexible', 'medium-risk'],
  },
  {
    id: 'land-owner-jv',
    name: 'Land Owner Joint Venture',
    icon: '',
    category: 'partnership',
    riskLevel: 'medium',
    description: 'Partner with someone who owns land to build an STR. They contribute land, you contribute capital/expertise.',
    bestFor: ['Those wanting to build new', 'Areas with available land', 'Construction-savvy investors'],
    requirements: ['Land owner partner', 'Construction knowledge', 'Capital for building'],
    pros: ['No land purchase needed', 'Build exactly what you want', 'Shared investment'],
    cons: ['Construction complexity', 'Longer timeline', 'Partner coordination'],
    howToMakeSafe: 'Use attorney for JV agreement. Define ownership percentages, responsibilities, and exit. Consider LLC structure.',
    typicalTerms: 'Varies - typically land value vs. construction cost split',
    tags: ['can-partner', 'flexible-timeline', 'medium-risk', 'creative-ok'],
  },
  {
    id: 'syndication',
    name: 'Syndication / Fund Investment',
    icon: '',
    category: 'partnership',
    riskLevel: 'medium',
    legalNote: '⚠️ SEC regulations apply. Must be accredited investor for most syndications.',
    description: 'Invest passively in a fund or syndication that buys STR properties. Professional management, diversification, but less control.',
    bestFor: ['Passive investors', 'Those wanting diversification', 'Accredited investors'],
    requirements: ['Often accredited investor status', 'Minimum investment ($25k-$100k typical)', 'Due diligence'],
    pros: ['Passive income', 'Professional management', 'Diversification', 'Access to larger deals'],
    cons: ['Less control', 'Fees reduce returns', 'Illiquid', 'Must trust operators'],
    howToMakeSafe: 'Verify SEC compliance. Research sponsor track record. Understand fee structure. Review PPM carefully. Diversify across sponsors.',
    typicalTerms: '$25k-$100k minimum, 5-7 year hold, 8-15% target returns',
    tags: ['high-cash', 'low-risk', 'flexible-timeline'],
  },

  // ALTERNATIVE FINANCING
  {
    id: 'business-credit-cards',
    name: '0% Business Credit Cards',
    icon: '',
    category: 'alternative',
    riskLevel: 'high',
    legalNote: '⚠️ High risk if not managed properly. Can damage credit if misused.',
    description: 'Stack multiple 0% APR business credit cards for down payment or renovation funds. Requires excellent credit and disciplined payoff plan.',
    bestFor: ['Those with excellent credit', 'Short-term capital needs', 'Disciplined investors'],
    requirements: ['750+ credit score', 'Business entity', 'Payoff plan before 0% expires'],
    pros: ['0% interest for 12-21 months', 'Quick access', 'No collateral'],
    cons: ['High rates after promo period', 'Credit utilization impact', 'Requires discipline'],
    howToMakeSafe: 'Have clear payoff plan before 0% expires. Don\'t max out cards (hurts credit). Set up auto-payments. Have backup exit strategy.',
    typicalTerms: '0% for 12-21 months, then 18-29% APR',
    tags: ['good-credit', 'conventional-eligible', 'fast-close', 'high-risk', 'creative-ok'],
  },
  {
    id: 'balance-transfer',
    name: 'Balance Transfer Strategy',
    icon: '',
    category: 'alternative',
    riskLevel: 'high',
    legalNote: '⚠️ High risk. Requires excellent credit management.',
    description: 'Use balance transfer checks from credit cards to access cash at 0% APR. Similar to business credit cards but for personal use.',
    bestFor: ['Those with excellent credit', 'Smaller amounts needed', 'Short-term bridge'],
    requirements: ['Excellent credit', 'Balance transfer offers', 'Payoff plan'],
    pros: ['0% APR period', 'Quick access', 'Flexible use'],
    cons: ['3-5% transfer fee', 'High rates after promo', 'Credit impact'],
    howToMakeSafe: 'Calculate total cost including fees. Have payoff plan. Don\'t rely on this as primary strategy.',
    typicalTerms: '0% for 12-21 months, 3-5% fee',
    tags: ['good-credit', 'fast-close', 'high-risk', 'creative-ok'],
  },
  {
    id: 'business-loc',
    name: 'Business Line of Credit',
    icon: '',
    category: 'alternative',
    riskLevel: 'medium',
    description: 'Revolving credit line for your STR business. Draw as needed, pay interest only on what you use.',
    bestFor: ['Established businesses', 'Ongoing capital needs', 'Those with business credit'],
    requirements: ['Established business (2+ years ideal)', 'Business revenue', 'Good personal credit'],
    pros: ['Flexible access', 'Only pay for what you use', 'Builds business credit'],
    cons: ['Requires established business', 'Personal guarantee often required', 'Variable rates'],
    typicalTerms: '$10k-$250k, Prime + 2-8%',
    tags: ['self-employed', 'experienced-investor', 'medium-risk'],
  },
  {
    id: 'unsecured-business-loan',
    name: 'Unsecured Business Term Loan',
    icon: '',
    category: 'alternative',
    riskLevel: 'medium',
    description: 'Fixed-term loan for your STR business without collateral. Higher rates but no assets at risk.',
    bestFor: ['Established businesses', 'Those wanting to preserve equity', 'Quick capital needs'],
    requirements: ['Business with revenue history', 'Good credit', 'Often personal guarantee'],
    pros: ['No collateral required', 'Fixed payments', 'Predictable'],
    cons: ['Higher rates', 'Personal guarantee risk', 'Shorter terms'],
    typicalTerms: '$25k-$500k, 8-25% rates, 1-5 year terms',
    tags: ['self-employed', 'fast-close', 'medium-risk'],
  },
  {
    id: 'sba-7a',
    name: 'SBA 7(a) Loan',
    icon: '',
    category: 'government',
    riskLevel: 'low',
    description: 'Government-backed small business loan with favorable terms. Can be used for STR business acquisition or expansion.',
    bestFor: ['Buying existing STR business', 'Major expansions', 'Those with time for process'],
    requirements: ['For-profit business', 'Owner-operated', 'Good credit', 'Business plan'],
    pros: ['Low rates', 'Long terms (up to 25 years)', 'Lower down payments'],
    cons: ['Slow process (60-90 days)', 'Extensive documentation', 'Must be owner-operated'],
    typicalTerms: '10-20% down, Prime + 2-3%, up to 25 years',
    tags: ['good-credit', 'w2-income', 'self-employed', 'flexible-timeline', 'low-risk'],
  },
  {
    id: 'p2p-lending',
    name: 'Peer-to-Peer Lending',
    icon: '',
    category: 'alternative',
    riskLevel: 'medium',
    description: 'Borrow from individual investors through platforms like Prosper or LendingClub. Unsecured personal loans.',
    bestFor: ['Smaller amounts', 'Those with good credit', 'Quick funding needs'],
    requirements: ['Good credit (660+)', 'Stable income', 'Platform approval'],
    pros: ['Quick approval', 'Fixed rates', 'No collateral'],
    cons: ['Higher rates', 'Limited amounts ($40k max)', 'Origination fees'],
    typicalTerms: '$1k-$40k, 8-36% rates, 3-5 year terms',
    tags: ['good-credit', 'fair-credit', 'fast-close', 'medium-risk'],
  },
  {
    id: 'crowdfunding',
    name: 'Real Estate Crowdfunding',
    icon: '',
    category: 'alternative',
    riskLevel: 'medium',
    description: 'Raise capital from many small investors through platforms. Can be debt or equity. Requires compelling deal.',
    bestFor: ['Unique/compelling projects', 'Those with marketing skills', 'Larger raises'],
    requirements: ['Platform approval', 'Compelling deal', 'Often accredited investors only'],
    pros: ['Access many investors', 'Can raise significant capital', 'Marketing exposure'],
    cons: ['Platform fees', 'Regulatory requirements', 'Must have compelling story'],
    typicalTerms: 'Varies by platform and deal structure',
    tags: ['creative-needed', 'flexible-timeline', 'medium-risk', 'creative-ok'],
  },
  {
    id: 'crypto-loan',
    name: 'Crypto-Collateralized Loan',
    icon: '',
    category: 'alternative',
    riskLevel: 'high',
    legalNote: '⚠️ High risk due to crypto volatility. Margin call risk if crypto drops.',
    description: 'Use cryptocurrency holdings as collateral for a loan. Keep your crypto exposure while accessing cash.',
    bestFor: ['Crypto holders who don\'t want to sell', 'Those bullish on crypto long-term'],
    requirements: ['Cryptocurrency holdings', 'Platform account', 'Understanding of liquidation risks'],
    pros: ['Keep crypto upside', 'No credit check', 'Quick access', 'No taxable sale event'],
    cons: ['Liquidation risk if crypto drops', 'High LTV requirements', 'Platform risk'],
    howToMakeSafe: 'Maintain low LTV (under 50%). Have plan to add collateral if prices drop. Use reputable platforms. Don\'t over-leverage.',
    typicalTerms: '25-50% LTV, 5-12% rates',
    tags: ['fast-close', 'credit-flexible', 'high-risk', 'creative-ok'],
  },
  {
    id: 'margin-loan',
    name: 'Securities Margin Loan',
    icon: '',
    category: 'alternative',
    riskLevel: 'high',
    legalNote: '⚠️ Margin call risk. Can be forced to sell at worst time.',
    description: 'Borrow against your stock portfolio. Quick access to capital without selling investments.',
    bestFor: ['Those with large brokerage accounts', 'Wanting to stay invested', 'Short-term needs'],
    requirements: ['Margin-approved brokerage account', 'Eligible securities', 'Understanding of risks'],
    pros: ['Quick access', 'Low rates', 'Stay invested', 'No credit check'],
    cons: ['Margin call risk', 'Forced liquidation possible', 'Interest compounds'],
    howToMakeSafe: 'Keep LTV under 30%. Have cash reserves for margin calls. Diversify collateral. Monitor regularly.',
    typicalTerms: 'Up to 50% of portfolio, 6-10% rates',
    tags: ['fast-close', 'high-cash', 'high-risk', 'creative-ok'],
  },

  // GOVERNMENT PROGRAMS
  {
    id: 'va-loan',
    name: 'VA Loan',
    icon: '',
    category: 'government',
    riskLevel: 'low',
    description: 'Zero-down mortgage for veterans and active military. Can be used for primary residence that you later convert to STR.',
    bestFor: ['Veterans', 'Active military', 'First-time buyers'],
    requirements: ['VA eligibility (service requirements)', 'Primary residence', 'Certificate of Eligibility'],
    pros: ['0% down payment', 'No PMI', 'Competitive rates', 'Flexible credit'],
    cons: ['Must be primary residence initially', 'Funding fee', 'Occupancy requirements'],
    howToMakeSafe: 'Live in property for required period (usually 1 year) before converting to STR. Verify local STR regulations.',
    typicalTerms: '0% down, 6-7% rates, VA funding fee 1.25-3.3%',
    tags: ['veteran', 'va-eligible', 'first-time', 'low-risk', 'no-cash', 'low-cash'],
  },
  {
    id: 'usda-loan',
    name: 'USDA Rural Development Loan',
    icon: '',
    category: 'government',
    riskLevel: 'low',
    description: 'Zero-down mortgage for rural properties. Perfect for rural STR markets. Must be primary residence initially.',
    bestFor: ['Rural property buyers', 'Those in USDA-eligible areas', 'First-time buyers'],
    requirements: ['USDA-eligible rural area', 'Income limits', 'Primary residence', 'Credit 640+'],
    pros: ['0% down payment', 'Below-market rates', 'Low fees'],
    cons: ['Geographic restrictions', 'Income limits', 'Must be primary residence'],
    howToMakeSafe: 'Verify property is in USDA-eligible area. Meet income requirements. Plan to live there initially before STR conversion.',
    typicalTerms: '0% down, 6-7% rates, 1% guarantee fee',
    tags: ['first-time', 'low-risk', 'no-cash', 'low-cash', 'good-credit'],
  },
  {
    id: 'fha-203k',
    name: 'FHA 203(k) Renovation Loan',
    icon: '',
    category: 'government',
    riskLevel: 'low',
    description: 'FHA loan that includes renovation costs. Buy a fixer-upper and finance repairs in one loan. Must be primary residence.',
    bestFor: ['Fixer-upper buyers', 'Those wanting to add value', 'First-time buyers'],
    requirements: ['Primary residence', 'Credit 580+ (3.5% down) or 500+ (10% down)', 'Licensed contractors'],
    pros: ['Low down payment', 'Finance renovations', 'Add value immediately'],
    cons: ['Must be primary residence', 'FHA requirements', 'Contractor restrictions', 'MIP for life of loan'],
    howToMakeSafe: 'Work with FHA-approved lender and contractors. Live in property for required period before STR conversion.',
    typicalTerms: '3.5% down, 6.5-7.5% rates, MIP required',
    tags: ['first-time', 'fair-credit', 'poor-credit', 'low-cash', 'low-risk'],
  },
  {
    id: 'business-grants',
    name: 'Business Grants & Incentives',
    icon: '',
    category: 'government',
    riskLevel: 'low',
    description: 'Free money from government programs for small businesses, tourism development, or rural economic development.',
    bestFor: ['Rural areas', 'Tourism-focused regions', 'Minority/women-owned businesses'],
    requirements: ['Varies by program', 'Often competitive application', 'Specific use requirements'],
    pros: ['Free money - no repayment', 'Can be substantial', 'Builds credibility'],
    cons: ['Highly competitive', 'Specific requirements', 'Time-consuming applications'],
    howToMakeSafe: 'Research local economic development agencies. Apply to multiple programs. Follow all requirements precisely.',
    typicalTerms: 'Varies - $5k to $500k+',
    tags: ['flexible-timeline', 'low-risk'],
  },
  {
    id: 'local-incentives',
    name: 'Local Government Incentives',
    icon: '',
    category: 'government',
    riskLevel: 'low',
    description: 'Tax abatements, TIF districts, facade grants, and other local programs to encourage development.',
    bestFor: ['Developing areas', 'Historic properties', 'Areas wanting tourism'],
    requirements: ['Property in eligible area', 'Meet program requirements', 'Often application process'],
    pros: ['Reduce costs significantly', 'Local support', 'Can stack with other financing'],
    cons: ['Location-specific', 'May have strings attached', 'Competitive'],
    howToMakeSafe: 'Contact local economic development office. Understand all requirements and restrictions before committing.',
    typicalTerms: 'Varies by locality',
    tags: ['flexible-timeline', 'low-risk'],
  },

  // PROPERTY-SPECIFIC STRATEGIES
  {
    id: 'brrrr',
    name: 'BRRRR into STR',
    icon: '',
    category: 'creative',
    riskLevel: 'medium',
    description: 'Buy, Rehab, Rent, Refinance, Repeat - but with STR instead of long-term rental. Force appreciation through renovation, then refinance to pull out capital.',
    bestFor: ['Experienced investors', 'Those who can manage renovations', 'Markets with value-add opportunities'],
    requirements: ['Renovation skills/team', 'Initial capital for purchase + rehab', 'Understanding of ARV'],
    pros: ['Recycle capital', 'Force appreciation', 'Build portfolio faster'],
    cons: ['Renovation risk', 'Requires expertise', 'Market timing matters'],
    howToMakeSafe: 'Get accurate ARV estimates. Build in contingency budget. Have experienced contractor. Understand refinance requirements.',
    typicalTerms: 'Hard money for acquisition, conventional/DSCR for refinance',
    tags: ['experienced-investor', 'medium-cash', 'high-cash', 'medium-risk', 'creative-ok'],
  },
  {
    id: 'flip-to-str',
    name: 'Flip-to-STR',
    icon: '',
    category: 'creative',
    riskLevel: 'medium',
    description: 'Buy undervalued property, renovate for STR use, then keep as rental instead of selling. Capture both appreciation and cash flow.',
    bestFor: ['Those with renovation experience', 'Markets with value-add opportunities'],
    requirements: ['Renovation skills', 'Capital for purchase + rehab', 'STR-suitable property'],
    pros: ['Create equity', 'Design for STR from start', 'Higher returns than traditional flip'],
    cons: ['Renovation risk', 'Longer timeline', 'Requires multiple skills'],
    howToMakeSafe: 'Budget conservatively. Have contractor relationships. Understand STR requirements before renovating.',
    typicalTerms: 'Hard money or cash for acquisition, permanent financing after',
    tags: ['experienced-investor', 'medium-cash', 'high-cash', 'medium-risk', 'creative-ok'],
  },
  {
    id: 'mtr-to-str',
    name: 'Mid-Term to Short-Term Conversion',
    icon: '',
    category: 'creative',
    riskLevel: 'low',
    description: 'Start with mid-term rentals (30+ days) to build track record and cash flow, then convert to STR once established.',
    bestFor: ['Risk-averse investors', 'Markets with STR restrictions', 'Building track record'],
    requirements: ['Property suitable for both MTR and STR', 'Furnishing budget', 'Marketing skills'],
    pros: ['Lower risk start', 'Build experience', 'Easier financing', 'Regulatory flexibility'],
    cons: ['Lower initial returns', 'May need to pivot strategy', 'Different guest expectations'],
    howToMakeSafe: 'Verify both MTR and STR are allowed. Furnish for flexibility. Build reviews on MTR platforms first.',
    typicalTerms: 'Standard investment property financing',
    tags: ['first-time', 'low-risk', 'normal-timeline'],
  },
  {
    id: 'construction-loan',
    name: 'Construction Loan',
    icon: '',
    category: 'traditional',
    riskLevel: 'medium',
    description: 'Finance new construction or major renovation. Converts to permanent mortgage after completion.',
    bestFor: ['Building new STR', 'Major renovations', 'Land owners'],
    requirements: ['Detailed plans and budget', 'Licensed contractor', 'Good credit', '20-25% down'],
    pros: ['Build exactly what you want', 'Finance entire project', 'Interest-only during construction'],
    cons: ['Complex process', 'Cost overrun risk', 'Requires expertise'],
    howToMakeSafe: 'Get fixed-price contract. Build in contingency. Use experienced lender. Have backup financing.',
    typicalTerms: '20-25% down, Prime + 1-3% during construction, converts to permanent',
    tags: ['good-credit', 'high-cash', 'flexible-timeline', 'medium-risk'],
  },
  {
    id: 'inherited-property',
    name: 'Inherited Property Conversion',
    icon: '',
    category: 'creative',
    riskLevel: 'low',
    description: 'Convert inherited property to STR. Often has no mortgage, providing instant equity and cash flow.',
    bestFor: ['Those who\'ve inherited property', 'Family properties in tourist areas'],
    requirements: ['Inherited property', 'Clear title', 'STR-suitable location'],
    pros: ['No purchase cost', 'Immediate equity', 'Sentimental value preserved'],
    cons: ['May need updates', 'Family dynamics', 'Location may not be ideal'],
    howToMakeSafe: 'Clear title issues first. Get property inspected. Understand tax basis (stepped-up basis benefit).',
    typicalTerms: 'May need renovation financing only',
    tags: ['has-equity', 'low-risk', 'first-time'],
  },

  // OTHER CREATIVE
  {
    id: 'fsbo-split-notes',
    name: 'FSBO with Split Notes',
    icon: '',
    category: 'creative',
    riskLevel: 'medium',
    legalNote: '⚠️ Complex structure - requires attorney involvement',
    description: 'Buy For Sale By Owner property with multiple promissory notes - one to seller, one to private lender, etc. Creative structure for motivated sellers.',
    bestFor: ['FSBO properties', 'Motivated sellers', 'Creative deal structuring'],
    requirements: ['Willing seller', 'Multiple funding sources', 'Legal expertise'],
    pros: ['Flexible structure', 'Can minimize down payment', 'Win-win for seller'],
    cons: ['Complex', 'Multiple parties to manage', 'Requires negotiation skills'],
    howToMakeSafe: 'Use real estate attorney. Document everything. Ensure all parties understand structure.',
    typicalTerms: 'Varies by deal structure',
    tags: ['creative-needed', 'seller-finance-fit', 'creative-ok', 'medium-risk'],
  },
  {
    id: 'equipment-financing',
    name: 'Equipment Financing',
    icon: '',
    category: 'alternative',
    riskLevel: 'low',
    description: 'Finance STR furnishings and equipment separately from the property. Preserve cash for down payment.',
    bestFor: ['Those short on furnishing budget', 'High-end STR setups', 'Business entities'],
    requirements: ['Business entity preferred', 'Equipment list', 'Good credit'],
    pros: ['Preserve cash', 'Tax advantages', 'Quick approval'],
    cons: ['Interest costs', 'Equipment as collateral', 'May not cover all items'],
    typicalTerms: '$5k-$150k, 8-15% rates, 2-5 year terms',
    tags: ['self-employed', 'fast-close', 'low-risk'],
  },
  {
    id: 'vendor-terms',
    name: 'Vendor/Supplier Terms',
    icon: '',
    category: 'alternative',
    riskLevel: 'low',
    description: 'Negotiate payment terms with furniture suppliers, contractors, etc. Net-30, Net-60, or payment plans.',
    bestFor: ['Reducing upfront costs', 'Established business relationships', 'Larger purchases'],
    requirements: ['Business entity', 'Good credit/relationships', 'Negotiation'],
    pros: ['Preserve cash', 'No interest if paid on time', 'Builds vendor relationships'],
    cons: ['Limited amounts', 'Must pay on time', 'Not all vendors offer'],
    typicalTerms: 'Net-30 to Net-90, or payment plans',
    tags: ['self-employed', 'low-risk'],
  },
  {
    id: 'setup-capital-loan',
    name: 'Short-Term Setup Capital Loan',
    icon: '',
    category: 'alternative',
    riskLevel: 'medium',
    description: 'Short-term loan specifically for STR setup costs - furnishing, photography, initial marketing. Paid back from first months\' revenue.',
    bestFor: ['Those with property but no setup capital', 'Quick launch needs'],
    requirements: ['Property already secured', 'Business plan', 'Projected revenue'],
    pros: ['Quick access', 'Specific to STR needs', 'Short commitment'],
    cons: ['Higher rates', 'Must generate revenue quickly', 'Personal guarantee likely'],
    typicalTerms: '$10k-$50k, 12-24% rates, 6-18 month terms',
    tags: ['fast-close', 'medium-risk'],
  },
  {
    id: 'deferred-fees',
    name: 'Deferred Fees Negotiation',
    icon: '',
    category: 'creative',
    riskLevel: 'low',
    description: 'Negotiate with service providers to defer fees until property generates income. Property managers, designers, etc. may accept.',
    bestFor: ['Cash-strapped investors', 'Strong deals', 'Relationship-based negotiations'],
    requirements: ['Willing service providers', 'Strong deal/track record', 'Clear payment terms'],
    pros: ['Reduce upfront costs', 'Align incentives', 'Preserve capital'],
    cons: ['Not all providers accept', 'May pay premium', 'Relationship dependent'],
    howToMakeSafe: 'Document agreements clearly. Set realistic timelines. Maintain good relationships.',
    typicalTerms: 'Varies - often paid from first 3-6 months revenue',
    tags: ['creative-needed', 'no-cash', 'low-cash', 'low-risk', 'creative-ok'],
  },
  {
    id: 'barter-trade',
    name: 'Barter / Skill Trade',
    icon: '',
    category: 'creative',
    riskLevel: 'low',
    legalNote: '⚠️ IRS considers barter income taxable. Document fair market value.',
    description: 'Trade your skills or services for what you need. Contractors, designers, marketers often open to trades.',
    bestFor: ['Those with valuable skills', 'Creative problem solvers', 'Networked individuals'],
    requirements: ['Valuable skill to trade', 'Willing trade partners', 'Clear agreements'],
    pros: ['No cash needed', 'Builds relationships', 'Leverages your strengths'],
    cons: ['Time-intensive', 'Must find willing partners', 'Tax implications'],
    howToMakeSafe: 'Document fair market value of trades. Report as income. Get agreements in writing.',
    typicalTerms: 'Varies by trade',
    tags: ['no-cash', 'creative-needed', 'low-risk', 'creative-ok'],
  },
];

// Category labels, colors, and icons
const categoryConfig: Record<string, { label: string; color: string; bg: string; Icon: React.ComponentType<{ className?: string; color?: string }> }> = {
  traditional: { label: 'Traditional Loans', color: '#2563eb', bg: '#dbeafe', Icon: BankIcon },
  creative: { label: 'Creative Financing', color: '#7c3aed', bg: '#ede9fe', Icon: CreativeIcon },
  alternative: { label: 'Alternative Sources', color: '#059669', bg: '#d1fae5', Icon: AlternativeIcon },
  retirement: { label: 'Retirement Accounts', color: '#d97706', bg: '#fef3c7', Icon: RetirementIcon },
  partnership: { label: 'Partnerships', color: '#dc2626', bg: '#fee2e2', Icon: PartnershipIcon },
  government: { label: 'Government Programs', color: '#0891b2', bg: '#cffafe', Icon: GovernmentIcon },
};

const riskConfig = {
  low: { label: 'Low Risk', color: '#16a34a', bg: '#dcfce7' },
  medium: { label: 'Medium Risk', color: '#ca8a04', bg: '#fef9c3' },
  high: { label: 'High Risk', color: '#dc2626', bg: '#fee2e2' },
};

export default function FundingPage() {
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [collectedTags, setCollectedTags] = useState<string[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [showFinancingTip, setShowFinancingTip] = useState(false);
  const [quizEmail, setQuizEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [resultEmailSent, setResultEmailSent] = useState(false);

  const handleAnswer = (value: string, tags: string[]) => {
    const newAnswers = { ...answers, [quizQuestions[currentQuestion].id]: value };
    setAnswers(newAnswers);
    
    const newTags = [...collectedTags, ...tags];
    setCollectedTags(newTags);

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setQuizComplete(true);
      // Don't show results yet - show email gate first
    }
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestion(0);
    setAnswers({});
    setCollectedTags([]);
    setQuizComplete(false);
    setShowQuizResults(false);
    setQuizEmail('');
    setEmailSubmitted(false);
    setEmailError('');
  };

  const handleEmailSubmit = async () => {
    if (!quizEmail || !quizEmail.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailLoading(true);
    setEmailError('');
    try {
      const methods = getRecommendedMethods();
      await fetch('/api/quiz-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: quizEmail,
          quizAnswers: answers,
          recommendedMethods: methods.slice(0, 5).map(m => m.name),
        }),
      });
      setEmailSubmitted(true);
      setShowQuizResults(true);
    } catch (err) {
      console.error('Email submit error:', err);
      // Show results anyway even if save fails
      setEmailSubmitted(true);
      setShowQuizResults(true);
    } finally {
      setEmailLoading(false);
    }
  };

  // Score methods based on collected tags
  const getRecommendedMethods = () => {
    if (collectedTags.length === 0) return [];
    
    const scored = fundingMethods.map(method => {
      const matchCount = method.tags.filter(tag => collectedTags.includes(tag)).length;
      const score = matchCount / method.tags.length;
      return { ...method, score, matchCount };
    });

    return scored
      .filter(m => m.matchCount > 0)
      .sort((a, b) => b.score - a.score || b.matchCount - a.matchCount)
      .slice(0, 10);
  };

  const recommendedMethods = getRecommendedMethods();

  // Filter methods for browsing
  const filteredMethods = fundingMethods.filter(method => {
    const matchesCategory = selectedCategory === 'all' || method.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      method.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      method.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)' }}
              >
                <DollarIcon className="w-6 h-6" color="#ffffff" />
              </div>
              <div>
                <h1 
                  className="text-2xl font-bold"
                  style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  Funding Options
                </h1>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  45+ ways to fund your rural STR investment
                </p>
              </div>
            </div>
            <AuthHeader variant="dark" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Compact Info Banner - Disclaimer + Tip Combined */}
        <div className="mb-4">
          {/* Disclaimer - Always visible but compact */}
          <div 
            className="rounded-xl px-4 py-3 flex items-center gap-3 mb-3"
            style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}
          >
            <WarningIcon className="w-5 h-5 flex-shrink-0" color="#d97706" />
            <p className="text-xs" style={{ color: '#92400e' }}>
              <strong>Disclaimer:</strong> Educational only. Consult a licensed professional before implementing.
            </p>
          </div>
          
          {/* Collapsible Financing Tip */}
          <button
            onClick={() => setShowFinancingTip(!showFinancingTip)}
            className="w-full rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition-all"
            style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}
          >
            <div className="flex items-center gap-3">
              <LightbulbIcon className="w-5 h-5 flex-shrink-0" color="#16a34a" />
              <p className="text-sm font-medium text-left" style={{ color: '#166534' }}>
                Why most investors use financing (not cash)
              </p>
            </div>
            <ChevronDownIcon 
              className={`w-4 h-4 flex-shrink-0 transition-transform ${showFinancingTip ? 'rotate-180' : ''}`} 
              color="#16a34a" 
            />
          </button>
          
          {/* Expanded Content */}
          {showFinancingTip && (
            <div 
              className="mt-2 rounded-xl p-4"
              style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac' }}
            >
              <p className="text-sm mb-3" style={{ color: '#15803d' }}>
                Most people can&apos;t pay $400K cash — and you don&apos;t need to. The math often works in your favor.
              </p>
              <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#f0fdf4' }}>
                <p className="text-sm font-medium" style={{ color: '#166534' }}>
                  <strong>Example:</strong> $300K property, $40K/year income. All cash = 13% return. 
                  20% down ($60K) with loan = <span className="font-bold">37% return</span> on your money.
                </p>
              </div>
              <p className="text-xs" style={{ color: '#22c55e' }}>
                💡 Trade-off: Less monthly cash, but higher ROI and ability to buy multiple properties.
              </p>
            </div>
          )}
        </div>

        {/* Quiz Section */}
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
        >
          {!quizStarted ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                <TargetIcon className="w-8 h-8" color="#16a34a" />
              </div>
              <h2 
                className="text-xl font-bold mb-2"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Find Your Best Funding Options
              </h2>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#787060' }}>
                Answer 8 quick questions about your situation and we&apos;ll recommend the funding strategies that fit you best.
              </p>
              <button
                onClick={() => setQuizStarted(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: '#2b2823', color: '#ffffff', boxShadow: '0 4px 12px -2px rgba(43, 40, 35, 0.3)' }}
              >
                Start Quiz
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          ) : !quizComplete ? (
            <div className="p-6">
              {/* Progress */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#e5e3da' }}>
                  <div 
                    className="h-2 rounded-full transition-all"
                    style={{ 
                      backgroundColor: '#2b2823',
                      width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%`
                    }}
                  />
                </div>
                <span className="text-sm font-medium" style={{ color: '#787060' }}>
                  {currentQuestion + 1}/{quizQuestions.length}
                </span>
              </div>

              {/* Question */}
              <h3 
                className="text-lg font-semibold mb-4"
                style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                {quizQuestions[currentQuestion].question}
              </h3>

              {/* Options */}
              <div className="space-y-2">
                {quizQuestions[currentQuestion].options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value, option.tags)}
                    className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{ 
                      backgroundColor: '#f5f5f0',
                      border: '1px solid #d8d6cd',
                      color: '#2b2823'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Back button */}
              {currentQuestion > 0 && (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  className="mt-4 text-sm underline"
                  style={{ color: '#787060' }}
                >
                  ← Back
                </button>
              )}
            </div>
          ) : !emailSubmitted ? (
            /* Email Capture Gate */
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0fdf4' }}>
                  <span className="text-3xl">🎉</span>
                </div>
                <h3 
                  className="text-xl font-bold mb-2"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  Your Results Are Ready!
                </h3>
                <p className="text-sm" style={{ color: '#787060' }}>
                  Enter your email to unlock your personalized funding recommendations.
                </p>
              </div>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={quizEmail}
                  onChange={(e) => { setQuizEmail(e.target.value); setEmailError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                  className="w-full px-4 py-3 rounded-xl text-base"
                  style={{ 
                    backgroundColor: '#ffffff',
                    border: emailError ? '2px solid #ef4444' : '1px solid #d8d6cd',
                    color: '#2b2823'
                  }}
                />
                {emailError && (
                  <p className="text-sm" style={{ color: '#ef4444' }}>{emailError}</p>
                )}
                <button
                  onClick={handleEmailSubmit}
                  disabled={emailLoading}
                  className="w-full py-3 rounded-xl font-semibold text-base transition-all"
                  style={{ 
                    backgroundColor: emailLoading ? '#9a9488' : '#2b2823',
                    color: '#ffffff',
                    opacity: emailLoading ? 0.7 : 1
                  }}
                >
                  {emailLoading ? 'Loading...' : 'See My Results →'}
                </button>
                <p className="text-xs text-center" style={{ color: '#9a9488' }}>
                  We&apos;ll never spam you. Unsubscribe anytime.
                </p>
                <button
                  onClick={() => { setEmailSubmitted(true); setShowQuizResults(true); }}
                  className="w-full mt-2 text-sm underline"
                  style={{ color: '#9a9488' }}
                >
                  Skip and see results
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 
                  className="text-lg font-semibold flex items-center gap-2"
                  style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  <span>✅</span> Your Top Recommendations
                </h3>
                <button
                  onClick={resetQuiz}
                  className="text-sm px-3 py-1 rounded-lg"
                  style={{ backgroundColor: '#e5e3da', color: '#2b2823' }}
                >
                  Retake Quiz
                </button>
              </div>

              {showQuizResults && recommendedMethods.length > 0 ? (
                <div className="space-y-3">
                  {recommendedMethods.slice(0, 5).map((method, idx) => (
                    <div 
                      key={method.id}
                      className="p-4 rounded-xl flex items-start gap-3"
                      style={{ 
                        backgroundColor: idx === 0 ? '#f0fdf4' : '#f5f5f0',
                        border: idx === 0 ? '2px solid #22c55e' : '1px solid #d8d6cd'
                      }}
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: categoryConfig[method.category].bg }}
                      >
                        <span 
                          className="text-xs font-bold"
                          style={{ color: categoryConfig[method.category].color }}
                        >
                          {method.category === 'traditional' ? 'TL' : 
                           method.category === 'creative' ? 'CF' :
                           method.category === 'alternative' ? 'AS' :
                           method.category === 'retirement' ? 'RA' :
                           method.category === 'partnership' ? 'PT' : 'GP'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold" style={{ color: '#2b2823' }}>{method.name}</span>
                          {idx === 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#22c55e', color: '#ffffff' }}>
                              Best Match
                            </span>
                          )}
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: riskConfig[method.riskLevel].bg, color: riskConfig[method.riskLevel].color }}
                          >
                            {riskConfig[method.riskLevel].label}
                          </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: '#787060' }}>{method.description}</p>
                        <button
                          onClick={() => setExpandedMethod(expandedMethod === method.id ? null : method.id)}
                          className="text-sm mt-2 underline"
                          style={{ color: '#2b2823' }}
                        >
                          {expandedMethod === method.id ? 'Show less' : 'Learn more →'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#787060' }}>
                  Complete the quiz to see personalized recommendations.
                </p>
              )}

              {/* Email Me These Results */}
              {showQuizResults && recommendedMethods.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: '#e5e3da' }}>
                  {!resultEmailSent ? (
                    <button
                      onClick={() => setResultEmailSent(true)}
                      className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ backgroundColor: '#e5e3da', color: '#2b2823', border: '1px solid #d8d6cd' }}
                    >
                      <span>📧</span> Email me these results so I don&apos;t forget
                    </button>
                  ) : (
                    <div className="rounded-xl p-4" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span>✅</span>
                        <span className="text-sm font-medium" style={{ color: '#166534' }}>
                          Results saved to {quizEmail}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#15803d' }}>
                        We&apos;ll email your top {recommendedMethods.slice(0, 5).length} funding recommendations shortly.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stuck Helper - placed after quiz, before all methods */}
        <StuckHelper tabName="funding" />

        {/* Browse All Methods */}
        <div className="mb-4">
          <h2 
            className="text-xl font-bold mb-4"
            style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            All 45 Funding Methods
          </h2>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search funding methods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl"
              style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #d8d6cd',
                color: '#2b2823'
              }}
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{ 
                backgroundColor: selectedCategory === 'all' ? '#2b2823' : '#ffffff',
                color: selectedCategory === 'all' ? '#ffffff' : '#2b2823',
                border: '1px solid #d8d6cd'
              }}
            >
              All ({fundingMethods.length})
            </button>
            {Object.entries(categoryConfig).map(([key, config]) => {
              const count = fundingMethods.filter(m => m.category === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: selectedCategory === key ? config.color : '#ffffff',
                    color: selectedCategory === key ? '#ffffff' : config.color,
                    border: `1px solid ${config.color}`
                  }}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Methods List */}
        <div className="space-y-3">
          {filteredMethods.map((method) => (
            <div 
              key={method.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              {/* Header - Always visible */}
              <button
                onClick={() => setExpandedMethod(expandedMethod === method.id ? null : method.id)}
                className="w-full p-4 text-left flex items-start gap-4 hover:bg-gray-50/50 transition-colors"
              >
                {(() => {
                  const CategoryIcon = categoryConfig[method.category].Icon;
                  return (
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: categoryConfig[method.category].bg }}
                    >
                      <CategoryIcon className="w-6 h-6" color={categoryConfig[method.category].color} />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      className="font-semibold text-base"
                      style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      {method.name}
                    </span>
                    {method.riskLevel === 'high' && (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: riskConfig[method.riskLevel].bg, color: riskConfig[method.riskLevel].color }}
                      >
                        <ShieldAlertIcon className="w-3 h-3" />
                        {riskConfig[method.riskLevel].label}
                      </span>
                    )}
                    {method.riskLevel === 'low' && (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: riskConfig[method.riskLevel].bg, color: riskConfig[method.riskLevel].color }}
                      >
                        <ShieldCheckIcon className="w-3 h-3" />
                        {riskConfig[method.riskLevel].label}
                      </span>
                    )}
                    {method.riskLevel === 'medium' && (
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: riskConfig[method.riskLevel].bg, color: riskConfig[method.riskLevel].color }}
                      >
                        {riskConfig[method.riskLevel].label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1.5 line-clamp-2 leading-relaxed" style={{ color: '#787060' }}>
                    {method.description}
                  </p>
                  {method.legalNote && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <WarningIcon className="w-3.5 h-3.5 flex-shrink-0" color="#dc2626" />
                      <p className="text-xs font-medium" style={{ color: '#dc2626' }}>
                        {method.legalNote}
                      </p>
                    </div>
                  )}
                </div>
                <ChevronDownIcon 
                  className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${expandedMethod === method.id ? 'rotate-180' : ''}`}
                  color="#787060"
                />
              </button>

              {/* Expanded Content */}
              {expandedMethod === method.id && (
                <div className="px-4 pb-5" style={{ borderTop: '1px solid #e5e3da' }}>
                  <div className="pt-5 space-y-5">
                    {/* Best For */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#2b2823' }}>
                        <TargetIcon className="w-4 h-4" color="#2b2823" />
                        Best For
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {method.bestFor.map((item, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ backgroundColor: '#f5f5f0', color: '#2b2823', border: '1px solid #e5e3da' }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Requirements */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: '#2b2823' }}>Requirements</h4>
                      <ul className="space-y-2">
                        {method.requirements.map((req, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#787060' }}>
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#2b2823' }} />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pros & Cons */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#166534' }}>
                          <CheckIcon className="w-4 h-4" color="#16a34a" />
                          Pros
                        </h4>
                        <ul className="space-y-2">
                          {method.pros.map((pro, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#166534' }}>
                              <CheckIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" color="#16a34a" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#991b1b' }}>
                          <XIcon className="w-4 h-4" color="#dc2626" />
                          Cons
                        </h4>
                        <ul className="space-y-2">
                          {method.cons.map((con, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#991b1b' }}>
                              <XIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" color="#dc2626" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Typical Terms */}
                    {method.typicalTerms && (
                      <div 
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                      >
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#2b2823' }}>
                          <DollarIcon className="w-4 h-4" color="#2b2823" />
                          Typical Terms
                        </h4>
                        <p className="text-sm" style={{ color: '#64748b' }}>{method.typicalTerms}</p>
                      </div>
                    )}

                    {/* How to Make Safe - for grey zone strategies */}
                    {method.howToMakeSafe && (
                      <div 
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}
                      >
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#92400e' }}>
                          <ShieldCheckIcon className="w-4 h-4" color="#d97706" />
                          How to Do This Safely & Legally
                        </h4>
                        <p className="text-sm leading-relaxed" style={{ color: '#a16207' }}>{method.howToMakeSafe}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredMethods.length === 0 && (
          <div className="text-center py-8">
            <p style={{ color: '#787060' }}>No funding methods match your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="mt-2 text-sm underline"
              style={{ color: '#2b2823' }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* CTA */}
        <div 
          className="mt-8 rounded-2xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)', boxShadow: '0 8px 32px -8px rgba(43, 40, 35, 0.4)' }}
        >
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
            <BuildingIcon className="w-7 h-7" color="#ffffff" />
          </div>
          <h3 
            className="font-semibold text-xl mb-2"
            style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}
          >
            Need Help Finding the Right Financing?
          </h3>
          <p className="text-sm mb-6 max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            Our network includes STR-friendly lenders, attorneys, and CPAs who can help you implement these strategies safely.
          </p>
          <a
            href="https://www.zillow.com/homeloans/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ 
              backgroundColor: '#ffffff', 
              color: '#2b2823',
              boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.2)'
            }}
          >
            <BuildingIcon className="w-5 h-5" color="#2b2823" />
            Connect with STR Lender
            <ArrowRightIcon className="w-4 h-4" color="#2b2823" />
          </a>
        </div>

        {/* Final Disclaimer */}

        <div className="mt-6 p-4 rounded-xl text-center" style={{ backgroundColor: 'rgba(43, 40, 35, 0.04)' }}>
          <p className="text-xs" style={{ color: '#787060' }}>
            <strong>Disclaimer:</strong> The information provided here is for educational purposes only and does not constitute financial, legal, or tax advice. 
            Financing strategies involve risk and may not be suitable for everyone. Some strategies described may have legal implications that vary by state. 
            Always consult with qualified professionals (attorneys, CPAs, licensed mortgage professionals) before implementing any financing strategy. 
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}
