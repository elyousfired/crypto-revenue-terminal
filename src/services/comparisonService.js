// Comparison Service
// Harmonizes and compares Revenue, Burn, and Market Cap % Growth between two protocols

import { getRevenuePriceHistory } from './revenuePriceHistoryService.js';

const comparisonCache = new Map();

/**
 * Fetch and merge comparative data for Coin A and Coin B over a given range
 * @param {Object} coinA
 * @param {Object} coinB
 * @param {number} days (7, 30, 90, 365)
 * @returns {Promise<Array>} Array of unified timeline data points
 */
export async function getComparisonData(coinA, coinB, days = 30) {
  if (!coinA || !coinB) return [];

  const cacheKey = `comp_${coinA.symbol}_${coinB.symbol}_${days}`;
  if (comparisonCache.has(cacheKey)) {
    return comparisonCache.get(cacheKey);
  }

  // Fetch histories in parallel
  const [historyA, historyB] = await Promise.all([
    getRevenuePriceHistory(coinA, days),
    getRevenuePriceHistory(coinB, days)
  ]);

  if (!historyA.length && !historyB.length) return [];

  // Create date-indexed maps (format: YYYY-MM-DD or date label)
  const mapA = new Map();
  historyA.forEach(pt => {
    const key = new Date(pt.timestamp).toISOString().slice(0, 10);
    mapA.set(key, pt);
  });

  const mapB = new Map();
  historyB.forEach(pt => {
    const key = new Date(pt.timestamp).toISOString().slice(0, 10);
    mapB.set(key, pt);
  });

  // Collect all unique day keys in chronological order
  const allDays = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();
  const recentDays = days === 'all' || days >= allDays.length ? allDays : allDays.slice(-days);

  // Compute burn rate estimates (daily)
  const burnDailyA = coinA.isBurn || (coinA.holdersRevenue30d && coinA.holdersRevenue30d > 0)
    ? (coinA.holdersRevenue24h || Math.round((coinA.holdersRevenue30d || 0) / 30))
    : 0;
  const burnDailyB = coinB.isBurn || (coinB.holdersRevenue30d && coinB.holdersRevenue30d > 0)
    ? (coinB.holdersRevenue24h || Math.round((coinB.holdersRevenue30d || 0) / 30))
    : 0;

  // Track initial prices for normalized % growth calculation
  let baselinePriceA = null;
  let baselinePriceB = null;

  let cumBurnA = 0;
  let cumBurnB = 0;

  let lastKnownPriceA = coinA.price || 1;
  let lastKnownPriceB = coinB.price || 1;

  const merged = recentDays.map((dayKey, idx) => {
    const ptA = mapA.get(dayKey);
    const ptB = mapB.get(dayKey);

    const dateObj = new Date(dayKey + 'T00:00:00Z');
    const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    // Prices
    const priceA = ptA ? ptA.price : lastKnownPriceA;
    if (ptA && ptA.price) lastKnownPriceA = ptA.price;

    const priceB = ptB ? ptB.price : lastKnownPriceB;
    if (ptB && ptB.price) lastKnownPriceB = ptB.price;

    if (baselinePriceA === null && priceA > 0) baselinePriceA = priceA;
    if (baselinePriceB === null && priceB > 0) baselinePriceB = priceB;

    // Normalized Market Cap / Price Growth % from baseline
    const growthA = baselinePriceA ? Number((((priceA - baselinePriceA) / baselinePriceA) * 100).toFixed(2)) : 0;
    const growthB = baselinePriceB ? Number((((priceB - baselinePriceB) / baselinePriceB) * 100).toFixed(2)) : 0;

    // Fees & Revenue
    const feesA = ptA ? ptA.fees : 0;
    const revA = ptA ? ptA.revenue : Math.round(feesA * 0.7);

    const feesB = ptB ? ptB.fees : 0;
    const revB = ptB ? ptB.revenue : Math.round(feesB * 0.7);

    // Burn trajectory: proportional to fees if token burns from fees
    const dayBurnA = burnDailyA > 0 ? (feesA > 0 ? Math.round(burnDailyA * (revA / Math.max(1, coinA.revenue24h || 1))) : burnDailyA) : 0;
    const dayBurnB = burnDailyB > 0 ? (feesB > 0 ? Math.round(burnDailyB * (revB / Math.max(1, coinB.revenue24h || 1))) : burnDailyB) : 0;

    cumBurnA += dayBurnA;
    cumBurnB += dayBurnB;

    const isToday = idx === recentDays.length - 1;

    return {
      timestamp: dateObj.getTime(),
      date: dateLabel,
      isLive: isToday && (ptA?.isLive || ptB?.isLive),
      // Coin A Metrics
      revA,
      feesA,
      priceA,
      burnA: dayBurnA,
      cumBurnA,
      growthA,
      // Coin B Metrics
      revB,
      feesB,
      priceB,
      burnB: dayBurnB,
      cumBurnB,
      growthB
    };
  });

  comparisonCache.set(cacheKey, merged);
  return merged;
}

/**
 * Clear comparison cache
 */
export function clearComparisonCache() {
  comparisonCache.clear();
}
