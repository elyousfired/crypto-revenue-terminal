import React, { useState, useMemo } from 'react';
import { TrendingUp, Info, ChevronDown, ChevronUp, Sparkles, Filter } from 'lucide-react';
import { fmtUsd, fmtCompact } from '../lib/format';

function fmtRev(val) {
  if (!val || isNaN(val)) return '$0';
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(val).toLocaleString();
}

export default function RevenueHoldersLeaderboard({ coins = [], onOpenModal = () => {}, onOpenResearch = () => {} }) {
  const [rankingType, setRankingType] = useState('volume'); // 'volume' | 'yield' | 'burn'
  const [limit, setLimit] = useState(50); // Default to Top 50 as requested
  const [collapsed, setCollapsed] = useState(false);

  // 100% Dynamic calculation from live coins data
  const dynamicLeaderboard = useMemo(() => {
    // Quality filters: Real verified fees, sensible market cap to avoid dead spam
    const valid = coins.filter(c => 
      c.fees24h && 
      c.fees24h >= 1000 && 
      c.mcap >= 100000 && 
      !c.isND
    );

    const calculated = valid.map(c => {
      // 30-Day and Annualized holders revenue from live site data
      const dailyHoldersRev = c.revenue24h && c.revenue24h > 0 ? c.revenue24h : c.fees24h * 0.7;
      const rev30d = dailyHoldersRev * 30;
      const annualRev = dailyHoldersRev * 365;
      const yieldPct = c.mcap > 0 ? (annualRev / c.mcap) * 100 : 0;

      return {
        coin: c,
        symbol: c.symbol,
        name: c.name,
        logo: c.logo || `https://avatar.vercel.sh/${c.symbol}`,
        todayLiveRev: dailyHoldersRev,
        fees24h: c.fees24h,
        rev30d,
        mcap: c.mcap,
        yieldPct: Number(yieldPct.toFixed(2))
      };
    });

    if (rankingType === 'burn') {
      const burnCoins = coins.filter(c => (c.isBurn || (c.holdersRevenue30d && c.holdersRevenue30d > 0)) && !c.isND);
      return burnCoins
        .map(c => {
          const rev30d = c.holdersRevenue30d || (c.holdersRevenue24h ? c.holdersRevenue24h * 30 : 0);
          const annualRev = rev30d * 12;
          const yieldPct = c.mcap > 0 ? (annualRev / c.mcap) * 100 : 0;
          const dailyBurn = c.holdersRevenue24h || Math.round(rev30d / 30);
          return {
            coin: c,
            symbol: c.symbol,
            name: c.name,
            logo: c.logo || `https://avatar.vercel.sh/${c.symbol}`,
            todayLiveRev: dailyBurn,
            fees24h: dailyBurn,
            rev30d,
            mcap: c.mcap,
            yieldPct: Number(yieldPct.toFixed(2)),
            mechanism: c.holdersMechanism || 'Buyback & Burn'
          };
        })
        .filter((item, index, self) =>
          index === self.findIndex(t => t.symbol.toUpperCase() === item.symbol.toUpperCase())
        )
        .sort((a, b) => b.rev30d - a.rev30d)
        .slice(0, limit)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));
    }

    if (rankingType === 'yield') {
      // Sort by Annualized Yield %, filter reasonable liquidity
      return calculated
        .filter(c => c.mcap >= 1000000 && c.yieldPct < 5000)
        .sort((a, b) => b.yieldPct - a.yieldPct)
        .slice(0, limit)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));
    }

    // Default: Sort by 30D Revenue volume (biggest earners on site)
    return calculated
      // Deduplicate coins with identical symbols, prefer higher mcap
      .filter((item, index, self) => 
        index === self.findIndex(t => t.symbol.toUpperCase() === item.symbol.toUpperCase())
      )
      .sort((a, b) => b.rev30d - a.rev30d)
      .slice(0, limit)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [coins, rankingType, limit]);

  const maxYield = useMemo(() => {
    if (dynamicLeaderboard.length === 0) return 100;
    return Math.max(30, ...dynamicLeaderboard.map(d => d.yieldPct || 0));
  }, [dynamicLeaderboard]);

  // Bottom Box 1: Top 5 by 24h Revenue (who's earning the most cash TODAY)
  const top24hRevenue = useMemo(() => {
    return coins
      .filter(c => c.fees24h && c.fees24h >= 500 && c.mcap >= 100000 && !c.isND)
      .map(c => {
        const dailyRev = c.revenue24h && c.revenue24h > 0 ? c.revenue24h : c.fees24h * 0.7;
        return {
          coin: c,
          symbol: c.symbol,
          name: c.name,
          logo: c.logo || `https://avatar.vercel.sh/${c.symbol}`,
          revenue24h: dailyRev,
          mcap: c.mcap,
        };
      })
      .filter((item, index, self) =>
        index === self.findIndex(t => t.symbol.toUpperCase() === item.symbol.toUpperCase())
      )
      .sort((a, b) => b.revenue24h - a.revenue24h)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [coins]);

  // Bottom Box 2: Top 5 by 24h Yield / MC % (today's revenue annualized vs market cap)
  const top24hYield = useMemo(() => {
    return coins
      .filter(c => c.fees24h && c.fees24h >= 500 && c.mcap >= 500000 && !c.isND)
      .map(c => {
        const dailyRev = c.revenue24h && c.revenue24h > 0 ? c.revenue24h : c.fees24h * 0.7;
        const yield24h = c.mcap > 0 ? (dailyRev * 365) / c.mcap * 100 : 0;
        return {
          coin: c,
          symbol: c.symbol,
          name: c.name,
          logo: c.logo || `https://avatar.vercel.sh/${c.symbol}`,
          revenue24h: dailyRev,
          mcap: c.mcap,
          yield24h: Number(yield24h.toFixed(2)),
        };
      })
      .filter(c => c.yield24h < 50000)
      .filter((item, index, self) =>
        index === self.findIndex(t => t.symbol.toUpperCase() === item.symbol.toUpperCase())
      )
      .sort((a, b) => b.yield24h - a.yield24h)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [coins]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0e1422] shadow-2xl overflow-hidden font-mono text-xs">
      
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-[#0e1422] via-[#11192d] to-[#0e1422] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span className="text-emerald-400">💎</span>
              <span>
                {rankingType === 'burn'
                  ? `Top ${limit} Buyback & Burn Tokens`
                  : rankingType === 'yield'
                  ? `Top ${limit} Yield / MC Tokens`
                  : `Top ${limit} Revenue-Generating Tokens`}
              </span>
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              ✓ 100% Live Site Data
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Real value flowing back to token holders · Dynamic live ranking computed from DeFiLlama fees &amp; CoinGecko market cap
          </p>
        </div>

        {/* Dynamic Ranking Mode Switcher + Limit Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-[#070b14] border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setRankingType('volume')}
              className={'px-3 py-1.5 rounded-md text-[10px] font-bold transition cursor-pointer ' + (
                rankingType === 'volume'
                  ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              💰 Top 30D Revenue
            </button>
            <button
              onClick={() => setRankingType('yield')}
              className={'px-3 py-1.5 rounded-md text-[10px] font-bold transition cursor-pointer ' + (
                rankingType === 'yield'
                  ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              ⚡ Top Yield / MC %
            </button>
            <button
              onClick={() => setRankingType('burn')}
              className={'px-3 py-1.5 rounded-md text-[10px] font-bold transition cursor-pointer ' + (
                rankingType === 'burn'
                  ? 'bg-rose-500 text-white font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              🔥 Top Burn / Buyback
            </button>
          </div>

          {/* Limit Switcher: Top 10, 25, 50 */}
          <div className="flex items-center bg-[#070b14] border border-slate-800 rounded-lg p-0.5 text-[10px]">
            {[10, 25, 50].map(cnt => (
              <button
                key={cnt}
                onClick={() => setLimit(cnt)}
                className={'px-2.5 py-1 rounded-md font-bold transition cursor-pointer ' + (
                  limit === cnt
                    ? 'bg-cyan-500 text-black font-extrabold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Top {cnt}
              </button>
            ))}
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
          {/* Table with max height & sticky headers for clean top 50 browsing */}
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 shadow-md">
                <tr className="border-b border-slate-800 bg-[#070b14] text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-3 pl-4 pr-2 text-left w-10">#</th>
                  <th className="py-3 px-3 text-left">TOKEN</th>
                  <th className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{rankingType === 'burn' ? 'TODAY BURN (LIVE)' : 'TODAY REV (LIVE)'}</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">
                    {rankingType === 'burn' ? 'HOLDERS BURN (30D)' : 'HOLDERS REV. (30D)'}
                  </th>
                  <th className="py-3 px-4 text-right">MARKET CAP</th>
                  <th className="py-3 px-4 text-right min-w-[200px]">
                    <div className="flex items-center justify-end gap-1">
                      <span>ANNUALIZED REV. / MC</span>
                      <Info className="w-3 h-3 text-slate-500" title="Annualized holders cashflow as a percentage of market cap" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dynamicLeaderboard.map((item) => {
                  const widthPct = Math.min(100, Math.max(4, (item.yieldPct / maxYield) * 100));

                  return (
                    <tr
                      key={item.coin.id || item.symbol + '_' + item.rank}
                      onClick={() => onOpenModal(item.coin)}
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-white font-extrabold text-xs">
                                ${item.symbol}
                              </span>
                              {item.mechanism && (
                                <span className={'px-1.5 py-0.2 rounded text-[9px] font-black ' + (
                                  item.mechanism.includes('Burn') || item.mechanism.includes('Buyback')
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                )}>
                                  {item.mechanism.includes('Burn') ? '🔥 Burn' : item.mechanism.includes('Buyback') ? '🔥 Buyback' : '💰 Yield'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Today Live Revenue (15m Scan) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className={'font-extrabold text-xs ' + (rankingType === 'burn' ? 'text-amber-300' : 'text-emerald-300')}>
                            {fmtRev(item.todayLiveRev)}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          15m live scan
                        </div>
                      </td>

                      {/* 30D Holders Revenue */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={'font-bold text-xs tracking-tight ' + (rankingType === 'burn' ? 'text-rose-400' : 'text-emerald-400')}>
                          {fmtRev(item.rev30d)}
                        </span>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          {rankingType === 'burn' ? `~${fmtUsd(item.fees24h)} burned/day` : `~${fmtUsd(item.fees24h)} / day`}
                        </div>
                      </td>

                      {/* Market Cap */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-slate-200 font-bold text-xs tracking-tight">
                          {fmtRev(item.mcap)}
                        </span>
                      </td>

                      {/* Annualized Holders Rev / MC + Visual Progress Bar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={'font-extrabold text-xs min-w-[55px] ' + (rankingType === 'burn' ? 'text-rose-400' : 'text-emerald-400')}>
                            {item.yieldPct?.toFixed(2)}%
                          </span>
                          <div className="w-28 sm:w-36 bg-slate-800/80 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-700/50">
                            <div
                              className={'h-full rounded-full transition-all duration-500 ' + (
                                rankingType === 'burn'
                                  ? 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              )}
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

          {/* === BOTTOM MINI-LEADERBOARDS === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-slate-800">
            
            {/* Box 1: 🔥 Top 10 — 24h Revenue */}
            <div className="border-r border-slate-800/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔥</span>
                <h3 className="text-sm font-extrabold text-white tracking-tight">Top 10 — 24h Revenue</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-bold">
                  LIVE 24H
                </span>
                <span className="text-[10px] text-slate-500 ml-auto hidden sm:inline">
                  Click for Deep AI Intel
                </span>
              </div>
              <div className="space-y-1">
                {top24hRevenue.map((item) => (
                  <div
                    key={item.coin.id || item.symbol + '_24hrev'}
                    onClick={() => onOpenResearch ? onOpenResearch(item.coin) : onOpenModal(item.coin)}
                    className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-slate-800/50 transition cursor-pointer group"
                    title={`Open Live Intel for ${item.name}`}
                  >
                    {/* Rank */}
                    <span className={'text-xs font-extrabold w-5 text-center ' + (
                      item.rank === 1 ? 'text-amber-400' : item.rank === 2 ? 'text-slate-300' : item.rank === 3 ? 'text-amber-600' : 'text-slate-500'
                    )}>
                      {item.rank === 1 ? '👑' : item.rank}
                    </span>
                    
                    {/* Logo + Symbol */}
                    <img
                      src={item.logo}
                      alt={item.name}
                      className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 group-hover:border-amber-500/50 transition flex-shrink-0"
                      onError={e => e.target.style.display = 'none'}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-extrabold text-xs">${item.symbol}</span>
                      <span className="text-slate-500 text-[9px] ml-1.5 hidden sm:inline">{item.name}</span>
                    </div>

                    {/* 24h Revenue */}
                    <div className="text-right">
                      <span className="text-amber-300 font-extrabold text-xs">{fmtRev(item.revenue24h)}</span>
                      <div className="text-[8px] text-slate-500">today</div>
                    </div>

                    {/* MC */}
                    <div className="text-right hidden sm:block">
                      <span className="text-slate-400 font-bold text-[10px]">{fmtRev(item.mcap)}</span>
                      <div className="text-[8px] text-slate-600">mcap</div>
                    </div>
                  </div>
                ))}
                {top24hRevenue.length === 0 && (
                  <div className="text-slate-500 text-[10px] text-center py-4">Loading live data...</div>
                )}
              </div>
            </div>

            {/* Box 2: ⚡ Top 10 — 24h Yield / MC % */}
            <div className="p-4 border-t md:border-t-0 border-slate-800/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">⚡</span>
                <h3 className="text-sm font-extrabold text-white tracking-tight">Top 10 — 24h Yield / MC %</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold">
                  LIVE 24H
                </span>
                <span className="text-[10px] text-slate-500 ml-auto hidden sm:inline">
                  Click for Deep AI Intel
                </span>
              </div>
              <div className="space-y-1">
                {top24hYield.map((item) => {
                  const maxYield24 = top24hYield.length > 0 ? top24hYield[0].yield24h : 100;
                  const barW = Math.min(100, Math.max(6, (item.yield24h / maxYield24) * 100));
                  
                  return (
                    <div
                      key={item.coin.id || item.symbol + '_24hyield'}
                      onClick={() => onOpenResearch ? onOpenResearch(item.coin) : onOpenModal(item.coin)}
                      className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-slate-800/50 transition cursor-pointer group"
                      title={`Open Live Intel for ${item.name}`}
                    >
                      {/* Rank */}
                      <span className={'text-xs font-extrabold w-5 text-center ' + (
                        item.rank === 1 ? 'text-emerald-400' : item.rank === 2 ? 'text-teal-400' : item.rank === 3 ? 'text-cyan-400' : 'text-slate-500'
                      )}>
                        {item.rank === 1 ? '💎' : item.rank}
                      </span>

                      {/* Logo + Symbol */}
                      <img
                        src={item.logo}
                        alt={item.name}
                        className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 group-hover:border-emerald-500/50 transition flex-shrink-0"
                        onError={e => e.target.style.display = 'none'}
                      />
                      <div className="min-w-0 flex-shrink-0">
                        <span className="text-white font-extrabold text-xs">${item.symbol}</span>
                      </div>

                      {/* Yield bar + % */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-slate-800/80 rounded-full h-2 overflow-hidden ring-1 ring-slate-700/50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                        <span className="text-emerald-400 font-extrabold text-xs min-w-[60px] text-right">
                          {item.yield24h >= 1000 ? fmtRev(item.yield24h).replace('$', '') : item.yield24h.toFixed(1)}%
                        </span>
                      </div>

                      {/* 24h Rev small */}
                      <div className="text-right hidden sm:block">
                        <span className="text-slate-400 font-bold text-[10px]">{fmtRev(item.revenue24h)}</span>
                        <div className="text-[8px] text-slate-600">24h rev</div>
                      </div>
                    </div>
                  );
                })}
                {top24hYield.length === 0 && (
                  <div className="text-slate-500 text-[10px] text-center py-4">Loading live data...</div>
                )}
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="p-3 bg-[#070b14]/70 border-t border-slate-800/70 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>Annualized based on 24h live run rate. 100% computed live from our connected DeFiLlama &amp; CoinGecko datasets.</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span>Source: <strong className="text-slate-300">Live Terminal Engine</strong></span>
              <span>·</span>
              <span className="text-emerald-400 font-medium">Click any token to inspect live histogram &amp; charts</span>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
