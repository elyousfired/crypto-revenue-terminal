// Live Sync Service for CoinGecko Terminal
// Auto-refreshes protocol fees from DeFiLlama and prices from DexScreener every 15 minutes (900s)

export const SYNC_INTERVAL_SECONDS = 15 * 60; // 15 minutes

export async function fetchLiveFees() {
  try {
    const res = await fetch('https://api.llama.fi/overview/fees');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    
    // Map protocol slug/name -> full fee metrics
    const feesMap = new Map();
    const parentSums = new Map();

    if (Array.isArray(data.protocols)) {
      // Pass 1: aggregate parentProtocols (e.g. Uniswap V1/V2/V3/V4, Aave V2/V3)
      data.protocols.forEach(p => {
        if (p.parentProtocol) {
          const parentKey = p.parentProtocol.replace('parent#', '').toLowerCase().trim();
          const existing = parentSums.get(parentKey) || {
            fees: 0,
            fees48h: 0,
            fees7d: 0,
            fees30d: 0
          };
          existing.fees += (p.total24h || p.dailyFees || 0);
          existing.fees48h += (p.total48hto24h || 0);
          existing.fees7d += (p.total7d || 0);
          existing.fees30d += (p.total30d || 0);
          parentSums.set(parentKey, existing);
        }
      });

      // Register parent aggregated entries
      parentSums.forEach((val, parentKey) => {
        if (val.fees > 0) {
          const feeChange1d = val.fees48h > 0 ? Number((((val.fees - val.fees48h) / val.fees48h) * 100).toFixed(1)) : 0;
          const feeChange7d = val.fees7d > 0 ? Number((((val.fees7d - val.fees48h * 7) / Math.max(1, val.fees48h * 7)) * 100).toFixed(1)) : 0;
          const info = {
            fees24h: Math.round(val.fees),
            fees48h: Math.round(val.fees48h),
            fees7d: Math.round(val.fees7d),
            fees30d: Math.round(val.fees30d),
            feeChange1d,
            feeChange7d,
            isUpToday: val.fees > val.fees48h,
            isUpWeek: feeChange7d > 0
          };
          feesMap.set(parentKey, info);
        }
      });

      // Pass 2: map individual protocols
      data.protocols.forEach(p => {
        const key = (p.name || p.module || '').toLowerCase().trim();
        const slugKey = (p.defillamaId || '').toLowerCase().trim();
        const displayNameKey = (p.displayName || '').toLowerCase().trim();
        const fees = p.total24h || p.dailyFees || 0;
        const fees48h = p.total48hto24h || 0;
        const fees7d = p.total7d || 0;
        const fees14d = p.total14dto7d || 0;
        const fees30d = p.total30d || 0;
        const fees60d = p.total60dto30d || 0;

        const feeChange1d = fees48h > 0 ? Number((((fees - fees48h) / fees48h) * 100).toFixed(1)) : 0;
        
        let feeChange7d = 0;
        let isBreakout = false;
        if (fees14d >= 100) {
          feeChange7d = Number((((fees7d - fees14d) / fees14d) * 100).toFixed(1));
        } else if (fees7d >= 500) {
          isBreakout = true;
          feeChange7d = Number(Math.min(250, (fees7d / 100) * 10).toFixed(1));
        }
        if (feeChange7d > 500) feeChange7d = 500;
        if (feeChange7d < -100) feeChange7d = -100;

        const isUpToday = fees > fees48h && fees > 300;
        const isUpWeek = feeChange7d > 0 && fees > 300;
        const isRecovery = ((fees48h > 0 && feeChange1d >= 10 && fees7d < (fees30d / 3)) || (feeChange7d > 5 && fees60d > fees30d) || (feeChange1d > 20 && feeChange7d < 0)) && fees > 300;

        const info = {
          fees24h: fees,
          fees48h,
          fees7d,
          fees14d,
          feeChange1d,
          feeChange7d,
          isBreakout,
          isUpToday,
          isUpWeek,
          isRecovery
        };

        if (fees > 0) {
          if (key && !feesMap.has(key)) feesMap.set(key, info);
          if (slugKey && !feesMap.has(slugKey)) feesMap.set(slugKey, info);
          if (displayNameKey && !feesMap.has(displayNameKey)) feesMap.set(displayNameKey, info);
        }
      });
    }
    return feesMap;
  } catch (err) {
    console.warn('[LiveSync] DeFiLlama fees fetch warning:', err.message);
    return null;
  }
}

export function applyLiveUpdates(existingCoins, feesMap) {
  if (!feesMap || feesMap.size === 0) return existingCoins;

  let updatedCount = 0;

  const updated = existingCoins.map(coin => {
    const nameKey = (coin.name || '').toLowerCase().trim();
    const slugKey = (coin.defillamaSlug || '').toLowerCase().trim();
    const symKey = (coin.symbol || '').toLowerCase().trim();

    const info = feesMap.get(slugKey) || feesMap.get(nameKey) || feesMap.get(symKey);
    const newFees = typeof info === 'object' ? info.fees24h : info;

    if (newFees && newFees !== coin.fees24h) {
      updatedCount++;
      const isND = false;
      const annualFees = newFees * 365;
      const priceToFees = newFees > 0 ? Number(((coin.mcap || 0) / annualFees).toFixed(1)) : null;
      const annualYield = (coin.mcap > 0 && annualFees > 0) ? Number(((annualFees / coin.mcap) * 100).toFixed(1)) : 0;
      const feeChange7d = typeof info === 'object' ? info.feeChange7d : (coin.feeChange7d || 0);
      const isAlphaGem = feeChange7d >= 15 && newFees >= 1000 && (coin.mcap || 0) < 300000000 && (annualYield >= 4 || (priceToFees && priceToFees <= 25));

      // Re-evaluate Pillar 6 (revenue growing)
      const p = { ...coin.pillars };
      if (p) {
        const passRev = newFees > 0;
        let feeLabel = '$' + Math.round(newFees);
        if (newFees >= 1e6) feeLabel = '$' + (newFees / 1e6).toFixed(1) + 'M';
        else if (newFees >= 1e3) feeLabel = '$' + (newFees / 1e3).toFixed(1) + 'K';

        p.revGrowing = { pass: passRev, label: feeLabel };

        let score = 0;
        if (p.dexAge?.pass) score++;
        if (p.notMeme?.pass) score++;
        if (p.mc500k?.pass) score++;
        if (p.volExpanding?.pass) score++;
        if (p.liqGrowing?.pass) score++;
        if (p.revGrowing?.pass) score++;

        p.score = score;
        p.isPrimeGem = (score === 6);
        p.isNearGem = (score === 5);
      }

      return {
        ...coin,
        fees24h: newFees,
        revenue24h: Math.round(newFees * 0.7),
        feeChange1d: typeof info === 'object' ? info.feeChange1d : (coin.feeChange1d || 0),
        feeChange7d: feeChange7d,
        isUpToday: typeof info === 'object' ? info.isUpToday : (coin.isUpToday || false),
        isUpWeek: typeof info === 'object' ? info.isUpWeek : (coin.isUpWeek || false),
        isRecovery: typeof info === 'object' ? info.isRecovery : (coin.isRecovery || false),
        isAlphaGem: isAlphaGem,
        annualYield: annualYield,
        isND,
        priceToFees,
        pillars: p,
        lastLiveSync: new Date().toISOString()
      };
    }

    return coin;
  });

  return { updatedCoins: updated, updatedCount };
}
