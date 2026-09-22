import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Flame, 
  Zap, 
  Activity, 
  LineChart as LineChartIcon,
  Tag,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine, 
  CartesianGrid,
  ComposedChart,
  Bar,
  Line
} from 'recharts';
import { fmtUsd, fmtCompact, fmtPct, fmtMultiple } from '../lib/format';
import { getHistory30d } from '../services/volToMcapHistoryService';
import { getRevenuePriceHistory, getRevenuePriceHistorySync } from '../services/revenuePriceHistoryService';

function CustomVolTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const ratio = data.volToMcap;
    const isHot = ratio >= 0.4;
    const isClimax = ratio >= 1.0;
    return (
      <div className="bg-[#0b101c]/95 border border-slate-700 p-3 rounded-lg shadow-2xl font-mono text-xs backdrop-blur-md">
        <div className="text-slate-400 text-[11px] font-semibold border-b border-slate-800 pb-1 mb-2 flex items-center justify-between gap-3">
          <span>{label}</span>
          <span className={`font-bold ${isClimax ? 'text-rose-400' : isHot ? 'text-orange-400' : 'text-cyan-400'}`}>
            {isClimax ? 'Climax Level' : isHot ? 'High Momentum' : 'Base / Normal'}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Vol / MC Ratio:</span>
            <span className="font-extrabold text-cyan-300 text-sm">
              {ratio.toFixed(2)}x <span className="text-xs font-normal">({(ratio * 100).toFixed(1)}%)</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span className="text-slate-400">Est. 24h Vol:</span>
            <span className="font-bold text-white">{fmtUsd(data.volume)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span className="text-slate-400">Market Cap:</span>
            <span className="font-bold text-white">{fmtUsd(data.mcap)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function CoinDetailModal({ coin, onClose, initialTab }) {
  if (!coin) return null;

  const defaultTab = initialTab || (coin.fees24h || coin.revenue24h ? 'revenue' : 'volCurve');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedExchange, setSelectedExchange] = useState('GLOBAL');
  const [customPair, setCustomPair] = useState(coin && coin.symbol ? coin.symbol.toUpperCase() + 'USDT' : 'BTCUSDT');

  useEffect(() => {
    if (coin && coin.symbol) {
      setCustomPair(coin.symbol.toUpperCase() + 'USDT');
      if (coin.rank && coin.rank <= 150) {
        setSelectedExchange('BINANCE');
      } else if (coin.rank && coin.rank <= 500) {
        setSelectedExchange('MEXC');
      } else {
        setSelectedExchange('GLOBAL');
      }
    }
  }, [coin]);

  const [revRange, setRevRange] = useState(30);
  const [revMetric, setRevMetric] = useState('revenue');
  const [revHistory, setRevHistory] = useState(() => getRevenuePriceHistorySync(coin, 30));
  const [revLoading, setRevLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'revenue') return;
    setRevLoading(true);
    getRevenuePriceHistory(coin, revRange).then((data) => {
      setRevHistory(data);
      setRevLoading(false);
    });
  }, [coin, activeTab, revRange]);

  const historyData = useMemo(() => getHistory30d(coin), [coin]);

  const { maxRatio, change7d, currentPhase } = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      return { maxRatio: coin.volToMcap, change7d: 0, currentPhase: 'Normal' };
    }
    const ratios = historyData.map(d => d.volToMcap);
    const max = Math.max.apply(null, ratios);
    const latest = ratios[ratios.length - 1];
    const prev7 = ratios[Math.max(0, ratios.length - 7)] || ratios[0];
    const chg7 = prev7 > 0 ? ((latest - prev7) / prev7) * 100 : 0;
    let phase = 'Dormant Accumulation';
    if (latest >= 1.0) phase = 'Parabolic Climax';
    else if (latest >= 0.4) phase = 'Momentum Surge';
    else if (latest >= 0.15) phase = 'Healthy Liquidity';
    return { maxRatio: max, change7d: chg7, currentPhase: phase };
  }, [historyData, coin.volToMcap]);

  const tvSymbol = selectedExchange === 'GLOBAL' ? customPair : selectedExchange + ':' + customPair;
  const tradingViewUrl = 'https://s.tradingview.com/widgetembed/?symbol=' + encodeURIComponent(tvSymbol) + '&interval=60&theme=dark&style=1&timezone=Etc%2FUTC&locale=en&toolbarbg=f1f3f6&enablepublishing=false&hideideas=true&sidebarmargin=0';
  const dexScreenerUrl = 'https://dexscreener.com/search?q=' + encodeURIComponent(coin.symbol);
  const defiLlamaUrl = coin.defillamaType === 'chain'
    ? 'https://defillama.com/chain/' + (coin.defillamaSlug || coin.chainName || coin.name)
    : coin.defillamaSlug ? 'https://defillama.com/protocol/' + coin.defillamaSlug : null;
  const cgUrl = 'https://www.coingecko.com/en/coins/' + (coin.id || coin.name.toLowerCase());

  const fmtRevFees = (v) => {
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
    return '$' + v.toFixed(0);
  };
  const fmtRevPrice = (v) => {
    if (v >= 1) return '$' + v.toFixed(4);
    if (v >= 0.01) return '$' + v.toFixed(6);
    return '$' + v.toExponential(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto font-mono text-xs">
      <div className="relative w-full max-w-4xl card border-slate-700 bg-[#0e1422] shadow-2xl p-6 my-8 max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        <div className="border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <img src={coin.logo} alt={coin.name} className="w-10 h-10 rounded-full bg-slate-800 p-1 border border-slate-700" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">{coin.name}</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">{coin.symbol}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-bold">Rank #{coin.rank}</span>
                {coin.defillamaType === 'chain' ? (
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1">
                    <span>chain</span>
                    <span>DeFiLlama Chain: {coin.defillamaSlug || coin.name}</span>
                  </span>
                ) : coin.defillamaSlug ? (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">DeFiLlama: {coin.defillamaSlug}</span>
                ) : null}
                {coin.dexLaunchDate && (
                  <span className="px-2 py-0.5 rounded bg-[#070b14] border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1 font-mono">
                    <span>DEX: {coin.dexLaunchDate} ({coin.dexAgeDays}d)</span>
                    {coin.dexAgeDays >= 7
                      ? <span className="text-emerald-400 font-bold ml-0.5">+7d</span>
                      : <span className="text-rose-400 font-bold ml-0.5">-7d</span>}
                  </span>
                )}
                {coin.cgListingDate && (
                  <span className="px-2 py-0.5 rounded bg-[#070b14] border border-amber-500/30 text-amber-300 text-xs flex items-center gap-1 font-mono">
                    <span>CG: {coin.cgListingDate} ({coin.cgAgeDays}d)</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                <span className="text-white font-bold text-sm">{fmtUsd(coin.price)}</span>
                <span className={coin.priceChange24h >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'}>{fmtPct(coin.priceChange24h)}</span>
                <span>MC: <span className="text-white font-bold">{fmtUsd(coin.mcap)}</span></span>
                <span>FDV: <span className="text-slate-400">{fmtUsd(coin.fdv)}</span></span>
              </div>
            </div>
          </div>
          {Array.isArray(coin.categories) && coin.categories.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold mb-1.5 uppercase">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Categories ({coin.categories.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {coin.categories.map((cat) => (
                  <span key={cat} className="px-2.5 py-0.5 rounded bg-[#070b14] border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold">#{cat}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Vol / MC Velocity</span>
            <span className="text-lg font-extrabold text-cyan-400">{(coin.volToMcap).toFixed(2)}x <span className="text-xs text-cyan-300 font-normal">({(coin.volToMcap * 100).toFixed(1)}%)</span></span>
            <span className="text-[10px] text-slate-500 block mt-0.5">24h Vol: {fmtUsd(coin.totalVol24h)}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Peak MC (ATH)</span>
            <span className="text-lg font-extrabold text-amber-400">{fmtUsd(coin.peakMc)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">ATH: {fmtUsd(coin.athPrice)} ({coin.dropPct ? coin.dropPct.toFixed(0) + '%' : ''})</span>
          </div>
          <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">{coin.defillamaType === 'chain' ? '24h Gas Fees' : '24h Fees'}</span>
            {coin.isND || coin.fees24h === null ? (
              <span className="text-lg font-extrabold text-slate-500">ND</span>
            ) : (
              <div>
                <span className="text-lg font-extrabold text-emerald-400">{fmtUsd(coin.fees24h)}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Rev: {fmtUsd(coin.revenue24h)}</span>
              </div>
            )}
          </div>
          <div className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">{coin.defillamaType === 'chain' ? 'Chain P/F' : 'P/F Multiple'}</span>
            <span className="text-lg font-extrabold text-white">{coin.priceToFees ? fmtMultiple(coin.priceToFees) : 'ND'}</span>
            <span className="text-[10px] text-cyan-300 font-bold block mt-0.5">TVL: {coin.tvl ? fmtUsd(coin.tvl) : 'ND'}</span>
          </div>
        </div>

        <div className="mb-5 rounded-lg overflow-hidden border border-slate-800 bg-[#070b14]">
          <div className="p-2.5 bg-[#0b101c] border-b border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('revenue')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ' + (activeTab === 'revenue' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60')}
              >
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Revenue + Price (Cashflow)</span>
              </button>
              <button
                onClick={() => setActiveTab('volCurve')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ' + (activeTab === 'volCurve' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60')}
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Vol / MC Velocity (30D)</span>
              </button>
              <button
                onClick={() => setActiveTab('tradingview')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ' + (activeTab === 'tradingview' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60')}
              >
                <LineChartIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>TradingView Chart</span>
              </button>
            </div>
            <a href={dexScreenerUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold flex items-center gap-1 transition">
              <span>🦄 DexScreener Live</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {activeTab === 'tradingview' && (
            <>
              <div className="p-2.5 bg-[#0e1422] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 text-[11px] font-bold">Exchange:</span>
                  {[
                    { id: 'GLOBAL', label: '⚡ Auto (All)' },
                    { id: 'MEXC', label: 'MEXC' },
                    { id: 'GATEIO', label: 'Gate.io' },
                    { id: 'BINANCE', label: 'Binance' },
                    { id: 'BYBIT', label: 'Bybit' },
                    { id: 'KUCOIN', label: 'KuCoin' },
                    { id: 'OKX', label: 'OKX' }
                  ].map(ex => (
                    <button key={ex.id} onClick={() => setSelectedExchange(ex.id)} className={'px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ' + (selectedExchange === ex.id ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700')}>
                      {ex.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[10px]">Pair:</span>
                    <input type="text" value={customPair} onChange={(e) => setCustomPair(e.target.value.toUpperCase())} className="w-24 px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-white rounded text-[10px] font-bold font-mono focus:outline-none focus:border-amber-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    {[coin.symbol.toUpperCase() + 'USDT', coin.symbol.toUpperCase() + 'USD'].map(p => (
                      <button key={p} onClick={() => setCustomPair(p)} className="px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-[9px] text-slate-400 hover:text-white border border-slate-700">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Alert notice for DEX microcaps */}
              <div className="px-3 py-2 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border-b border-amber-500/20 text-[11px] text-amber-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Symbol not found on CEX?</strong> Microcaps &amp; DEX tokens often trade exclusively on on-chain DEXes (Uniswap, Raydium).
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={dexScreenerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-[10px] font-bold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <span>Open {coin.symbol} on DexScreener</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setActiveTab('revenue')}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition cursor-pointer"
                  >
                    Switch to Revenue + Price →
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'volCurve' && (
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Velocity:</span>
                  <span className="text-cyan-400 font-bold text-sm">{(coin.volToMcap).toFixed(2)}x</span>
                  <span className={'font-semibold px-2 py-0.5 rounded text-[10px] ' + (change7d >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                    7D: {change7d >= 0 ? '+' : ''}{change7d.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>Peak: <strong className="text-amber-400">{maxRatio.toFixed(2)}x</strong></span>
                  <span className="text-slate-600">|</span>
                  <span>Phase: <strong className="text-white">{currentPhase}</strong></span>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volMcapGradientCg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 'auto']} tickFormatter={(v) => v.toFixed(1) + 'x'} />
                    <Tooltip content={<CustomVolTooltip />} />
                    <ReferenceLine y={0.15} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Accum 0.15x', fill: '#10b981', fontSize: 9, position: 'insideTopLeft' }} />
                    <ReferenceLine y={0.40} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Surge 0.40x', fill: '#f59e0b', fontSize: 9, position: 'insideTopLeft' }} />
                    {maxRatio >= 0.8 && (
                      <ReferenceLine y={1.00} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Climax 1.0x', fill: '#f43f5e', fontSize: 9, position: 'insideTopLeft' }} />
                    )}
                    <Area type="monotone" dataKey="volToMcap" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#volMcapGradientCg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'tradingview' && (
            <div>
              <div className="h-[340px] w-full bg-[#070b14] relative">
                <iframe key={selectedExchange + '-' + customPair} title="TradingView" src={tradingViewUrl} className="w-full h-full border-0" />
              </div>
              <div className="px-3 py-1.5 bg-[#0b101c] border-t border-slate-800 text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span>Showing: <strong className="text-amber-400">{tvSymbol}</strong>. Not found? Try <button onClick={() => setSelectedExchange('MEXC')} className="text-cyan-400 underline cursor-pointer">MEXC</button>, <button onClick={() => setSelectedExchange('GATEIO')} className="text-cyan-400 underline cursor-pointer">Gate.io</button> or <button onClick={() => setSelectedExchange('GLOBAL')} className="text-cyan-400 underline cursor-pointer">Auto (All)</button></span>
                <div className="flex items-center gap-3">
                  <a href={dexScreenerUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1">
                    DexScreener ↗
                  </a>
                  <a href={'https://www.tradingview.com/symbols/' + customPair + '/'} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-400 flex items-center gap-1">
                    TradingView.com <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-bold">Metric:</span>
                  <button
                    onClick={() => setRevMetric('revenue')}
                    className={'px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ' + (revMetric === 'revenue' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700')}
                  >
                    🔥 Revenue (Net)
                  </button>
                  <button
                    onClick={() => setRevMetric('fees')}
                    className={'px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ' + (revMetric === 'fees' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700')}
                  >
                    💸 Total Fees
                  </button>
                  {coin.defillamaSlug
                    ? <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px]">✓ Real DeFiLlama API</span>
                    : <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500 text-[10px]">~ Estimated</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {[7, 30].map(d => (
                    <button key={d} onClick={() => setRevRange(d)} className={'px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ' + (revRange === d ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700')}>
                      {d}D
                    </button>
                  ))}
                </div>
              </div>

              {revLoading ? (
                <div className="h-[280px] flex items-center justify-center text-slate-500 text-xs">
                  <span className="animate-pulse">Fetching live revenue &amp; price data...</span>
                </div>
              ) : (
                <div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={revHistory.slice(-revRange)} margin={{ top: 10, right: 55, left: 5, bottom: 0 }}>
                        <defs>
                          <linearGradient id="metricBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={revMetric === 'revenue' ? '#f59e0b' : '#10b981'} stopOpacity={0.9} />
                            <stop offset="95%" stopColor={revMetric === 'revenue' ? '#d97706' : '#059669'} stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} interval={revRange === 7 ? 0 : Math.floor(revRange / 7)} />
                        <YAxis yAxisId="metric" orientation="left" stroke={revMetric === 'revenue' ? '#f59e0b' : '#10b981'} fontSize={9} tickLine={false} tickFormatter={fmtRevFees} width={55} />
                        <YAxis yAxisId="price" orientation="right" stroke="#a78bfa" fontSize={9} tickLine={false} tickFormatter={fmtRevPrice} width={62} />
                        <Tooltip
                          contentStyle={{ background: '#0b101c', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                          formatter={(value, name) => {
                            if (name === 'revenue') return [fmtUsd(value), 'Revenue (Net)'];
                            if (name === 'fees') return [fmtUsd(value), 'Total Fees'];
                            if (name === 'price') return [fmtRevPrice(value), 'Price'];
                            return [value, name];
                          }}
                        />
                        <Bar yAxisId="metric" dataKey={revMetric} fill="url(#metricBarGrad)" radius={[2, 2, 0, 0]} maxBarSize={32} name={revMetric} />
                        <Line yAxisId="price" type="monotone" dataKey="price" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#a78bfa' }} name="price" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-5 mt-2 text-[10px] text-slate-400 justify-center">
                    <span className="flex items-center gap-1.5">
                      <span className={'inline-block w-3 h-3 rounded-sm opacity-90 ' + (revMetric === 'revenue' ? 'bg-amber-500' : 'bg-emerald-500')}></span>
                      <span>{revMetric === 'revenue' ? 'Daily Revenue (left)' : 'Daily Fees (left)'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-5 h-0.5 bg-violet-400"></span>
                      Price (right)
                    </span>
                    {coin.defillamaSlug && (
                      <a href={'https://defillama.com/protocol/' + coin.defillamaSlug} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline">
                        DeFiLlama <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <a href={cgUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1">
              View on CoinGecko <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a href={dexScreenerUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-xs font-bold flex items-center gap-1">
              View on DexScreener <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {defiLlamaUrl && (
              <a href={defiLlamaUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-xs font-bold flex items-center gap-1">
                {coin.defillamaType === 'chain' ? 'DeFiLlama Chain' : 'DeFiLlama Protocol'} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer">Close</button>
        </div>

      </div>
    </div>
  );
}
