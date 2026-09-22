import React, { useState, useMemo, useEffect } from 'react';
import { 
  ExternalLink, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  RefreshCw, 
  Flame, 
  Zap, 
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { fmtUsd, fmtCompact, fmtPct } from '../lib/format';
import { getRevenuePriceHistory } from '../services/revenuePriceHistoryService';
import RevenueHoldersLeaderboard from './RevenueHoldersLeaderboard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtValueTick(v) {
  if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

function fmtPriceTick(v) {
  if (v >= 1) return '$' + v.toFixed(2);
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toExponential(2);
}

// ─── Mini inline chart (expanded row) ────────────────────────────────────────

function RevenueChart({ coin, days }) {
  const [metric, setMetric] = useState('revenue'); // 'revenue' | 'fees'
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    getRevenuePriceHistory(coin, days).then((points) => {
      if (isCurrent) {
        setChartData(points);
        setLoading(false);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [coin, days]);

  const hasSlug = Boolean(coin.defillamaSlug);

  return (
    <div className="bg-[#0b101c] rounded-xl p-4 border border-slate-800">
      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-[11px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold">Chart Metric:</span>
          <button
            onClick={() => setMetric('revenue')}
            className={'px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ' + (
              metric === 'revenue'
                ? 'bg-amber-500 text-black shadow-sm font-extrabold'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            )}
          >
            🔥 Daily Revenue (DeFiLlama)
          </button>
          <button
            onClick={() => setMetric('fees')}
            className={'px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ' + (
              metric === 'fees'
                ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            )}
          >
            💸 Total Daily Fees
          </button>

          {hasSlug ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
              <span>✓</span>
              <span>100% Live DeFiLlama API Data</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] border border-slate-700">
              ~ Estimated trajectory
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className={'inline-block w-3 h-3 rounded-sm ' + (metric === 'revenue' ? 'bg-amber-500' : 'bg-emerald-500')}></span>
            <span>{metric === 'revenue' ? 'Daily Revenue (left)' : 'Daily Fees (left)'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-violet-400"></span>
            <span>Price USD (right)</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center text-slate-400 text-xs">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Fetching live daily data from DeFiLlama &amp; CoinGecko...</span>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">
          No historical data available for this token.
        </div>
      ) : (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 55, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id={'barGrad_' + (coin.id || coin.symbol)} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric === 'revenue' ? '#f59e0b' : '#10b981'} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={metric === 'revenue' ? '#d97706' : '#059669'} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={9}
                tickLine={false}
                interval={days === 7 ? 0 : Math.floor(chartData.length / 8)}
              />
              <YAxis
                yAxisId="value"
                orientation="left"
                stroke={metric === 'revenue' ? '#f59e0b' : '#10b981'}
                fontSize={9}
                tickLine={false}
                tickFormatter={fmtValueTick}
                width={55}
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                stroke="#a78bfa"
                fontSize={9}
                tickLine={false}
                tickFormatter={fmtPriceTick}
                width={62}
              />
              <Tooltip
                contentStyle={{
                  background: '#070b14',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}
                formatter={(val, name, item) => {
                  const isLive = item?.payload?.isLive;
                  if (name === 'revenue') return [fmtUsd(val) + (isLive ? ' 🟢 (Live Today · 15m scan)' : ''), 'Revenue (Net)'];
                  if (name === 'fees') return [fmtUsd(val) + (isLive ? ' 🟢 (Live Today · 15m scan)' : ''), 'Total Fees'];
                  if (name === 'price') return [fmtPriceTick(val), 'Price'];
                  return [val, name];
                }}
              />
              <Bar
                yAxisId="value"
                dataKey={metric}
                radius={[2, 2, 0, 0]}
                maxBarSize={28}
                name={metric}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isLive
                      ? (metric === 'revenue' ? '#f59e0b' : '#10b981')
                      : ('url(#barGrad_' + (coin.id || coin.symbol) + ')')}
                    stroke={entry.isLive ? '#38bdf8' : 'none'}
                    strokeWidth={entry.isLive ? 2 : 0}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#a78bfa' }}
                name="price"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────

function RevenueRow({ coin, rank, days, onOpenModal }) {
  const [expanded, setExpanded] = useState(false);
  const dexUrl = 'https://dexscreener.com/search?q=' + encodeURIComponent(coin.symbol);

  const annualFees = (coin.fees24h || 0) * 365;
  const revToMcap = coin.mcap > 0 ? ((coin.fees24h || 0) / coin.mcap) * 100 : 0;

  return (
    <>
      <tr
        className={'border-b border-slate-800/60 hover:bg-slate-800/40 transition cursor-pointer ' + (expanded ? 'bg-slate-800/25' : '')}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Rank */}
        <td className="py-3 pl-4 pr-2 text-slate-500 font-bold text-[11px] w-10">{rank}</td>

        {/* Coin */}
        <td className="py-3 px-2">
          <div className="flex items-center gap-2.5">
            <img
              src={coin.logo}
              alt={coin.name}
              className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0"
              onError={e => e.target.style.display = 'none'}
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white font-bold text-xs">{coin.name}</span>
                <span className="px-1.5 py-0 rounded bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                  {coin.symbol}
                </span>

                {/* Status Badges: Recovery, Up Today, Up Week */}
                {coin.isRecovery && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black tracking-wide flex items-center gap-0.5">
                    <span>🔄</span>
                    <span>RECOVERY</span>
                  </span>
                )}

                {coin.isUpToday && !coin.isRecovery && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[9px] font-extrabold flex items-center gap-0.5">
                    <span>⚡</span>
                    <span>&gt; Lbareh</span>
                  </span>
                )}

                {coin.isUpWeek && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold flex items-center gap-0.5">
                    <span>📈</span>
                    <span>7D Up</span>
                  </span>
                )}

                {coin.isBurn && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black tracking-wide flex items-center gap-0.5">
                    <span>🔥</span>
                    <span>BURN</span>
                  </span>
                )}

                {coin.priceChange24h !== undefined && (
                  <span className={'text-[10px] font-bold px-1.5 py-0 rounded ' + (
                    coin.priceChange24h >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                  )}>
                    {coin.priceChange24h >= 0 ? '+' : ''}{coin.priceChange24h?.toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>MC: <strong className="text-slate-300">{fmtUsd(coin.mcap)}</strong></span>
                {coin.defillamaSlug && (
                  <span className="text-emerald-400 font-medium">✓ DeFiLlama: {coin.defillamaSlug}</span>
                )}
              </div>
            </div>
          </div>
        </td>

        {/* 24h Fees + Day Change Badge */}
        <td className="py-3 px-3 text-right">
          <div className="flex flex-col items-end">
            <span className="text-emerald-400 font-extrabold text-sm">{coin.fees24h ? fmtUsd(coin.fees24h) : 'ND'}</span>
            <div className="flex items-center gap-1 mt-0.5">
              {coin.feeChange1d !== undefined && coin.feeChange1d !== null ? (
                <span className={'text-[9px] font-bold px-1.5 py-0.5 rounded ' + (
                  coin.feeChange1d > 0
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                    : coin.feeChange1d < 0
                    ? 'text-rose-300 bg-rose-500/20 border border-rose-500/30'
                    : 'text-slate-400 bg-slate-800'
                )}>
                  {coin.feeChange1d > 0 ? '▲ +' : coin.feeChange1d < 0 ? '▼ ' : ''}{coin.feeChange1d}% vs lbareh
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">fees/day</span>
              )}
            </div>
          </div>
        </td>

        {/* 7D Fee Momentum */}
        <td className="py-3 px-3 text-right">
          <div className="flex flex-col items-end">
            {coin.feeChange7d !== undefined && coin.feeChange7d !== null ? (
              <span className={'font-bold text-xs px-2 py-0.5 rounded ' + (
                coin.feeChange7d > 0
                  ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30'
                  : coin.feeChange7d < 0
                  ? 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
                  : 'text-slate-400 bg-slate-800'
              )}>
                {coin.feeChange7d > 0 ? '▲ +' : coin.feeChange7d < 0 ? '▼ ' : ''}{coin.feeChange7d}% 7D
              </span>
            ) : (
              <span className="text-slate-500 text-xs">—</span>
            )}
            <span className="text-[9px] text-slate-500 mt-0.5">weekly trend</span>
          </div>
        </td>

        {/* 24h Revenue */}
        <td className="py-3 px-3 text-right">
          <span className="text-amber-400 font-bold text-xs">{coin.revenue24h ? fmtUsd(coin.revenue24h) : 'ND'}</span>
          <div className="text-[10px] text-slate-500">revenue/day</div>
        </td>

        {/* Holders Rev / Burn (30D) & Mechanism */}
        <td className="py-3 px-3 text-right">
          <div className="flex flex-col items-end">
            {coin.holdersRevenue30d ? (
              <>
                <span className={'font-black text-xs ' + (coin.isBurn ? 'text-rose-400' : 'text-emerald-300')}>
                  {fmtUsd(coin.holdersRevenue30d)}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  {coin.isBurn ? (
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black flex items-center gap-0.5">
                      <span>🔥</span>
                      <span>{coin.holdersMechanism || 'Burn'}</span>
                    </span>
                  ) : coin.holdersMechanism === 'Staking Real Yield' ? (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black flex items-center gap-0.5">
                      <span>💰</span>
                      <span>Staking Yield</span>
                    </span>
                  ) : coin.holdersMechanism === 'veToken Revenue' ? (
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black flex items-center gap-0.5">
                      <span>🗳️</span>
                      <span>veVoters</span>
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold">
                      Holders Rev
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="text-slate-600 font-bold text-xs">ND</span>
                <span className="text-[9px] text-slate-600 mt-0.5">no burn feed</span>
              </>
            )}
          </div>
        </td>

        {/* Annualized */}
        <td className="py-3 px-3 text-right">
          <span className="text-white font-bold text-xs">{fmtUsd(annualFees)}</span>
          <div className="text-[10px] text-slate-500">est. annual</div>
        </td>

        {/* Rev / MC ratio */}
        <td className="py-3 px-3 text-right">
          <span className={'font-bold text-xs ' + (revToMcap > 0.5 ? 'text-emerald-400' : revToMcap > 0.1 ? 'text-amber-400' : 'text-slate-400')}>
            {revToMcap.toFixed(3)}%
          </span>
          <div className="text-[10px] text-slate-500">fees/MC</div>
        </td>

        {/* Price */}
        <td className="py-3 px-3 text-right">
          <span className="text-white font-bold text-xs">{fmtUsd(coin.price)}</span>
        </td>

        {/* Actions */}
        <td className="py-3 px-3 text-right">
          <div className="flex items-center gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onOpenModal(coin)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 transition cursor-pointer"
            >
              Details
            </button>
            <a
              href={dexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 transition"
            >
              DEX
            </a>
          </div>
        </td>

        {/* Expand arrow */}
        <td className="py-3 pr-4 pl-1">
          <div className="text-slate-400 flex items-center justify-center">
            {expanded ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </td>
      </tr>

      {/* Expanded chart row */}
      {expanded && (
        <tr className="bg-[#070b14] border-b border-slate-800">
          <td colSpan={11} className="px-4 py-3">
            <RevenueChart coin={coin} days={days} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RevenuePage({ coins, onOpenModal }) {
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [minFees, setMinFees] = useState(0);
  const [showCount, setShowCount] = useState(50);
  
  // 🎯 Momentum Filter Tab State requested by user:
  // 'all' | 'weekly_growth' | 'daily_surge' | 'recovery' | 'top_burn'
  const [momentumTab, setMomentumTab] = useState('all');
  const [sortBy, setSortBy] = useState('feesDesc'); // 'feesDesc' | 'daySurge' | 'weekGrowth' | 'revToMcap' | 'burnDesc'

  // Pre-calculate counts for each tab
  const counts = useMemo(() => {
    const valid = coins.filter(c => c.fees24h && c.fees24h > 0 && !c.isND);
    return {
      all: valid.length,
      weekly: valid.filter(c => c.isUpWeek || (c.feeChange7d && c.feeChange7d > 0)).length,
      daily: valid.filter(c => c.isUpToday || (c.feeChange1d && c.feeChange1d > 0)).length,
      recovery: valid.filter(c => c.isRecovery).length,
      burn: valid.filter(c => c.isBurn || (c.holdersRevenue30d && c.holdersRevenue30d > 0)).length
    };
  }, [coins]);

  // Filtered list based on active momentum tab, search, and minFees
  const ranked = useMemo(() => {
    return coins
      .filter(c => c.fees24h && c.fees24h > 0 && !c.isND)
      .filter(c => {
        if (momentumTab === 'weekly_growth') {
          return c.isUpWeek || (c.feeChange7d && c.feeChange7d > 0);
        }
        if (momentumTab === 'daily_surge') {
          return c.isUpToday || (c.feeChange1d && c.feeChange1d > 0);
        }
        if (momentumTab === 'recovery') {
          return Boolean(c.isRecovery);
        }
        if (momentumTab === 'top_burn') {
          return Boolean(c.isBurn || (c.holdersRevenue30d && c.holdersRevenue30d > 0));
        }
        return true;
      })
      .filter(c => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
      })
      .filter(c => c.fees24h >= minFees)
      .sort((a, b) => {
        if (sortBy === 'burnDesc' || (momentumTab === 'top_burn' && sortBy === 'feesDesc')) {
          return (b.holdersRevenue30d || 0) - (a.holdersRevenue30d || 0);
        }
        if (sortBy === 'daySurge') return (b.feeChange1d || 0) - (a.feeChange1d || 0);
        if (sortBy === 'weekGrowth') return (b.feeChange7d || 0) - (a.feeChange7d || 0);
        if (sortBy === 'revToMcap') {
          const ratioA = a.mcap > 0 ? (a.fees24h / a.mcap) : 0;
          const ratioB = b.mcap > 0 ? (b.fees24h / b.mcap) : 0;
          return ratioB - ratioA;
        }
        return (b.fees24h || 0) - (a.fees24h || 0);
      });
  }, [coins, momentumTab, search, minFees, sortBy]);

  const totalFees = useMemo(() => ranked.reduce((s, c) => s + (c.fees24h || 0), 0), [ranked]);
  const totalRev = useMemo(() => ranked.reduce((s, c) => s + (c.revenue24h || 0), 0), [ranked]);

  const displayed = ranked.slice(0, showCount);

  return (
    <div className="space-y-4 font-mono text-xs">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>💰 Revenue &amp; Cashflow Leaderboard</span>
          </h1>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Track daily fees, weekly expansion, and recovery rebounds from 100% verified DeFiLlama feeds
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={'px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ' + (
                days === d
                  ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              )}
            >
              {d}D Chart
            </button>
          ))}
        </div>
      </div>

      {/* 🏆 REVENUE-GENERATING TOKENS INFOGRAPHIC LEADERBOARD 🏆 */}
      <RevenueHoldersLeaderboard coins={coins} onOpenModal={onOpenModal} />

      {/* 🚀 5 MOMENTUM & VALUE ACCRUAL BUTTONS / TABS 🚀 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 p-2 rounded-2xl bg-[#0e1422] border border-slate-800 shadow-xl">
        {/* TAB 1: ALL */}
        <button
          onClick={() => { setMomentumTab('all'); setShowCount(50); }}
          className={'p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ' + (
            momentumTab === 'all'
              ? 'bg-slate-800 border-slate-600 shadow-md ring-1 ring-emerald-500/50'
              : 'bg-[#070b14] border-slate-800/80 hover:border-slate-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300">🌐 All Cashflow Tokens</span>
            <span className="px-2 py-0.2 rounded-full bg-slate-700 text-white font-extrabold text-[10px]">
              {counts.all}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Full universe ranked by fees</span>
        </button>

        {/* TAB 2: WEEKLY GROWTH (Ghadi o Kayzid Pendant Had Simana) */}
        <button
          onClick={() => { setMomentumTab('weekly_growth'); setShowCount(50); }}
          className={'p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ' + (
            momentumTab === 'weekly_growth'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-lg ring-1 ring-emerald-400'
              : 'bg-[#070b14] border-emerald-500/30 hover:bg-emerald-500/10'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400">📈</span>
              <span className="text-[11px] font-extrabold text-white">7D Weekly Growth</span>
            </div>
            <span className="px-2 py-0.2 rounded-full bg-emerald-500 text-black font-black text-[10px]">
              {counts.weekly}
            </span>
          </div>
          <span className="text-[10px] text-emerald-300/80 mt-1 font-semibold">
            Revenue ghadi o kayzid had simana
          </span>
        </button>

        {/* TAB 3: DAILY SURGE (Lyoum > Lbareh) */}
        <button
          onClick={() => { setMomentumTab('daily_surge'); setShowCount(50); }}
          className={'p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ' + (
            momentumTab === 'daily_surge'
              ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-lg ring-1 ring-amber-400'
              : 'bg-[#070b14] border-amber-500/30 hover:bg-amber-500/10'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400">⚡</span>
              <span className="text-[11px] font-extrabold text-white">24h Surge (Lyoum &gt; Lbareh)</span>
            </div>
            <span className="px-2 py-0.2 rounded-full bg-amber-500 text-black font-black text-[10px]">
              {counts.daily}
            </span>
          </div>
          <span className="text-[10px] text-amber-300/80 mt-1 font-semibold">
            Lyoum daro revenue ktar mn lbareh
          </span>
        </button>

        {/* TAB 4: RECOVERY (Revenue kan tayah o daba kay3awad itla3) */}
        <button
          onClick={() => { setMomentumTab('recovery'); setShowCount(50); }}
          className={'p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ' + (
            momentumTab === 'recovery'
              ? 'bg-purple-500/25 border-purple-400 text-purple-200 shadow-lg ring-1 ring-purple-400'
              : 'bg-[#070b14] border-purple-500/30 hover:bg-purple-500/10'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400">🔄</span>
              <span className="text-[11px] font-black text-white">RECOVERY MODE</span>
            </div>
            <span className="px-2 py-0.2 rounded-full bg-purple-500 text-white font-black text-[10px]">
              {counts.recovery}
            </span>
          </div>
          <span className="text-[10px] text-purple-300/80 mt-1 font-semibold">
            Revenue kan tayah o daba kay3awad itla3
          </span>
        </button>

        {/* TAB 5: TOP BURN / BUYBACK (Tokens li kayshriw o kayharqo bi revenue) */}
        <button
          onClick={() => { setMomentumTab('top_burn'); setSortBy('burnDesc'); setShowCount(50); }}
          className={'p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ' + (
            momentumTab === 'top_burn'
              ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-lg ring-1 ring-rose-400'
              : 'bg-[#070b14] border-rose-500/30 hover:bg-rose-500/10'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-rose-400">🔥</span>
              <span className="text-[11px] font-black text-white">TOP BURN / BUYBACK</span>
            </div>
            <span className="px-2 py-0.2 rounded-full bg-rose-500 text-white font-black text-[10px]">
              {counts.burn}
            </span>
          </div>
          <span className="text-[10px] text-rose-300/80 mt-1 font-semibold">
            Tokens li kayshriw o kayharqo bi revenue
          </span>
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0e1422] border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Active View 24h Fees</span>
          <span className="text-emerald-400 font-extrabold text-lg">{fmtUsd(totalFees)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{ranked.length} tokens in this category</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0e1422] border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Active View 24h Revenue</span>
          <span className="text-amber-400 font-extrabold text-lg">{fmtUsd(totalRev)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Retained protocol cut</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0e1422] border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Current Filter Mode</span>
          <span className="text-white font-extrabold text-sm block">
            {momentumTab === 'weekly_growth' && '📈 7D Weekly Expansion'}
            {momentumTab === 'daily_surge' && '⚡ 24h Momentum Surge'}
            {momentumTab === 'recovery' && '🔄 Bottom Rebound / Recovery'}
            {momentumTab === 'top_burn' && '🔥 Top Buyback & Burn'}
            {momentumTab === 'all' && '🌐 All Revenue Protocols'}
          </span>
          <span className="text-[10px] text-cyan-400 block mt-0.5">{ranked.length} coins matching</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0e1422] border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Top Performer in View</span>
          <span className="text-amber-300 font-extrabold text-lg">
            {fmtUsd(momentumTab === 'top_burn' ? (ranked[0]?.holdersRevenue30d || ranked[0]?.fees24h || 0) : (ranked[0]?.fees24h || 0))}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{ranked[0]?.name || 'N/A'} ({ranked[0]?.symbol || ''})</span>
        </div>
      </div>

      {/* Filters & Sorting Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0e1422] border border-slate-800">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search token (e.g. Monad, Uniswap, Tether, Solana)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 placeholder-slate-600"
          />
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[10px] font-bold">Sort:</span>
          {[
            { id: 'burnDesc', label: '🔥 Top Burn (30D)' },
            { id: 'feesDesc', label: 'Top Fees' },
            { id: 'daySurge', label: '⚡ 24h Surge %' },
            { id: 'weekGrowth', label: '📈 7D Growth %' },
            { id: 'revToMcap', label: '💎 Fees / MC' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              className={'px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ' + (
                sortBy === s.id
                  ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Min fees threshold */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 text-[10px] font-bold">Min:</span>
          {[[0, 'All'], [1000, '$1K+'], [10000, '$10K+'], [100000, '$100K+']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setMinFees(v)}
              className={'px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ' + (
                minFees === v
                  ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0e1422] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-[#070b14] text-[10px] text-slate-400 uppercase font-bold">
                <th className="py-3 pl-4 pr-2 text-left w-10">#</th>
                <th className="py-3 px-2 text-left">Token</th>
                <th className="py-3 px-3 text-right">24h Fees &amp; 1D %</th>
                <th className="py-3 px-3 text-right">7D Fee Trend</th>
                <th className="py-3 px-3 text-right">24h Revenue</th>
                <th className="py-3 px-3 text-right">Holders / Burn (30D)</th>
                <th className="py-3 px-3 text-right">Annual Est.</th>
                <th className="py-3 px-3 text-right">Fees / MC</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-right">Actions</th>
                <th className="py-3 pr-4 pl-1 w-8 text-center">Chart</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((coin, i) => (
                <RevenueRow
                  key={coin.id + '_' + coin.symbol + '_' + i}
                  coin={coin}
                  rank={i + 1}
                  days={days}
                  onOpenModal={onOpenModal}
                />
              ))}
            </tbody>
          </table>
        </div>

        {displayed.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            <p className="text-3xl mb-2">📭</p>
            <p className="font-bold">No tokens match this filter criteria</p>
            <p className="text-[11px] text-slate-600 mt-1">Try switching to &quot;All Cashflow Tokens&quot; or clearing the search query.</p>
          </div>
        )}

        {showCount < ranked.length && (
          <div className="p-4 text-center border-t border-slate-800 bg-[#070b14]/50">
            <button
              onClick={() => setShowCount(n => n + 50)}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition cursor-pointer shadow-md"
            >
              Load 50 More ({displayed.length} of {ranked.length} shown)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
