/**
 * Partner Links Configuration
 * 
 * Centralized configuration for all partner/affiliate links.
 * Update URLs here when partners change — all pages reference this file.
 * 
 * IMPORTANT: Any paid/sponsored link must be disclosed per FTC guidelines.
 * See /terms (Section 16) for the full affiliate disclosure.
 */

export const PARTNER_LINKS = {
  /** 
   * Preferred Lender - Currently: Jesse Cronen at Northpointe Bank
   * This is a paid advertising partnership.
   * To swap partners: just change this URL.
   */
  PREFERRED_LENDER: "https://www.northpointe.com/home-lending/get-started/jesse-cronen/",

  /** Fallback lender directory (Zillow) - used as secondary option */
  ZILLOW_LENDERS: "https://www.zillow.com/homeloans/",

  /** Zillow agent directory */
  ZILLOW_AGENTS: "https://www.zillow.com/professionals/real-estate-agent-reviews/",

  /** Teeco coaching/training funnel */
  TEECO_FUNDING: "https://teeco.co/fund-your-financial-freedom",

  /** Teeco design services */
  TEECO_DESIGN: "https://teeco.co/book-our-design-services",
} as const;

/** Display name for the preferred lender (shown in UI) */
export const PREFERRED_LENDER_NAME = "Our Preferred Lender";

/** Disclosure text shown near sponsored links (FTC compliance) */
export const SPONSORED_DISCLOSURE = "Sponsored partner";
