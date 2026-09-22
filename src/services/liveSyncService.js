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
    if (Array.isArray(data.protocols)) {
      data.protocols.forEach(p => {
        const key = (p.name || p.module || '').toLowerCase().trim();
        const slugKey = (p.defillamaId || '').toLowerCase().trim();
        const fees = p.total24h || p.dailyFees || 0;
        const fees48h = p.total48hto24h || 0;
        const fees7d = p.total7d || 0;
        const fees14d = p.total14dto7d || 0;
        const fees30d = p.total30d || 0;
        const fees60d = p.total60dto30d || 0;

        const feeChange1d = fees48h > 0 ? Number((((fees - fees48h) / fees48h) * 100).toFixed(1)) : 0;
        const feeChange7d = fees14d > 0 ? Number((((fees7d - fees14d) / fees14d) * 100).toFixed(1)) : 0;

        const isUpToday = fees > fees48h && fees > 300;
        const isUpWeek = (feeChange7d > 0 || fees7d > fees14d) && fees > 300;
        const isRecovery = ((fees48h > 0 && feeChange1d >= 10 && fees7d < (fees30d / 3)) || (feeChange7d > 5 && fees60d > fees30d) || (feeChange1d > 20 && feeChange7d < 0)) && fees > 300;

        const info = {
          fees24h: fees,
          fees48h,
          fees7d,
          fees14d,
          feeChange1d,
          feeChange7d,
          isUpToday,
          isUpWeek,
          isRecovery
        };

        if (fees > 0) {
          if (key) feesMap.set(key, info);
          if (slugKey) feesMap.set(slugKey, info);
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
        feeChange7d: typeof info === 'object' ? info.feeChange7d : (coin.feeChange7d || 0),
        isUpToday: typeof info === 'object' ? info.isUpToday : (coin.isUpToday || false),
        isUpWeek: typeof info === 'object' ? info.isUpWeek : (coin.isUpWeek || false),
        isRecovery: typeof info === 'object' ? info.isRecovery : (coin.isRecovery || false),
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
