import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import RevenuePage from './components/RevenuePage';
import CoinDetailModal from './components/CoinDetailModal';
import CompareModal from './components/CompareModal';
import { ALL_COINGECKO_TOKENS } from './data/coingeckoUniverse';
import { fetchLiveFees, applyLiveUpdates, SYNC_INTERVAL_SECONDS } from './services/liveSyncService';
import { clearAllRevenueCache } from './services/revenuePriceHistoryService';

export default function App() {
  const [coins, setCoins] = useState(ALL_COINGECKO_TOKENS);
  const [activeModalCoin, setActiveModalCoin] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [comparePair, setComparePair] = useState({ coinA: null, coinB: null });
  const [timeUntilNextSync, setTimeUntilNextSync] = useState(SYNC_INTERVAL_SECONDS);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleOpenCompare = (coinA = null, coinB = null) => {
    setComparePair({ coinA, coinB });
    setIsCompareOpen(true);
  };

  // Live Sync Engine (15-Minute Auto Refresh)
  const performLiveSync = async () => {
    setIsSyncing(true);
    try {
      const feesMap = await fetchLiveFees();
      if (feesMap && feesMap.size > 0) {
        clearAllRevenueCache();
        setCoins(prevCoins => {
          const { updatedCoins } = applyLiveUpdates(prevCoins, feesMap);
          return updatedCoins;
        });
      }
    } catch (err) {
      console.warn('Live sync failed:', err);
    } finally {
      setIsSyncing(false);
      setTimeUntilNextSync(SYNC_INTERVAL_SECONDS);
    }
  };

  // 1-second interval to tick down countdown and trigger sync at 0
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilNextSync(prev => {
        if (prev <= 1) {
          performLiveSync();
          return SYNC_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Aggregate stats across cashflow coins
  const stats = useMemo(() => {
    const cashflowCoins = coins.filter(c => c.fees24h && c.fees24h > 0 && !c.isND);
    const totalFees = cashflowCoins.reduce((sum, c) => sum + (c.fees24h || 0), 0);
    const totalRevenue = cashflowCoins.reduce((sum, c) => sum + (c.revenue24h || 0), 0);
    return {
      totalCoins: cashflowCoins.length,
      totalFees,
      totalRevenue
    };
  }, [coins]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Dedicated Revenue Terminal Header */}
      <Header
        totalCoins={stats.totalCoins}
        totalFees={stats.totalFees}
        totalRevenue={stats.totalRevenue}
        timeUntilNextSync={timeUntilNextSync}
        isSyncing={isSyncing}
        onManualSync={performLiveSync}
        onOpenCompare={handleOpenCompare}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        <RevenuePage
          coins={coins}
          onOpenModal={setActiveModalCoin}
          onOpenCompare={handleOpenCompare}
        />
      </main>

      {/* Full Coin Detail Modal */}
      {activeModalCoin && (
        <CoinDetailModal
          coin={activeModalCoin}
          onClose={() => setActiveModalCoin(null)}
          onOpenCompare={handleOpenCompare}
        />
      )}

      {/* ⚔️ Head-to-Head 2-Coin Comparison Modal */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        initialCoinA={comparePair.coinA}
        initialCoinB={comparePair.coinB}
        allCoins={coins}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-6 px-4 sm:px-6 text-center text-xs text-slate-500 font-mono">
        <p>Crypto Revenue Terminal · 100% Verified DeFiLlama Cashflow &amp; Price Momentum Radar</p>
        <p className="mt-1 text-[11px] text-slate-600">
          Real-time analytics for fee-generating blockchains and protocols · Zero estimation on verified feeds
        </p>
      </footer>
    </div>
  );
}
