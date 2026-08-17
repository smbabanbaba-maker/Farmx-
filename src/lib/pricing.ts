/**
 * FarmX Production Pricing Configuration
 * Centralized fees for listings, promotions, and subscriptions.
 */

export const PRICING = {
  listingFee: 2000,
  promoTop: 2799,
  promoWeek: 3000,
  promoMonth: 5200,
  jobPromoMin: 2000,
  bluetekMonthly: 4500,
  goldMonthly: 12000,
  platinumMonthly: 25000,
} as const;

export type PricingConfig = typeof PRICING;
