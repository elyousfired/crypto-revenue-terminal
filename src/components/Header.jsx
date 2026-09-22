import React from 'react';
import { TrendingUp, RefreshCw, DollarSign, Activity, Flame, ShieldCheck } from 'lucide-react';
import { fmtUsd } from '../lib/format';

function formatCountdown(sec) {
  if (typeof sec !== 'number' || isNaN(sec)) return '15:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function Header({
  totalCoins,
  totalFees,
  totalRevenue,
  timeUntilNextSync = 900,
  isSyncing = false,
  onManualSync = () => {},
  onOpenCompare = () => {}
}) {
  const annualRunRate = totalFees * 365;

  return (
    <header className="border-b border-slate-800 bg-[#070b14]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 font-mono">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#070b14] rounded-[10px] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Crypto <span className="text-emerald-400">Revenue Terminal</span>
              </h1>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase animate-pulse">
                CASHFLOW LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              100% Verified DeFiLlama Fees &amp; CoinGecko Price Momentum
            </p>
          </div>
        </div>

        {/* Global Key Stats Bar */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs bg-[#0e1422] border border-slate-800 px-4 py-2 rounded-xl flex-wrap">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Tracked Protocols</span>
            <span className="font-extrabold text-white">{totalCoins}</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">24h Verified Fees</span>
            <span className="font-extrabold text-emerald-400">{fmtUsd(totalFees)}</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">24h Protocol Revenue</span>
            <span className="font-extrabold text-amber-400">{fmtUsd(totalRevenue)}</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Annual Run Rate</span>
            <span className="font-extrabold text-cyan-400">{fmtUsd(annualRunRate)}</span>
          </div>

          <div className="w-px h-6 bg-slate-800" />

          {/* ⚔️ Head-to-Head Compare Arena Button */}
          <button
            onClick={() => onOpenCompare()}
            className="p-[1px] rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500 hover:scale-105 active:scale-95 transition cursor-pointer group shadow-lg shadow-emerald-500/10"
            title="Open 2-Coin Comparison Arena (Head-to-Head)"
          >
            <div className="bg-[#0b101c] px-3 py-1.5 rounded-[11px] flex items-center gap-2 group-hover:bg-[#11192b] transition">
              <span className="text-sm">⚔️</span>
              <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 tracking-tight">
                Compare Arena
              </span>
              <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                VS
              </span>
            </div>
          </button>

          <div className="w-px h-6 bg-slate-800" />

          {/* 15-Min Live Sync Engine */}
          <div className="flex items-center gap-2 pl-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 text-[11px] font-mono">
                Sync: <strong className="text-white font-bold">{formatCountdown(timeUntilNextSync)}</strong>
              </span>
            </div>
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className={`px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isSyncing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Force instant live update from DeFiLlama"
            >
              <RefreshCw className={`w-3 h-3 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
