import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, ExternalLink, Copy, Check, TrendingUp, TrendingDown, 
  Globe, Github, RefreshCw, Shield, Users, Code, Star, 
  AlertTriangle, Cpu, Sparkles, Building2, Flame, Coins,
  CheckCircle2, ArrowUpRight, BarChart3, Lock
} from 'lucide-react';
import { fetchTokenResearch, getExplorerUrl } from '../services/tokenResearchService';

function fmtUsd(val) {
  if (!val || isNaN(val)) return '$0';
  if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + 'T';
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(1) + 'K';
  if (val < 0.01) return '$' + Number(val).toFixed(6);
  return '$' + Number(val).toFixed(2);
}

function fmtNum(val) {
  if (!val || isNaN(val)) return '0';
  if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
  return Number(val).toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function PctBadge({ value, size = 'sm' }) {
  if (value === null || value === undefined || isNaN(value)) return <span className="text-slate-500 text-xs">—</span>;
  const isUp = value >= 0;
  const cls = size === 'lg'
    ? `text-lg font-black ${isUp ? 'text-emerald-400' : 'text-rose-400'}`
    : `text-xs font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`;
  return (
    <span className={`inline-flex items-center gap-0.5 ${cls}`}>
      {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy} 
      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/60" 
      title="Copy Address"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
    </button>
  );
}

// Mini 7d sparkline
function MiniSparkline({ data, width = 110, height = 32 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} className="inline-block overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#10b981' : '#f43f5e'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function chainLabel(chain) {
  const map = {
    'ethereum': '🔷 Ethereum',
    'polygon-pos': '🟣 Polygon',
    'binance-smart-chain': '🟡 BNB Chain',
    'arbitrum-one': '🔵 Arbitrum',
    'optimistic-ethereum': '🔴 Optimism',
    'avalanche': '🔺 Avalanche',
    'solana': '☀️ Solana',
    'base': '🔵 Base',
    'blast': '💥 Blast',
    'fantom': '👻 Fantom',
  };
  return map[chain] || (chain.charAt(0).toUpperCase() + chain.slice(1).replace(/-/g, ' '));
}

export default function TokenResearchPage({ coin, isOpen, onClose, onOpenCompare }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'exchanges' | 'contracts' | 'community'
  const [exchangeFilter, setExchangeFilter] = useState('all'); // 'all' | 'cex' | 'dex'

  const loadData = useCallback(async () => {
    if (!coin) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTokenResearch(coin);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to fetch live token intelligence');
    } finally {
      setLoading(false);
    }
  }, [coin]);

  // Fetch fresh every time it opens — strictly zero stale storage
  useEffect(() => {
    if (isOpen && coin) {
      loadData();
    } else {
      setData(null);
    }
  }, [isOpen, coin, loadData]);

  if (!isOpen) return null;

  const filteredExchanges = (data?.exchanges || []).filter(ex => {
    if (exchangeFilter === 'cex') return ex.isCEX;
    if (exchangeFilter === 'dex') return !ex.isCEX;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-start justify-center overflow-y-auto py-3 px-2 sm:py-6 sm:px-4">
      <div className="bg-[#0b101d] border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl relative font-sans text-slate-100 overflow-hidden mb-8">
        
        {/* Top Control Bar */}
        <div className="sticky top-0 z-30 bg-[#070b14]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-extrabold text-white tracking-wide">
              LIVE TOKEN RESEARCH &amp; INTEL DOSSIER
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              100% Fresh Un-cached Data
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCompare && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCompare(coin, null);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Compare in Arena"
              >
                <span>⚔️</span>
                <span className="hidden sm:inline">Compare</span>
              </button>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Re-scan live data from CoinGecko, DeFiLlama &amp; DexScreener"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && !data && (
          <div className="p-24 text-center">
            <div className="relative inline-block mb-4">
              <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin" />
              <Sparkles className="w-5 h-5 text-amber-300 absolute top-1 right-1 animate-pulse" />
            </div>
            <h3 className="text-lg font-extrabold text-white">Synthesizing Live Intel for ${coin.symbol}...</h3>
            <p className="text-slate-400 text-xs mt-1.5">
              Querying CoinGecko full metadata, DeFiLlama protocol fees, and exchange venues...
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live scan with zero caching
            </div>
          </div>
        )}

        {/* Error View */}
        {error && (
          <div className="p-16 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h3 className="text-lg font-extrabold text-white">Live Scan Note</h3>
            <p className="text-rose-300 text-sm mt-1 max-w-md mx-auto">{error}</p>
            <button 
              onClick={loadData} 
              className="mt-4 px-4 py-2 bg-emerald-500 text-black font-extrabold rounded-xl text-xs hover:bg-emerald-400 transition cursor-pointer"
            >
              Retry Live Scan
            </button>
          </div>
        )}

        {/* Main Content */}
        {data && (
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* HERO SECTION */}
            <div className="bg-gradient-to-br from-[#0e172a] via-[#0d1424] to-[#070b14] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                
                {/* Left: Token Identity & Live Price */}
                <div className="flex items-start gap-4">
                  <img
                    src={data.logo}
                    alt={data.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border-2 border-slate-700/80 p-1 flex-shrink-0 shadow-lg"
                    onError={e => { e.target.src = `https://avatar.vercel.sh/${data.symbol}`; }}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{data.name}</h1>
                      <span className="text-lg font-extrabold text-emerald-400 font-mono">${data.symbol}</span>
                      {data.marketCapRank && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold border border-slate-700">
                          Rank #{data.marketCapRank}
                        </span>
                      )}
                      {data.holdersMechanism && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/40">
                          🔥 {data.holdersMechanism}
                        </span>
                      )}
                    </div>

                    {/* Price & Trend */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-3xl font-black text-white font-mono">
                        ${data.price >= 1 ? data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : data.price.toFixed(6)}
                      </span>
                      <PctBadge value={data.priceChange24h} size="lg" />
                      <div className="ml-2 hidden sm:block">
                        <MiniSparkline data={data.sparkline} width={100} height={28} />
                      </div>
                    </div>

                    {/* Multi-timeframe trend */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-mono flex-wrap">
                      <span>7D: <PctBadge value={data.priceChange7d} /></span>
                      <span>·</span>
                      <span>30D: <PctBadge value={data.priceChange30d} /></span>
                      <span>·</span>
                      <span>1Y: <PctBadge value={data.priceChange1y} /></span>
                      <span>·</span>
                      <span className="text-slate-500">Scan: {new Date(data.fetchedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Portals (CoinGecko, CMC, CEX, DeFiLlama, Website) */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 flex-shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Official Portals &amp; Trackers
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {data.links.website && (
                      <a
                        href={data.links.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Website</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-500" />
                      </a>
                    )}
                    {data.links.coingecko && (
                      <a
                        href={data.links.coingecko}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition border border-emerald-500/30 flex items-center gap-1.5"
                      >
                        <span>🦎</span>
                        <span>CoinGecko</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      </a>
                    )}
                    {data.links.cmc && (
                      <a
                        href={data.links.cmc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-bold transition border border-blue-500/30 flex items-center gap-1.5"
                      >
                        <span>📊</span>
                        <span>CoinMarketCap</span>
                        <ArrowUpRight className="w-3 h-3 text-blue-400" />
                      </a>
                    )}
                    {data.links.defillama && (
                      <a
                        href={data.links.defillama}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold transition border border-purple-500/30 flex items-center gap-1.5"
                      >
                        <span>🦙</span>
                        <span>DeFiLlama</span>
                        <ArrowUpRight className="w-3 h-3 text-purple-400" />
                      </a>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* 🤖 AI ANALYST EXECUTIVE DOSSIER */}
            {data.aiReport && (
              <div className="bg-gradient-to-r from-[#0d1424] via-[#101b33] to-[#0d1424] p-5 sm:p-6 rounded-2xl border border-cyan-500/30 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                      <Cpu className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <span>AI Executive Analyst Report</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                          AI INTEL
                        </span>
                      </h2>
                      <p className="text-slate-400 text-xs">
                        Algorithmic fundamental synthesis generated from live cross-chain feeds
                      </p>
                    </div>
                  </div>

                  {/* Cashflow Score & Verdict */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Cashflow Alpha Score</div>
                      <div className="text-2xl font-black text-cyan-400 font-mono">{data.aiReport.score}/100</div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${data.aiReport.badgeColor}`}>
                      {data.aiReport.rating}
                    </span>
                  </div>
                </div>

                {/* AI Insights Bullet Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {data.aiReport.insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-[#070b14]/70 p-3 rounded-xl border border-slate-800/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-200 leading-relaxed font-sans">{ins}</span>
                    </div>
                  ))}
                </div>

                {/* Dilution & Liquidity AI Audits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#070b14]/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 block mb-0.5">Supply Dilution Audit</span>
                      <span className="text-slate-300">{data.aiReport.dilutionNote}</span>
                    </div>
                  </div>
                  <div className="bg-[#070b14]/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-cyan-300 block mb-0.5">Exchange &amp; Liquidity Health</span>
                      <span className="text-slate-300">{data.aiReport.liquidityNote}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB SELECTOR: Overview, Contracts, Exchanges, Community */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto font-mono text-xs">
              {[
                { id: 'overview', label: '📊 Market & Cashflow Metrics' },
                { id: 'contracts', label: `📝 Verified Contracts (${data.contracts.length})` },
                { id: 'exchanges', label: `🏦 CEX & DEX Listings (${data.totalExchanges})` },
                { id: 'community', label: '👥 Community & Dev Activity' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                      : 'text-slate-400 hover:text-white bg-[#0e1422] border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW & CASHFLOW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Cashflow & DeFiLlama Engine */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Live Cashflow Engine (DeFiLlama Feed)</span>
                    </h3>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      Yield: {data.yield24h?.toFixed(2)}% / year
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Today Fees (24h)</span>
                      <span className="text-lg font-black text-amber-300 font-mono mt-1 block">{fmtUsd(data.fees24h)}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Total protocol receipts</span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Holders Revenue (24h)</span>
                      <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">{fmtUsd(data.revenue24h)}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Net value returning to holders</span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">7D Fee Velocity</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-lg font-black font-mono">
                          {data.feeChange7d >= 0 ? '+' : ''}{data.feeChange7d?.toFixed(1)}%
                        </span>
                        {data.feeChange7d >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">7-day volume trend</span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Price to Fees (P/F)</span>
                      <span className="text-lg font-black text-cyan-300 font-mono mt-1 block">
                        {data.priceToFees > 0 ? `${data.priceToFees.toFixed(1)}x` : 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Valuation multiple</span>
                    </div>
                  </div>
                </div>

                {/* Market & Valuation Grid */}
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Market Cap &amp; Valuation Fundamentals (CoinGecko Feed)</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Market Cap</span>
                      <span className="text-base font-black text-white mt-1 block">{fmtUsd(data.marketCap)}</span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">24h Trading Vol</span>
                      <span className="text-base font-black text-white mt-1 block">{fmtUsd(data.volume24h)}</span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Fully Diluted (FDV)</span>
                      <span className="text-base font-black text-white mt-1 block">{fmtUsd(data.fullyDilutedValuation)}</span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">All-Time High (ATH)</span>
                      <span className="text-base font-black text-emerald-400 mt-1 block">{fmtUsd(data.ath)}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {data.athChangePercent?.toFixed(1)}% · {fmtDate(data.athDate)}
                      </span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Circulating Supply</span>
                      <span className="text-sm font-bold text-white mt-1 block">
                        {fmtNum(data.circulatingSupply)} {data.symbol}
                      </span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Supply</span>
                      <span className="text-sm font-bold text-white mt-1 block">
                        {fmtNum(data.totalSupply)} {data.symbol}
                      </span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Max Supply</span>
                      <span className="text-sm font-bold text-white mt-1 block">
                        {data.maxSupply ? `${fmtNum(data.maxSupply)} ${data.symbol}` : '∞ Unlimited'}
                      </span>
                    </div>

                    <div className="bg-[#0e1422] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">All-Time Low (ATL)</span>
                      <span className="text-base font-black text-rose-400 mt-1 block">{fmtUsd(data.atl)}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        +{data.atlChangePercent?.toFixed(0)}% · {fmtDate(data.atlDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description & About */}
                {data.description && (
                  <div className="bg-[#0e1422] p-5 rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-extrabold text-white mb-2.5">
                      📖 About {data.name} ({data.symbol})
                    </h3>
                    <div 
                      className="text-xs sm:text-sm text-slate-300 leading-relaxed max-h-56 overflow-y-auto pr-2 prose prose-invert prose-sm prose-a:text-emerald-400 prose-a:underline"
                      dangerouslySetInnerHTML={{ __html: data.description }}
                    />
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: VERIFIED CONTRACT ADDRESSES */}
            {activeTab === 'contracts' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Official Smart Contract Addresses:</strong> Sourced directly from CoinGecko platforms. Always verify the address and explorer before transacting.
                  </span>
                </div>

                {data.contracts.length > 0 ? (
                  <div className="space-y-2.5 font-mono">
                    {data.contracts.map((c, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1422] p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
                            {chainLabel(c.chain)}
                          </span>
                          {c.decimals && (
                            <span className="text-[10px] text-slate-500 font-sans">
                              Decimals: {c.decimals}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <code className="text-xs text-cyan-300 bg-[#070b14] px-3 py-1.5 rounded-lg border border-slate-800/80 break-all select-all flex-1 sm:flex-none">
                            {c.address}
                          </code>
                          <CopyButton text={c.address} />
                          {c.explorerUrl && (
                            <a
                              href={c.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
                              title="View on Blockchain Explorer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#0e1422] rounded-xl border border-slate-800">
                    <Coins className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-white">Native Blockchain Layer 1 Asset</h4>
                    <p className="text-slate-400 text-xs mt-1">
                      ${data.symbol} is the native gas or base protocol asset of its blockchain (no token smart contract required).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EXCHANGES & VENUES */}
            {activeTab === 'exchanges' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs text-slate-400">
                    Showing {filteredExchanges.length} trading pairs across global venues
                  </div>
                  
                  {/* CEX / DEX filter switch */}
                  <div className="flex items-center bg-[#070b14] border border-slate-800 rounded-lg p-0.5 text-xs font-bold">
                    <button
                      onClick={() => setExchangeFilter('all')}
                      className={`px-3 py-1 rounded-md transition cursor-pointer ${
                        exchangeFilter === 'all' ? 'bg-emerald-500 text-black font-extrabold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({data.totalExchanges})
                    </button>
                    <button
                      onClick={() => setExchangeFilter('cex')}
                      className={`px-3 py-1 rounded-md transition cursor-pointer ${
                        exchangeFilter === 'cex' ? 'bg-blue-500 text-white font-extrabold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      CEX Only
                    </button>
                    <button
                      onClick={() => setExchangeFilter('dex')}
                      className={`px-3 py-1 rounded-md transition cursor-pointer ${
                        exchangeFilter === 'dex' ? 'bg-purple-500 text-white font-extrabold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      DEX Only
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredExchanges.map((ex, i) => (
                    <a
                      key={i}
                      href={ex.tradeUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-[#0e1422] border border-slate-800/80 hover:border-slate-600 transition group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">{ex.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-black ${
                            ex.isCEX ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          }`}>
                            {ex.isCEX ? 'CEX' : 'DEX'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{ex.pair}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-200 font-mono block">
                          {fmtUsd(ex.volume24h)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">24h volume</span>
                      </div>
                      
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition flex-shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: COMMUNITY & DEVELOPER */}
            {activeTab === 'community' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Community Metrics */}
                <div className="bg-[#0e1422] p-5 rounded-2xl border border-slate-800">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Community &amp; Social Reach</span>
                  </h3>
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-[#070b14] rounded-xl border border-slate-800">
                      <span className="text-slate-400">𝕏 Twitter Followers</span>
                      <span className="font-bold text-white">{fmtNum(data.community.twitterFollowers)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-[#070b14] rounded-xl border border-slate-800">
                      <span className="text-slate-400">📱 Telegram Channel Members</span>
                      <span className="font-bold text-white">{fmtNum(data.community.telegramMembers)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-[#070b14] rounded-xl border border-slate-800">
                      <span className="text-slate-400">🟠 Reddit Subscribers</span>
                      <span className="font-bold text-white">{fmtNum(data.community.redditSubscribers)}</span>
                    </div>
                  </div>
                </div>

                {/* Developer Stats */}
                <div className="bg-[#0e1422] p-5 rounded-2xl border border-slate-800">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-3">
                    <Code className="w-4 h-4 text-purple-400" />
                    <span>Developer Activity (GitHub)</span>
                  </h3>
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-[#070b14] rounded-xl border border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400" /> GitHub Stars
                      </span>
                      <span className="font-bold text-white">{fmtNum(data.developer.githubStars)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-[#070b14] rounded-xl border border-slate-800">
                      <span className="text-slate-400">🔀 Repository Forks</span>
                      <span className="font-bold text-white">{fmtNum(data.developer.githubForks)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-[#070b14] rounded-xl border border-slate-800">
                      <span className="text-slate-400">⚡ 4-Week Commit Count</span>
                      <span className="font-bold text-emerald-400">{fmtNum(data.developer.commits4w)}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* FOOTER AUDIT BAR */}
            <div className="p-3 bg-[#070b14] rounded-xl border border-slate-800/80 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Scanned fresh from CoinGecko API + DeFiLlama Protocol Feeds</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>Verified Zero-Cache Policy</span>
                <span>·</span>
                <span>Last Updated: {new Date(data.fetchedAt).toLocaleTimeString()}</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
