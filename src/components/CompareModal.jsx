import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Swords, 
  Flame, 
  TrendingUp, 
  Sparkles, 
  Crown, 
  ArrowUpRight, 
  Search, 
  ChevronDown, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { fmtUsd, fmtPct, fmtMultiple } from '../lib/format';
import { getComparisonData } from '../services/comparisonService.js';

// Quick battle presets
const RIVAL_PRESETS = [
  { label: 'HYPE vs GMX', symA: 'HYPE', symB: 'GMX', tag: 'Perps' },
  { label: 'UNI vs AERO', symA: 'UNI', symB: 'AERO', tag: 'DEX Titans' },
  { label: 'RAY vs JTO', symA: 'RAY', symB: 'JTO', tag: 'Solana Giants' },
  { label: 'PENDLE vs ENA', symA: 'PENDLE', symB: 'ENA', tag: 'Yield & Synthetics' },
  { label: 'AAVE vs MKR', symA: 'AAVE', symB: 'MKR', tag: 'Lending' }
];

// Helper formatters
function fmtTick(v) {
  if (Math.abs(v) >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(v);
}

function fmtPctTick(v) {
  return (v >= 0 ? '+' : '') + Number(v).toFixed(1) + '%';
}

/**
 * Custom High-Contrast Comparison Tooltip with 100% Crisp Pure White Text
 */
function CompareTooltip({ active, payload, label, coinA, coinB, activeTab, revMetric, burnMetric }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isLive = data.isLive;

    let titleA = coinA.symbol;
    let titleB = coinB.symbol;
    let valA = 0;
    let valB = 0;
    let formatVal = fmtUsd;

    if (activeTab === 'revenue') {
      valA = revMetric === 'revenue' ? data.revA : data.feesA;
      valB = revMetric === 'revenue' ? data.revB : data.feesB;
    } else if (activeTab === 'burn') {
      valA = burnMetric === 'cumulative' ? data.cumBurnA : data.burnA;
      valB = burnMetric === 'cumulative' ? data.cumBurnB : data.burnB;
    } else if (activeTab === 'mcapGrowth') {
      valA = data.growthA;
      valB = data.growthB;
      formatVal = fmtPctTick;
    }

    const leaderA = valA > valB;
    const leaderB = valB > valA;

    return (
      <div className="bg-[#0b101c]/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl font-mono text-xs backdrop-blur-md min-w-[240px] z-50">
        <div className="border-b border-slate-800 pb-1.5 mb-2.5 flex items-center justify-between gap-3">
          <span className="font-extrabold text-white text-[12px]">{data.date || label}</span>
          {isLive ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[9px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE TODAY</span>
            </span>
          ) : (
            <span className="text-white/60 text-[10px]">DeFiLlama Feed</span>
          )}
        </div>

        <div className="space-y-2">
          {/* Coin A */}
          <div className="flex items-center justify-between gap-4 p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
              <span className="font-extrabold text-white">${coinA.symbol}</span>
              {leaderA && <Crown className="w-3 h-3 text-amber-400" title="Leading" />}
            </div>
            <span className="font-black text-white text-sm">
              {formatVal(valA)}
            </span>
          </div>

          {/* Coin B */}
          <div className="flex items-center justify-between gap-4 p-1.5 rounded bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              <span className="font-extrabold text-white">${coinB.symbol}</span>
              {leaderB && <Crown className="w-3 h-3 text-amber-400" title="Leading" />}
            </div>
            <span className="font-black text-white text-sm">
              {formatVal(valB)}
            </span>
          </div>

          {/* Comparison Delta */}
          {valA > 0 && valB > 0 && activeTab !== 'mcapGrowth' && (
            <div className="flex items-center justify-between text-[10px] text-white/70 pt-1 border-t border-slate-800">
              <span>Ratio:</span>
              <span className="text-white font-bold">
                {leaderA ? `${coinA.symbol} ${(valA / Math.max(1, valB)).toFixed(1)}x higher` : `${coinB.symbol} ${(valB / Math.max(1, valA)).toFixed(1)}x higher`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function CompareModal({ 
  isOpen, 
  onClose, 
  initialCoinA, 
  initialCoinB, 
  allCoins = [] 
}) {
  if (!isOpen) return null;

  // Find fallback coins if none provided
  const defaultA = initialCoinA || allCoins.find(c => c.symbol === 'HYPE') || allCoins[0];
  const defaultB = initialCoinB || allCoins.find(c => c.symbol === 'GMX') || allCoins[1];

  const [coinA, setCoinA] = useState(defaultA);
  const [coinB, setCoinB] = useState(defaultB);

  // Sync with initial props when opened
  useEffect(() => {
    if (initialCoinA) setCoinA(initialCoinA);
    if (initialCoinB) setCoinB(initialCoinB);
  }, [initialCoinA, initialCoinB, isOpen]);

  // Timeframe: 7D, 30D, 90D, 365D (All-Time)
  const [timeframe, setTimeframe] = useState(30);

  // Tab: 'revenue' | 'burn' | 'mcapGrowth'
  const [activeTab, setActiveTab] = useState('revenue');
  const [revMetric, setRevMetric] = useState('revenue'); // 'revenue' | 'fees'
  const [burnMetric, setBurnMetric] = useState('cumulative'); // 'cumulative' | 'daily'

  // Token Selector dropdown state
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [isOpenSelectA, setIsOpenSelectA] = useState(false);
  const [isOpenSelectB, setIsOpenSelectB] = useState(false);

  // Chart data state
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch comparative data whenever coins or timeframe change
  useEffect(() => {
    if (!coinA || !coinB) return;
    let isCurrent = true;
    setLoading(true);

    getComparisonData(coinA, coinB, timeframe)
      .then(data => {
        if (isCurrent) {
          setChartData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [coinA, coinB, timeframe]);

  // Autocomplete filtering
  const filteredCoinsA = useMemo(() => {
    if (!searchA.trim()) return allCoins.slice(0, 15);
    const q = searchA.toLowerCase();
    return allCoins.filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 15);
  }, [searchA, allCoins]);

  const filteredCoinsB = useMemo(() => {
    if (!searchB.trim()) return allCoins.slice(0, 15);
    const q = searchB.toLowerCase();
    return allCoins.filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 15);
  }, [searchB, allCoins]);

  // Handle preset match selection
  const handleSelectPreset = (preset) => {
    const foundA = allCoins.find(c => c.symbol.toUpperCase() === preset.symA.toUpperCase());
    const foundB = allCoins.find(c => c.symbol.toUpperCase() === preset.symB.toUpperCase());
    if (foundA) setCoinA(foundA);
    if (foundB) setCoinB(foundB);
  };

  // KPI Scorecard calculations
  const scorecard = useMemo(() => {
    if (!coinA || !coinB) return null;

    const feesA = coinA.fees24h || 0;
    const feesB = coinB.fees24h || 0;

    const revA = coinA.revenue24h || feesA * 0.7;
    const revB = coinB.revenue24h || feesB * 0.7;

    const mcapA = coinA.mcap || 0;
    const mcapB = coinB.mcap || 0;

    const pfA = coinA.priceToFees || (feesA > 0 ? (mcapA / (feesA * 365)) : null);
    const pfB = coinB.priceToFees || (feesB > 0 ? (mcapB / (feesB * 365)) : null);

    const burnA = coinA.holdersRevenue30d || (coinA.holdersRevenue24h ? coinA.holdersRevenue24h * 30 : 0);
    const burnB = coinB.holdersRevenue30d || (coinB.holdersRevenue24h ? coinB.holdersRevenue24h * 30 : 0);

    const growthA = coinA.feeChange7d || 0;
    const growthB = coinB.feeChange7d || 0;

    return {
      fees: { valA: feesA, valB: feesB, winner: feesA > feesB ? 'A' : feesB > feesA ? 'B' : null },
      revenue: { valA: revA, valB: revB, winner: revA > revB ? 'A' : revB > revA ? 'B' : null },
      mcap: { valA: mcapA, valB: mcapB, winner: mcapA > mcapB ? 'A' : mcapB > mcapA ? 'B' : null },
      pf: { valA: pfA, valB: pfB, winner: (pfA && pfB) ? (pfA < pfB ? 'A' : pfB < pfA ? 'B' : null) : (pfA ? 'A' : 'B') },
      burn: { valA: burnA, valB: burnB, winner: burnA > burnB ? 'A' : burnB > burnA ? 'B' : null },
      growth7d: { valA: growthA, valB: growthB, winner: growthA > growthB ? 'A' : growthB > growthA ? 'B' : null }
    };
  }, [coinA, coinB]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto font-mono text-xs">
      <div className="relative w-full max-w-5xl card border-slate-700 bg-[#0e1422] shadow-2xl p-5 sm:p-7 my-6 max-h-[94vh] overflow-y-auto">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-500 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[#070b14] rounded-[6px] flex items-center justify-center">
                <Swords className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Protocol Comparison Arena</span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase">
                  HEAD-TO-HEAD
                </span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Side-by-side comparative analysis of Daily Cashflow, Token Burn Velocity, and Normalized Market Cap ROI %
              </p>
            </div>
          </div>

          {/* Preset Matchups Bar */}
          <div className="mt-3.5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Rival Matchups:</span>
            </span>
            {RIVAL_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => handleSelectPreset(p)}
                className="px-2.5 py-1 rounded-md bg-[#070b14] hover:bg-slate-800 border border-slate-700/80 text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span>⚔️ {p.label}</span>
                <span className="px-1 py-0.2 rounded bg-slate-800 text-[9px] text-cyan-300 border border-slate-700">{p.tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── DUAL TOKEN SELECTOR HERO ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          
          {/* Side A Selector (Emerald) */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-500/10 via-[#070b14] to-[#070b14] border border-emerald-500/30 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Token A (Contender 1)</span>
              </span>
              <button 
                onClick={() => setIsOpenSelectA(o => !o)} 
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Change Token</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img src={coinA.logo} alt={coinA.name} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-emerald-500/60 p-0.5" onError={e => e.target.style.display = 'none'} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white">${coinA.symbol}</span>
                  <span className="text-slate-400 text-xs font-semibold">{coinA.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                  <span>Price: <strong className="text-white">{fmtUsd(coinA.price)}</strong></span>
                  <span>MC: <strong className="text-emerald-400">{fmtUsd(coinA.mcap)}</strong></span>
                </div>
              </div>
            </div>

            {/* Dropdown A */}
            {isOpenSelectA && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 p-2 bg-[#0b101c] border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Token A..."
                    value={searchA}
                    onChange={e => setSearchA(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  {filteredCoinsA.map(c => (
                    <button
                      key={c.symbol + c.name}
                      onClick={() => { setCoinA(c); setIsOpenSelectA(false); setSearchA(''); }}
                      className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-800 text-left cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2">
                        <img src={c.logo} alt={c.name} className="w-5 h-5 rounded-full" onError={e => e.target.style.display = 'none'} />
                        <span className="font-bold text-white">${c.symbol}</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{c.name}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">{fmtUsd(c.fees24h || 0)}/d</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side B Selector (Amber) */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-amber-500/10 via-[#070b14] to-[#070b14] border border-amber-500/30 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Token B (Contender 2)</span>
              </span>
              <button 
                onClick={() => setIsOpenSelectB(o => !o)} 
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Change Token</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img src={coinB.logo} alt={coinB.name} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-amber-500/60 p-0.5" onError={e => e.target.style.display = 'none'} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white">${coinB.symbol}</span>
                  <span className="text-slate-400 text-xs font-semibold">{coinB.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                  <span>Price: <strong className="text-white">{fmtUsd(coinB.price)}</strong></span>
                  <span>MC: <strong className="text-amber-400">{fmtUsd(coinB.mcap)}</strong></span>
                </div>
              </div>
            </div>

            {/* Dropdown B */}
            {isOpenSelectB && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 p-2 bg-[#0b101c] border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Token B..."
                    value={searchB}
                    onChange={e => setSearchB(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  {filteredCoinsB.map(c => (
                    <button
                      key={c.symbol + c.name}
                      onClick={() => { setCoinB(c); setIsOpenSelectB(false); setSearchB(''); }}
                      className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-800 text-left cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2">
                        <img src={c.logo} alt={c.name} className="w-5 h-5 rounded-full" onError={e => e.target.style.display = 'none'} />
                        <span className="font-bold text-white">${c.symbol}</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{c.name}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold">{fmtUsd(c.fees24h || 0)}/d</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ─── HEAD-TO-HEAD KPI SCORECARD ─── */}
        {scorecard && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
            {/* Metric 1: 24h Fees */}
            <div className="p-3 rounded-xl bg-[#070b14] border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">24h Fees</span>
              <div className="flex items-center justify-between text-xs font-black">
                <span className={scorecard.fees.winner === 'A' ? 'text-emerald-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.fees.winner === 'A' && '👑'} {fmtUsd(scorecard.fees.valA)}
                </span>
                <span className={scorecard.fees.winner === 'B' ? 'text-amber-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.fees.winner === 'B' && '👑'} {fmtUsd(scorecard.fees.valB)}
                </span>
              </div>
            </div>

            {/* Metric 2: 24h Revenue */}
            <div className="p-3 rounded-xl bg-[#070b14] border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">24h Revenue</span>
              <div className="flex items-center justify-between text-xs font-black">
                <span className={scorecard.revenue.winner === 'A' ? 'text-emerald-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.revenue.winner === 'A' && '👑'} {fmtUsd(scorecard.revenue.valA)}
                </span>
                <span className={scorecard.revenue.winner === 'B' ? 'text-amber-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.revenue.winner === 'B' && '👑'} {fmtUsd(scorecard.revenue.valB)}
                </span>
              </div>
            </div>

            {/* Metric 3: Market Cap */}
            <div className="p-3 rounded-xl bg-[#070b14] border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Market Cap</span>
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-white">{fmtUsd(scorecard.mcap.valA)}</span>
                <span className="text-white">{fmtUsd(scorecard.mcap.valB)}</span>
              </div>
            </div>

            {/* Metric 4: P/F Multiple (Cheaper is better) */}
            <div className="p-3 rounded-xl bg-[#070b14] border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">P/F Multiple (Value)</span>
              <div className="flex items-center justify-between text-xs font-black">
                <span className={scorecard.pf.winner === 'A' ? 'text-emerald-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.pf.winner === 'A' && '👑'} {scorecard.pf.valA ? fmtMultiple(scorecard.pf.valA) : 'ND'}
                </span>
                <span className={scorecard.pf.winner === 'B' ? 'text-amber-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.pf.winner === 'B' && '👑'} {scorecard.pf.valB ? fmtMultiple(scorecard.pf.valB) : 'ND'}
                </span>
              </div>
            </div>

            {/* Metric 5: 30D Token Burn */}
            <div className="p-3 rounded-xl bg-[#070b14] border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">30D Token Burn</span>
              <div className="flex items-center justify-between text-xs font-black">
                <span className={scorecard.burn.winner === 'A' ? 'text-emerald-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.burn.winner === 'A' && '👑'} {scorecard.burn.valA > 0 ? fmtUsd(scorecard.burn.valA) : 'No Burn'}
                </span>
                <span className={scorecard.burn.winner === 'B' ? 'text-amber-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.burn.winner === 'B' && '👑'} {scorecard.burn.valB > 0 ? fmtUsd(scorecard.burn.valB) : 'No Burn'}
                </span>
              </div>
            </div>

            {/* Metric 6: 7D Momentum */}
            <div className="p-3 rounded-xl bg-[#070b14] border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">7D Fee Growth</span>
              <div className="flex items-center justify-between text-xs font-black">
                <span className={scorecard.growth7d.winner === 'A' ? 'text-emerald-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.growth7d.winner === 'A' && '👑'} {fmtPct(scorecard.growth7d.valA)}
                </span>
                <span className={scorecard.growth7d.winner === 'B' ? 'text-amber-400 font-extrabold flex items-center gap-0.5' : 'text-slate-400'}>
                  {scorecard.growth7d.winner === 'B' && '👑'} {fmtPct(scorecard.growth7d.valB)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── INTERACTIVE COMPARISON CHART ─── */}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#070b14] mb-4">
          
          {/* Chart Header Bar */}
          <div className="p-3 bg-[#0b101c] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px]">
            
            {/* Tabs: Revenue, Burn, MC % Growth */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTab('revenue')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ' + (
                  activeTab === 'revenue' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' 
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                )}
              >
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Revenue Curves</span>
              </button>

              <button
                onClick={() => setActiveTab('burn')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ' + (
                  activeTab === 'burn' 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' 
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                )}
              >
                <span>🔥</span>
                <span>2. Token Burn Curves</span>
              </button>

              <button
                onClick={() => setActiveTab('mcapGrowth')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ' + (
                  activeTab === 'mcapGrowth' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' 
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                )}
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>3. Market Cap % ROI Growth</span>
              </button>
            </div>

            {/* Sub-Metric Switchers + Timeframe */}
            <div className="flex items-center gap-3 flex-wrap">
              {activeTab === 'revenue' && (
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                  <button
                    onClick={() => setRevMetric('revenue')}
                    className={'px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ' + (
                      revMetric === 'revenue' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Revenue (Net)
                  </button>
                  <button
                    onClick={() => setRevMetric('fees')}
                    className={'px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ' + (
                      revMetric === 'fees' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Total Fees
                  </button>
                </div>
              )}

              {activeTab === 'burn' && (
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                  <button
                    onClick={() => setBurnMetric('cumulative')}
                    className={'px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ' + (
                      burnMetric === 'cumulative' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Cumulative Burn
                  </button>
                  <button
                    onClick={() => setBurnMetric('daily')}
                    className={'px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ' + (
                      burnMetric === 'daily' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Daily Burn
                  </button>
                </div>
              )}

              {/* Timeframe Buttons: 7D, 30D, 90D, All-Time */}
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                {[
                  { d: 7, label: '7D' },
                  { d: 30, label: '30D' },
                  { d: 90, label: '90D' },
                  { d: 365, label: 'All-Time' }
                ].map(tf => (
                  <button
                    key={tf.d}
                    onClick={() => setTimeframe(tf.d)}
                    className={'px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ' + (
                      timeframe === tf.d 
                        ? 'bg-emerald-500 text-black font-extrabold shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Chart Canvas */}
          <div className="p-4">
            {loading ? (
              <div className="h-[340px] flex items-center justify-center text-slate-400 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Harmonizing comparative time-series from DeFiLlama &amp; CoinGecko...</span>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[340px] flex items-center justify-center text-slate-500 text-xs">
                No overlapping historical data found for these two tokens.
              </div>
            ) : (
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      interval={timeframe === 7 ? 0 : Math.floor(chartData.length / 8)}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      tickFormatter={activeTab === 'mcapGrowth' ? fmtPctTick : fmtTick}
                      width={65}
                    />
                    
                    {activeTab === 'mcapGrowth' && (
                      <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                    )}

                    <Tooltip 
                      content={
                        <CompareTooltip 
                          coinA={coinA} 
                          coinB={coinB} 
                          activeTab={activeTab} 
                          revMetric={revMetric} 
                          burnMetric={burnMetric} 
                        />
                      } 
                    />

                    {/* Curve for Coin A (Emerald) */}
                    <Line
                      type="monotone"
                      dataKey={
                        activeTab === 'revenue' 
                          ? (revMetric === 'revenue' ? 'revA' : 'feesA')
                          : activeTab === 'burn'
                          ? (burnMetric === 'cumulative' ? 'cumBurnA' : 'burnA')
                          : 'growthA'
                      }
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
                      name={coinA.symbol}
                    />

                    {/* Curve for Coin B (Amber) */}
                    <Line
                      type="monotone"
                      dataKey={
                        activeTab === 'revenue' 
                          ? (revMetric === 'revenue' ? 'revB' : 'feesB')
                          : activeTab === 'burn'
                          ? (burnMetric === 'cumulative' ? 'cumBurnB' : 'burnB')
                          : 'growthB'
                      }
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 1.5 }}
                      name={coinB.symbol}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend & Summary Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-800 text-[11px] text-slate-300">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
                  <span className="font-extrabold text-white">${coinA.symbol}</span>
                  <span className="text-slate-400">({coinA.name})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                  <span className="font-extrabold text-white">${coinB.symbol}</span>
                  <span className="text-slate-400">({coinB.name})</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-400 text-[10px]">
                <span className="text-emerald-400 font-bold">🟢 Live 15m Sync Enabled</span>
                <span>·</span>
                <span>Source: DeFiLlama &amp; CoinGecko APIs</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 font-mono">
            Direct on-chain cashflow &amp; valuation comparison engine
          </span>
          <button 
            onClick={onClose} 
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer border border-slate-700"
          >
            Close Arena
          </button>
        </div>

      </div>
    </div>
  );
}
