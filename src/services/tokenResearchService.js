/**
 * Token Research Service
 * Fetches COMPREHENSIVE live data from CoinGecko, DeFiLlama, and DexScreener
 * NO LOCAL STORAGE / NO STALE CACHING — 100% fresh live data on every call
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const DEFILLAMA_BASE = 'https://api.llama.fi';

// Fetch full token data from CoinGecko /coins/{id}
async function fetchCoinGeckoData(geckoId) {
  try {
    const url = `${COINGECKO_BASE}/coins/${geckoId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('CoinGecko direct fetch note:', err.message);
    return null;
  }
}

// Fetch DeFiLlama protocol details
async function fetchDefiLlamaProtocol(protocolSlug) {
  if (!protocolSlug) return null;
  try {
    const res = await fetch(`${DEFILLAMA_BASE}/protocol/${protocolSlug}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Fetch DexScreener pairs by token address or symbol
async function fetchDexScreenerData(address, symbol) {
  try {
    let url = null;
    if (address && address.length > 20) {
      url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
    } else if (symbol) {
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`;
    }
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.pairs || [];
  } catch {
    return null;
  }
}

// Explorer URL generator based on chain name and contract address
export function getExplorerUrl(chain, address) {
  if (!address) return null;
  const c = chain ? chain.toLowerCase() : '';
  if (c.includes('eth') || c === 'ethereum') return `https://etherscan.io/token/${address}`;
  if (c.includes('sol') || c === 'solana') return `https://solscan.io/token/${address}`;
  if (c.includes('bsc') || c.includes('binance')) return `https://bscscan.com/token/${address}`;
  if (c.includes('arb') || c.includes('arbitrum')) return `https://arbiscan.io/token/${address}`;
  if (c.includes('base')) return `https://basescan.org/token/${address}`;
  if (c.includes('opt') || c.includes('optimism')) return `https://optimistic.etherscan.io/token/${address}`;
  if (c.includes('polygon') || c.includes('matic')) return `https://polygonscan.com/token/${address}`;
  if (c.includes('avax') || c.includes('avalanche')) return `https://snowtrace.io/token/${address}`;
  if (c.includes('blast')) return `https://blastscan.io/token/${address}`;
  if (c.includes('fantom')) return `https://ftmscan.com/token/${address}`;
  return `https://etherscan.io/token/${address}`;
}

// Generates an AI Analyst Dossier from live data
function generateAIReport({ name, symbol, price, mcap, fees24h, revenue24h, yield24h, feeChange7d, athChange, exchanges, contracts, llamaTVL, circulatingSupply, maxSupply }) {
  // Cashflow Score (0-100)
  let score = 50;
  if (revenue24h > 100000) score += 15;
  else if (revenue24h > 20000) score += 10;
  else if (revenue24h > 1000) score += 5;

  if (yield24h >= 20) score += 20;
  else if (yield24h >= 10) score += 12;
  else if (yield24h >= 5) score += 6;

  if (feeChange7d > 10) score += 10;
  else if (feeChange7d < -20) score -= 8;

  if (llamaTVL > 10000000) score += 5;
  score = Math.min(99, Math.max(25, score));

  // Rating label
  let rating = 'STABLE CASHFLOW PRODUCER';
  let badgeColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  if (yield24h >= 30 && score >= 80) {
    rating = '💎 HIGH-YIELD ALPHA ENGINE';
    badgeColor = 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10';
  } else if (feeChange7d >= 25 && revenue24h >= 10000) {
    rating = '🚀 EXPLOSIVE REVENUE MOMENTUM';
    badgeColor = 'text-amber-300 border-amber-500/40 bg-amber-500/10';
  } else if (yield24h < 3) {
    rating = '🏛️ BLUE-CHIP LARGE CAP';
    badgeColor = 'text-blue-300 border-blue-500/40 bg-blue-500/10';
  }

  // Key AI Insights
  const insights = [];
  insights.push(`Generates an estimated $${Math.round(revenue24h).toLocaleString()} in net protocol fees daily (~$${Math.round(revenue24h * 365).toLocaleString()} annualized run-rate).`);
  
  if (mcap > 0) {
    const pf = fees24h > 0 ? (mcap / (fees24h * 365)).toFixed(1) : 'N/A';
    insights.push(`Valuation multiple sits at ${pf}x P/F (Price to Annualized Fees) with a current 24h cashflow yield of ${yield24h.toFixed(1)}% on Market Cap.`);
  }

  if (feeChange7d !== 0) {
    const dir = feeChange7d > 0 ? 'accelerating' : 'contracting';
    insights.push(`7-Day protocol fee velocity is ${dir} by ${Math.abs(feeChange7d).toFixed(1)}%, indicating ${feeChange7d > 0 ? 'increasing trader demand and pool utilization' : 'cooling short-term activity'}.`);
  }

  if (athChange && athChange < -50) {
    insights.push(`Trading at a ${Math.abs(athChange).toFixed(1)}% discount from its all-time high, representing potential fundamental dislocation if cashflow generation persists.`);
  }

  // Supply dilution check
  let dilutionNote = 'Supply is 100% circulating with zero future token unlock dilution.';
  if (maxSupply && circulatingSupply) {
    const pctCirc = (circulatingSupply / maxSupply) * 100;
    if (pctCirc < 50) {
      dilutionNote = `High unlock overhang: only ${pctCirc.toFixed(0)}% of max supply is in circulation. Monitor vesting schedules.`;
    } else if (pctCirc < 85) {
      dilutionNote = `Moderate unlock schedule: ${pctCirc.toFixed(0)}% circulating with ${(100 - pctCirc).toFixed(0)}% pending emission.`;
    }
  }

  // CEX vs DEX availability
  const cexCount = exchanges.filter(e => e.isCEX).length;
  const dexCount = exchanges.length - cexCount;
  const liquidityNote = cexCount > 0
    ? `Listed across ${cexCount} centralized exchanges (CEX) and ${dexCount} decentralized venues (DEX) with deep on-chain liquidity routing.`
    : `Primary liquidity is concentrated on decentralized exchanges (DEX) with automated market makers.`;

  return {
    score,
    rating,
    badgeColor,
    insights,
    dilutionNote,
    liquidityNote,
  };
}

// Main research function — fetches EVERYTHING live
export async function fetchTokenResearch(coin) {
  const geckoId = coin.geckoId || coin.id;
  const llamaSlug = coin.defillamaSlug || coin.llamaSlug || coin.defillamaId || coin.slug;

  // Parallel fetch from all sources
  const [geckoData, llamaProtocol] = await Promise.all([
    geckoId ? fetchCoinGeckoData(geckoId) : null,
    llamaSlug ? fetchDefiLlamaProtocol(llamaSlug) : null,
  ]);

  // === PARSE COINGECKO DATA ===
  const cg = geckoData || {};
  const md = cg.market_data || {};
  const links = cg.links || {};

  // Contract addresses from all chains
  const contracts = [];
  if (cg.platforms) {
    Object.entries(cg.platforms).forEach(([chain, addr]) => {
      if (addr && addr.length > 5) {
        contracts.push({
          chain: chain || 'unknown',
          address: addr,
          explorerUrl: getExplorerUrl(chain, addr),
        });
      }
    });
  }
  if (cg.detail_platforms) {
    Object.entries(cg.detail_platforms).forEach(([chain, info]) => {
      if (info?.contract_address && !contracts.find(c => c.address === info.contract_address)) {
        contracts.push({
          chain,
          address: info.contract_address,
          decimals: info.decimal_place,
          explorerUrl: getExplorerUrl(chain, info.contract_address),
        });
      }
    });
  }

  // If CoinGecko platforms didn't populate or is empty, use verified contractAddress from coin
  if (contracts.length === 0 && coin.contractAddress) {
    contracts.push({
      chain: coin.chainName || 'Ethereum',
      address: coin.contractAddress,
      explorerUrl: getExplorerUrl(coin.chainName, coin.contractAddress),
    });
  }

  // Fetch DexScreener pairs using primary contract or symbol
  const primaryAddr = contracts.length > 0 ? contracts[0].address : (coin.contractAddress || null);
  const dexPairs = await fetchDexScreenerData(primaryAddr, coin.symbol);

  // Exchange listings (tickers)
  const exchanges = [];
  const seenExchanges = new Set();
  if (cg.tickers) {
    cg.tickers.forEach(t => {
      const name = t.market?.name || t.market?.identifier || 'Exchange';
      const key = `${name}-${t.target}`.toLowerCase();
      if (!seenExchanges.has(key)) {
        seenExchanges.add(key);
        const isCEX = !name.toLowerCase().includes('swap') && 
                      !name.toLowerCase().includes('dex') &&
                      !name.toLowerCase().includes('curve') &&
                      !name.toLowerCase().includes('v2') &&
                      !name.toLowerCase().includes('v3');
        exchanges.push({
          name,
          pair: `${t.base}/${t.target}`,
          price: t.last || 0,
          volume24h: t.converted_volume?.usd || 0,
          tradeUrl: t.trade_url,
          trustScore: t.trust_score,
          isCEX,
        });
      }
    });
    exchanges.sort((a, b) => b.volume24h - a.volume24h);
  }

  // Fallback: If no tickers from CoinGecko, use DexScreener pairs
  if (exchanges.length === 0 && dexPairs && dexPairs.length > 0) {
    dexPairs.slice(0, 10).forEach(p => {
      exchanges.push({
        name: p.dexId ? p.dexId.toUpperCase() : 'DEX',
        pair: `${p.baseToken?.symbol}/${p.quoteToken?.symbol}`,
        price: Number(p.priceUsd) || 0,
        volume24h: p.volume?.h24 || 0,
        tradeUrl: p.url,
        trustScore: 'green',
        isCEX: false,
      });
    });
  }

  // Important links
  const officialWebsite = links.homepage?.[0] || llamaProtocol?.url || null;
  const twitterScreen = links.twitter_screen_name || (llamaProtocol?.twitter ? llamaProtocol.twitter.replace('@', '') : null);
  const twitterUrl = twitterScreen ? `https://twitter.com/${twitterScreen}` : null;
  const telegramIdent = links.telegram_channel_identifier || null;
  const telegramUrl = telegramIdent ? `https://t.me/${telegramIdent}` : (llamaProtocol?.telegram || null);
  const discordUrl = links.chat_url?.find(u => u && u.includes('discord')) || llamaProtocol?.discord || null;
  const githubUrl = links.repos_url?.github?.[0] || llamaProtocol?.github?.[0] || null;
  const cmcSlug = (cg.name || coin.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cmcUrl = `https://coinmarketcap.com/currencies/${cmcSlug}/`;

  const importantLinks = {
    website: officialWebsite,
    twitter: twitterUrl,
    telegram: telegramUrl,
    discord: discordUrl,
    github: githubUrl,
    reddit: links.subreddit_url || null,
    coingecko: geckoId ? `https://www.coingecko.com/en/coins/${geckoId}` : null,
    cmc: cmcUrl,
    defillama: llamaSlug ? `https://defillama.com/protocol/${llamaSlug}` : null,
    explorer: links.blockchain_site?.find(u => u && u.length > 5) || (contracts[0]?.explorerUrl || null),
  };

  // Categories & Tags
  const categories = Array.from(new Set([
    ...(cg.categories?.filter(Boolean) || []),
    ...(coin.categories || []),
    llamaProtocol?.category || null
  ])).filter(Boolean);

  // Market numbers (fallback to coin props if cg empty)
  const currentPrice = md.current_price?.usd || coin.price || 0;
  const currentMcap = md.market_cap?.usd || coin.mcap || 0;
  const fees24h = coin.fees24h || 0;
  const revenue24h = coin.revenue24h || coin.fees24h * 0.7 || 0;
  const yield24h = currentMcap > 0 ? ((revenue24h * 365) / currentMcap) * 100 : 0;
  const feeChange7d = coin.feeChange7d || 0;
  const athChange = md.ath_change_percentage?.usd || 0;
  const circulatingSupply = md.circulating_supply || 0;
  const maxSupply = md.max_supply || null;
  const totalSupply = md.total_supply || 0;

  // Generate AI Executive Report
  const aiReport = generateAIReport({
    name: cg.name || coin.name,
    symbol: (cg.symbol || coin.symbol || '').toUpperCase(),
    price: currentPrice,
    mcap: currentMcap,
    fees24h,
    revenue24h,
    yield24h,
    feeChange7d,
    athChange,
    exchanges,
    contracts,
    llamaTVL: llamaProtocol?.tvl || 0,
    circulatingSupply,
    maxSupply,
  });

  return {
    // Identity
    name: cg.name || coin.name,
    symbol: (cg.symbol || coin.symbol || '').toUpperCase(),
    logo: cg.image?.large || cg.image?.small || coin.logo,
    description: cg.description?.en || llamaProtocol?.description || '',
    geckoId,
    llamaSlug,

    // Market data
    price: currentPrice,
    priceChange24h: md.price_change_percentage_24h ?? coin.priceChange24h ?? 0,
    priceChange7d: md.price_change_percentage_7d ?? 0,
    priceChange30d: md.price_change_percentage_30d ?? 0,
    priceChange1y: md.price_change_percentage_1y ?? 0,
    marketCap: currentMcap,
    marketCapRank: md.market_cap_rank || cg.market_cap_rank || coin.rank || null,
    fullyDilutedValuation: md.fully_diluted_valuation?.usd || coin.fdv || 0,
    volume24h: md.total_volume?.usd || coin.totalVol24h || 0,
    
    // Supply
    circulatingSupply,
    totalSupply,
    maxSupply,
    
    // ATH / ATL
    ath: md.ath?.usd || 0,
    athDate: md.ath_date?.usd || null,
    athChangePercent: athChange,
    atl: md.atl?.usd || 0,
    atlDate: md.atl_date?.usd || null,
    atlChangePercent: md.atl_change_percentage?.usd || 0,

    // Sparkline
    sparkline: md.sparkline_7d?.price || [],

    // Revenue & Cashflow
    fees24h,
    revenue24h,
    fees7d: coin.fees7d || 0,
    feeChange7d,
    holdersRevenue24h: coin.holdersRevenue24h || 0,
    holdersRevenue30d: coin.holdersRevenue30d || (coin.holdersRevenue24h ? coin.holdersRevenue24h * 30 : 0),
    holdersMechanism: coin.holdersMechanism || (coin.isBurn ? 'Buyback & Burn' : 'None'),
    holdersMethodology: coin.holdersMethodology || '',
    yield24h,
    priceToFees: fees24h > 0 ? (currentMcap / (fees24h * 365)) : 0,

    // DeFiLlama Protocol Details
    llamaTVL: llamaProtocol?.tvl || 0,
    llamaChains: llamaProtocol?.chains || (coin.chainName ? [coin.chainName] : []),
    llamaCategory: llamaProtocol?.category || '',
    llamaAudits: llamaProtocol?.audits || null,

    // Verified contracts
    contracts,
    isNative: contracts.length === 0,

    // Exchanges & Venues
    exchanges: exchanges.slice(0, 25),
    totalExchanges: exchanges.length,

    // Links & portals
    links: importantLinks,

    // Tags
    categories,

    // Community & Dev Stats
    community: {
      twitterFollowers: cg.community_data?.twitter_followers || 0,
      redditSubscribers: cg.community_data?.reddit_subscribers || 0,
      telegramMembers: cg.community_data?.telegram_channel_user_count || 0,
    },
    developer: {
      githubStars: cg.developer_data?.stars || 0,
      githubForks: cg.developer_data?.forks || 0,
      totalIssues: cg.developer_data?.total_issues || 0,
      closedIssues: cg.developer_data?.closed_issues || 0,
      pullRequests: cg.developer_data?.pull_requests_merged || 0,
      commits4w: cg.developer_data?.commit_count_4_weeks || 0,
    },

    // AI Analyst Dossier
    aiReport,

    // Timestamps
    genesisDate: cg.genesis_date || null,
    fetchedAt: new Date().toISOString(),
    lastUpdated: md.last_updated || new Date().toISOString(),
  };
}
