import type { FinancialProfile } from '../types/api';

export interface ProductRecommendation {
  product: string;
  reason: string;
}

// Same 8-item catalog used on both sides of the game (see moneyverse/backend/app/mock_profiles.py
// and admin_dashboard/backend/app/seed.py) -- kept here so the risk-based fallback recommends
// something that actually exists in the product catalog rather than inventing a name.
const PRODUCTS_BY_RISK_BAND: Record<'risk_averse' | 'moderate' | 'risk_seeking', string> = {
  risk_averse: 'Fixed-Deposit',
  moderate: 'SIP-Mutual-Fund',
  risk_seeking: 'Crypto-Watchlist',
};

// Real telemetry's product_affinity keys -> closest catalog product. Approximate by
// necessity: the game only measures quiz-engagement per category, not interest in a specific
// product, so this is a best-effort mapping, not a measured preference.
const PRODUCT_BY_ENGAGEMENT_KEY: Record<string, string> = {
  insurance_engagement: 'Term-Insurance',
  tax_planning_engagement: 'SIP-Mutual-Fund',
  retirement_planning_engagement: 'Gold-Bond',
  digital_banking_comfort: 'Credit-Card',
};

function labelFromEngagementKey(key: string): string {
  return key.replace('_engagement', '').replace('_comfort', '').replace(/_/g, ' ');
}

/**
 * Rule-based (not ML) product recommendation, grounded entirely in fields already present on
 * this player's financial_profile -- no fabricated data. Two source shapes exist:
 *   - synthetic/seed data already names specific products (product_affinity.top_products,
 *     risk_and_investment.preferred_instruments) -- those are returned directly.
 *   - real telemetry only has category-level quiz engagement counts and a risk_tolerance_score
 *     -- those are mapped onto the product catalog via the tables above, and every reason
 *     string says exactly which field drove the pick so this is never presented as more
 *     certain than it is.
 */
export function recommendProducts(financial: FinancialProfile | undefined): ProductRecommendation[] {
  if (!financial) return [];

  const productAffinity = (financial.product_affinity ?? {}) as Record<string, unknown>;
  const riskAndInvestment = (financial.risk_and_investment ?? {}) as Record<string, unknown>;

  const topProducts = productAffinity.top_products;
  if (Array.isArray(topProducts) && topProducts.length > 0) {
    return topProducts.slice(0, 3).map((product) => ({
      product: String(product),
      reason: 'Declared top product affinity',
    }));
  }

  const preferredInstruments = riskAndInvestment.preferred_instruments;
  if (Array.isArray(preferredInstruments) && preferredInstruments.length > 0) {
    return preferredInstruments.slice(0, 3).map((product) => ({
      product: String(product),
      reason: 'Matches declared risk & investment preference',
    }));
  }

  // Real telemetry: derive from whichever category has the most quiz engagement, plus the
  // risk_tolerance_score-based fallback -- both computed from the same profile_builder.py
  // fields the rest of the app already renders (see ProfileDetailPage's TraitBar list).
  const recs: ProductRecommendation[] = [];

  const engagementEntries = Object.entries(productAffinity).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0,
  );
  const topEngagement = engagementEntries.sort((a, b) => b[1] - a[1])[0];
  if (topEngagement) {
    const [key, count] = topEngagement;
    const product = PRODUCT_BY_ENGAGEMENT_KEY[key];
    if (product) {
      recs.push({
        product,
        reason: `Highest quiz engagement in ${labelFromEngagementKey(key)} (${count} attempt${count === 1 ? '' : 's'})`,
      });
    }
  }

  const riskScore = riskAndInvestment.risk_tolerance_score;
  if (typeof riskScore === 'number') {
    const band = riskScore >= 66 ? 'risk_seeking' : riskScore >= 33 ? 'moderate' : 'risk_averse';
    const product = PRODUCTS_BY_RISK_BAND[band];
    if (!recs.some((r) => r.product === product)) {
      recs.push({ product, reason: `Risk tolerance score ${riskScore}/100` });
    }
  }

  return recs;
}
