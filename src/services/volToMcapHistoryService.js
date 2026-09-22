// Historical Vol / MC Curve and Sparkline Service
const historyCache = new Map();

export function getSparkline7d(token) {
  if (!token) return [0.1, 0.12, 0.11, 0.13, 0.15, 0.14, 0.16];
  const current = token.volToMcap || 0.15;
  const change24h = (token.priceChange24h || 0) / 100;
  
  const seed = (token.symbol || 'ABC')
    .split('')
    .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
  
  const pseudoRand = (offset) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const points = [];
  const days = 7;
  let runningVal = current;
  points[days - 1] = Number(current.toFixed(3));

  for (let i = days - 2; i >= 0; i--) {
    const dayOffset = days - 1 - i;
    const randFactor = (pseudoRand(dayOffset * 11) - 0.48) * 0.25;
    const trendPull = change24h > 0.05 ? -0.04 * dayOffset : change24h < -0.05 ? 0.03 * dayOffset : 0;
    runningVal = Math.max(0.01, runningVal * (1 - randFactor) + trendPull * current * 0.2);
    points[i] = Number(Math.max(0.01, runningVal).toFixed(3));
  }

  points[days - 1] = Number(current.toFixed(3));
  return points;
}

export function getHistory30d(token) {
  if (!token) return [];
  const cacheKey = '30d_' + (token.id || token.symbol);
  if (historyCache.has(cacheKey)) return historyCache.get(cacheKey);

  const currentVolToMcap = token.volToMcap || 0.15;
  const currentMcap = token.mcap || 50000000;
  const currentVol = token.totalVol24h || currentMcap * currentVolToMcap;
  const currentPrice = token.price || 1;

  const seed = (token.symbol || 'XYZ')
    .split('')
    .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);

  const pseudoRand = (offset) => {
    const x = Math.sin(seed + offset * 7) * 10000;
    return x - Math.floor(x);
  };

  const days = 30;
  const now = new Date();
  const baseVolToMcap = Math.max(0.02, currentVolToMcap * 0.45);
  let walkVolToMcap = currentVolToMcap;
  let walkMcap = currentMcap;
  const rawPoints = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (i === 0) {
      rawPoints.push({
        date: dateStr,
        timestamp: date.getTime(),
        volToMcap: Number(currentVolToMcap.toFixed(3)),
        volume: currentVol,
        mcap: currentMcap,
        price: currentPrice
      });
    } else {
      const progress = (days - 1 - i) / (days - 1);
      const noise = (pseudoRand(i * 13) - 0.48) * 0.22;
      const target = baseVolToMcap * (1 - (1 - progress) * 0.5) + (currentVolToMcap * 0.5 * (1 - progress));
      walkVolToMcap = Math.max(0.015, walkVolToMcap * (1 - noise * 0.3) * 0.85 + target * 0.15);
      
      const mcapNoise = (pseudoRand(i * 19) - 0.5) * 0.05;
      walkMcap = Math.max(100000, walkMcap * (1 - mcapNoise));
      const estVol = walkMcap * walkVolToMcap;

      rawPoints.unshift({
        date: dateStr,
        timestamp: date.getTime(),
        volToMcap: Number(walkVolToMcap.toFixed(3)),
        volume: estVol,
        mcap: walkMcap,
        price: currentPrice * (1 - (pseudoRand(i * 5) - 0.5) * 0.2)
      });
    }
  }

  historyCache.set(cacheKey, rawPoints);
  return rawPoints;
}

export async function fetchLiveCoinGeckoChart(coingeckoId, days = 30) {
  if (!coingeckoId) return null;
  const cacheKey = 'live_' + coingeckoId + '_' + days;
  if (historyCache.has(cacheKey)) return historyCache.get(cacheKey);

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/' + coingeckoId + '/market_chart?vs_currency=usd&days=' + days + '&interval=daily',
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.total_volumes || !json.market_caps) return null;

    const data = [];
    const volMap = new Map(json.total_volumes.map(([ts, val]) => [Math.floor(ts / 86400000), val]));

    json.market_caps.forEach(([ts, mcap]) => {
      const dayKey = Math.floor(ts / 86400000);
      const vol = volMap.get(dayKey) || 0;
      const ratio = mcap > 0 ? vol / mcap : 0;
      const d = new Date(ts);
      data.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: ts,
        volToMcap: Number(ratio.toFixed(3)),
        volume: vol,
        mcap: mcap
      });
    });

    if (data.length > 0) {
      historyCache.set(cacheKey, data);
      return data;
    }
  } catch (err) {
    console.debug('Fallback to synthesized curve:', err.message);
  }
  return null;
}
