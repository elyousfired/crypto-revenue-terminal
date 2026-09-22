import React, { useState, useMemo } from 'react';
import { TrendingUp, Info, ChevronDown, ChevronUp, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { fmtUsd, fmtCompact } from '../lib/format';

// Curated benchmark report from DeFiLlama research
const CURATED_REPORT = [
  { rank: 1, symbol: 'STONK', name: 'StonkFun', rev30d: 5670000, mcap: 273000000, yieldPct: 24.96 },
  { rank: 2, symbol: 'AERO', name: 'Aerodrome', rev30d: 14230000, mcap: 704000000, yieldPct: 24.20 },
  { rank: 3, symbol: 'PUMP', name: 'Pump.fun', rev30d: 24340000, mcap: 2100000000, yieldPct: 13.91 },
  { rank: 4, symbol: 'RAY', name: 'Raydium', rev30d: 3540000, mcap: 420000000, yieldPct: 8.88 },
  { rank: 5, symbol: 'HYPE', name: 'Hyperliquid', rev30d: 65330000, mcap: 23500000000, yieldPct: 3.28 },
  { rank: 6, symbol: 'UNI', name: 'Uniswap', rev30d: 15480000, mcap: 5400000000, yieldPct: 3.44 },
  { rank: 7, symbol: 'LIT', name: 'Lighter', rev30d: 3220000, mcap: 1220000000, yieldPct: 3.26 },
  { rank: 8, symbol: 'ASTER', name: 'Aster', rev30d: 4960000, mcap: 1900000000, yieldPct: 3.14 },
  { rank: 9, symbol: 'PENDLE', name: 'Pendle', rev30d: 465000, mcap: 424000000, yieldPct: 1.32 },
  { rank: 10, symbol: 'VVV', name: 'Venice AI', rev30d: 787000, mcap: 1510000000, yieldPct: 0.69 }
];

function fmtRev(val) {
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
  return '$' + val.toFixed(0);
}

export default function RevenueHoldersLeaderboard({ coins = [], onOpenModal = () => {} }) {
  const [mode, setMode] = useState('curated'); // 'curated' | 'live'
  const [collapsed, setCollapsed] = useState(false);

  // Map curated tokens with actual coin logos and IDs
  const curatedList = useMemo(() => {
    return CURATED_REPORT.map(item => {
      const match = coins.find(c => c.symbol.toUpperCase() === item.symbol) || {};
      return {
        ...item,
        coin: match,
        logo: match.logo || `https://avatar.vercel.sh/${item.symbol}`,
        mcap: item.mcap || match.mcap,
        rev30d: item.rev30d
      };
    });
  }, [coins]);

  // Live dynamic ranking of all coins by (Annualized Rev / MC)
  const liveList = useMemo(() => {
    return coins
      .filter(c => c.fees24h && c.fees24h > 1000 && c.mcap > 500000 && !c.isND)
      .map(c => {
        const annualRev = (c.fees24h || 0) * 365 * 0.7; // 70% assumed holders accrual
        const rev30d = (c.fees24h || 0) * 30 * 0.7;
        const yieldPct = c.mcap > 0 ? (annualRev / c.mcap) * 100 : 0;
        return {
          symbol: c.symbol,
          name: c.name,
          coin: c,
          logo: c.logo || `https://avatar.vercel.sh/${c.symbol}`,
          mcap: c.mcap,
          rev30d,
          yieldPct: Number(yieldPct.toFixed(2))
        };
      })
      .sort((a, b) => b.yieldPct - a.yieldPct)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [coins]);

  const displayed = mode === 'curated' ? curatedList : liveList;
  const maxYield = Math.max(25, ...displayed.map(d => d.yieldPct || 0));

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0e1422] shadow-2xl overflow-hidden font-mono text-xs">
      
      {/* Header matching the Infographic */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-[#0e1422] via-[#11192d] to-[#0e1422] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span className="text-emerald-400">💎</span>
              <span>Revenue-Generating Tokens</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              ✓ Buybacks, Burns &amp; Distributions
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Real value flowing back to token holders · Yield percentage relative to circulating market cap
          </p>
        </div>

        {/* Mode switch & collapse toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#070b14] border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setMode('curated')}
              className={'px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ' + (
                mode === 'curated'
                  ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              🏆 Top 10 Report
            </button>
            <button
              onClick={() => setMode('live')}
              className={'px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ' + (
                mode === 'live'
                  ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              ⚡ Live Auto-Ranked
            </button>
          </div>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 cursor-pointer"
            title={collapsed ? 'Expand leaderboard' : 'Collapse leaderboard'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80 bg-[#070b14] text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-3 pl-4 pr-2 text-left w-10">#</th>
                  <th className="py-3 px-3 text-left">TOKEN</th>
                  <th className="py-3 px-4 text-right">HOLDERS REV. (30D)</th>
                  <th className="py-3 px-4 text-right">MARKET CAP (30D)</th>
                  <th className="py-3 px-4 text-right min-w-[200px]">
                    <div className="flex items-center justify-end gap-1">
                      <span>ANNUALIZED HOLDERS REV. / MC</span>
                      <Info className="w-3 h-3 text-slate-500" title="Annualized holders cashflow as a percentage of market cap" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((item) => {
                  const widthPct = Math.min(100, Math.max(3, (item.yieldPct / maxYield) * 100));

                  return (
                    <tr
                      key={item.symbol + '_' + item.rank}
                      onClick={() => item.coin && item.coin.symbol && onOpenModal(item.coin)}
                      className="border-b border-slate-800/50 hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Rank */}
                      <td className="py-3.5 pl-4 pr-2 text-slate-500 font-bold text-xs">
                        {item.rank}
                      </td>

                      {/* Token */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.logo}
                            alt={item.name}
                            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 group-hover:border-emerald-500/50 transition flex-shrink-0"
                            onError={e => e.target.style.display = 'none'}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-extrabold text-xs">
                                ${item.symbol}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 30D Holders Revenue */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-white font-bold text-xs tracking-tight">
                          {fmtRev(item.rev30d)}
                        </span>
                      </td>

                      {/* Market Cap */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-slate-300 font-bold text-xs tracking-tight">
                          {fmtRev(item.mcap)}
                        </span>
                      </td>

                      {/* Annualized Holders Rev / MC + Visual Progress Bar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-emerald-400 font-extrabold text-xs min-w-[50px]">
                            {item.yieldPct?.toFixed(2)}%
                          </span>
                          <div className="w-28 sm:w-36 bg-slate-800/80 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-700/50">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 group-hover:from-emerald-400 group-hover:to-teal-300"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footnote matching the image */}
          <div className="p-3 bg-[#070b14]/70 border-t border-slate-800/70 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>Annualized based on the last 30 days. Includes buybacks, burns and revenue distributions. Not guaranteed investor yield.</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span>Data: <strong className="text-slate-300">DeFiLlama &amp; CoinGecko</strong></span>
              <span>·</span>
              <span className="text-emerald-400 font-medium">Selected tokens with clear value accrual to holders</span>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
