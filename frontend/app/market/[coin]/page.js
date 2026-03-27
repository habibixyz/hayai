"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { assetColor } from "../../../lib/api";

function fmtP(n) {
  if (!n) return "—";
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(4);
  return n.toFixed(6);
}
function fmt(n) {
  if (!n && n !== 0) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function timeStr(ts) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Major coins that exist on TradingView Hyperliquid feed
const TV_SUPPORTED = new Set([
  "BTC","ETH","SOL","AVAX","DOGE","LINK","ARB","OP","APT","SUI",
  "PEPE","WIF","INJ","TIA","ATOM","NEAR","LTC","XRP","HYPE","ONDO","ENA","TAO"
]);

export default function MarketPage() {
  const { coin }   = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState("trades");

  const fetchData = useCallback(async () => {
    if (!coin) return;
    try {
      const res  = await fetch(`/api/markets/asset/${coin.toUpperCase()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [coin]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 5000);
    return () => clearInterval(t);
  }, [fetchData]);

  const color    = assetColor(coin?.toUpperCase());
  const hlUrl    = `https://app.hyperliquid.xyz/trade/${coin?.toUpperCase()}`;
  const coinUp   = coin?.toUpperCase();
  const tvSymbol = TV_SUPPORTED.has(coinUp) ? `HYPERLIQUID:${coinUp}USDC.P` : null;

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
      <div className="h-8 w-48 shimmer rounded"/>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({length:5}).map((_,i) => <div key={i} className="card p-4 space-y-2"><div className="h-3 w-16 shimmer rounded"/><div className="h-6 w-20 shimmer rounded"/></div>)}
      </div>
    </div>
  );

  if (!data) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <p className="text-[#f0444b] font-mono">Market not found</p>
      <Link href="/" className="text-[#00e8c6] font-mono text-xs mt-4 inline-block hover:underline">← All Markets</Link>
    </div>
  );

  const pos  = data.change24h >= 0;
  const fpos = data.funding >= 0;
  const maxBidSz = Math.max(...(data.orderBook?.bids||[]).map(b=>b.size), 1);
  const maxAskSz = Math.max(...(data.orderBook?.asks||[]).map(a=>a.size), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">

      {/* Breadcrumb */}
      <Link href="/" className="text-[10px] font-mono text-[#2a4060] hover:text-[#5a7a9a]">← All Markets</Link>

      {/* Header */}
      <div className="flex items-center gap-4 mt-4 mb-5 flex-wrap">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-mono font-bold"
          style={{background:`${color}18`, border:`2px solid ${color}35`, color}}>
          {coinUp?.slice(0,3)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#e8f0f8]">{coinUp}-PERP</h1>
          <p className="text-[10px] font-mono text-[#2a4060]">Hyperliquid Perpetual</p>
        </div>
        <div className="flex items-center gap-3 ml-2">
          <span className="text-2xl font-mono font-bold text-[#e8f0f8]">${fmtP(data.mid)}</span>
          <span className={`text-base font-mono font-bold ${pos?"text-[#0cd98a]":"text-[#f0444b]"}`}>
            {pos?"+":""}{data.change24h}%
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a href={hlUrl} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-semibold rounded-lg text-[#e8f0f8] transition-all hover:opacity-90"
            style={{background:"linear-gradient(135deg,#00e8c6,#3b8ef0)"}}>
            Trade {coinUp} on HL ↗
          </a>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          ["24h High",      `$${fmtP(data.high24h)}`,                                false, false],
          ["24h Low",       `$${fmtP(data.low24h)}`,                                 false, false],
          ["24h Volume",    fmt(data.volume24h),                                      false, false],
          ["Open Interest", fmt(data.openInterest),                                   false, false],
          ["Funding / 8h",  `${fpos?"+":""}${(data.funding||0).toFixed(4)}%`,        fpos,  !fpos],
        ].map(([label,value,green,red]) => (
          <div key={label} className="card px-4 py-3.5">
            <p className="text-[10px] font-mono text-[#2a4060] uppercase tracking-widest mb-1.5">{label}</p>
            <p className={`text-base font-bold ${green?"text-[#0cd98a]":red?"text-[#f0444b]":"text-[#e8f0f8]"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Funding explainer */}
      <div className={`mb-5 px-4 py-2.5 rounded-lg border text-[11px] font-mono ${
        Math.abs(data.funding||0) < 0.001 ? "border-[#1e2a38] text-[#2a4060]" :
        fpos ? "border-[#0cd98a]/25 bg-[#0cd98a]/5 text-[#0cd98a]" :
               "border-[#f0444b]/25 bg-[#f0444b]/5 text-[#f0444b]"
      }`}>
        {Math.abs(data.funding||0) < 0.001
          ? "⚖ Funding is neutral — market is balanced"
          : fpos
          ? `📈 Positive funding: longs pay shorts ${(data.funding||0).toFixed(4)}% every 8h — market is long-heavy`
          : `📉 Negative funding: shorts pay longs ${Math.abs(data.funding||0).toFixed(4)}% every 8h — market is short-heavy`
        }
      </div>

      {/* Chart section */}
      <div className="card mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2a38]" style={{background:"#0d1420"}}>
          <p className="text-[10px] font-mono text-[#2a4060] uppercase tracking-wider">Price Chart</p>
          <div className="flex items-center gap-3">
            {tvSymbol && (
              <a href={`https://www.tradingview.com/chart/?symbol=${tvSymbol}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-mono text-[#5a7a9a] hover:text-[#00e8c6]">
                Open in TradingView ↗
              </a>
            )}
            <a href={hlUrl} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono text-[#00e8c6] hover:underline">
              View on Hyperliquid ↗
            </a>
          </div>
        </div>

        {tvSymbol ? (
          /* TradingView embed — only for coins it supports */
          <div style={{height:420}}>
            <iframe
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tv_${coinUp}&symbol=${encodeURIComponent(tvSymbol)}&interval=15&theme=dark&style=1&locale=en&toolbar_bg=%230d1420&enable_publishing=0&hide_top_toolbar=0&backgroundColor=%230a0e13&gridColor=%231e2a38&hide_legend=0`}
              style={{width:"100%",height:"100%",border:"none"}}
              allowTransparency allowFullScreen
            />
          </div>
        ) : (
          /* Fallback for coins TradingView doesn't have — link to HL directly */
          <div className="flex flex-col items-center justify-center py-16 gap-4"
            style={{background:"#0a0e13"}}>
            <p className="text-[#5a7a9a] font-mono text-sm">
              Chart not available for {coinUp} on TradingView
            </p>
            <a href={hlUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#e8f0f8] transition-all hover:opacity-90"
              style={{background:"linear-gradient(135deg,#00e8c6,#3b8ef0)"}}>
              View {coinUp} Chart on Hyperliquid ↗
            </a>
            <p className="text-[#2a4060] font-mono text-[10px]">Full chart with order book on app.hyperliquid.xyz</p>
          </div>
        )}
      </div>

      {/* Order book + trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Order Book */}
        <div className="card">
          <div className="px-4 py-2.5 border-b border-[#1e2a38]" style={{background:"#0d1420"}}>
            <p className="text-[10px] font-mono text-[#2a4060] uppercase tracking-wider">Order Book</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 text-[9px] font-mono text-[#2a4060] uppercase tracking-wider mb-2 px-1">
              <span>Price (USDC)</span><span className="text-center">Size</span><span className="text-right">Orders</span>
            </div>

            {/* Asks reversed */}
            <div className="space-y-0.5 mb-1">
              {[...(data.orderBook?.asks||[])].reverse().slice(0,8).map((ask,i) => (
                <div key={i} className="relative grid grid-cols-3 text-[11px] font-mono py-0.5 px-1 rounded overflow-hidden">
                  <div className="absolute inset-y-0 right-0 rounded" style={{width:`${(ask.size/maxAskSz)*100}%`, background:"rgba(240,68,75,0.08)"}}/>
                  <span className="relative font-semibold text-[#f0444b]">${fmtP(ask.price)}</span>
                  <span className="relative text-[#5a7a9a] text-center">{ask.size.toFixed(3)}</span>
                  <span className="relative text-[#2a4060] text-right">{ask.n}</span>
                </div>
              ))}
            </div>

            {/* Mid */}
            <div className="text-center py-1.5 border-y border-[#1e2a38] my-1">
              <span className="text-[#e8f0f8] font-bold font-mono text-sm">${fmtP(data.mid)}</span>
              <span className="text-[#2a4060] ml-2 text-[9px] font-mono">mid</span>
            </div>

            {/* Bids */}
            <div className="space-y-0.5 mt-1">
              {(data.orderBook?.bids||[]).slice(0,8).map((bid,i) => (
                <div key={i} className="relative grid grid-cols-3 text-[11px] font-mono py-0.5 px-1 rounded overflow-hidden">
                  <div className="absolute inset-y-0 right-0 rounded" style={{width:`${(bid.size/maxBidSz)*100}%`, background:"rgba(12,217,138,0.08)"}}/>
                  <span className="relative font-semibold text-[#0cd98a]">${fmtP(bid.price)}</span>
                  <span className="relative text-[#5a7a9a] text-center">{bid.size.toFixed(3)}</span>
                  <span className="relative text-[#2a4060] text-right">{bid.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="card">
          <div className="px-4 py-2.5 border-b border-[#1e2a38]" style={{background:"#0d1420"}}>
            <p className="text-[10px] font-mono text-[#2a4060] uppercase tracking-wider">Recent Trades</p>
          </div>
          <div className="overflow-y-auto" style={{maxHeight:380}}>
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0" style={{background:"#0d1420"}}>
                <tr className="border-b border-[#1e2a38]">
                  {["Time","Side","Price","Size","Notional"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] text-[#2a4060] uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.recentTrades||[]).map((t,i) => (
                  <tr key={i} className="border-b border-[#1e2a38]/50 hover:bg-[#111720] transition-colors">
                    <td className="px-3 py-2 text-[#2a4060]">{timeStr(t.time)}</td>
                    <td className="px-3 py-2">
                      <span className={`font-bold ${t.side==="BUY"?"text-[#0cd98a]":"text-[#f0444b]"}`}>{t.side}</span>
                    </td>
                    <td className="px-3 py-2 text-[#e8f0f8] font-semibold">${fmtP(t.price)}</td>
                    <td className="px-3 py-2 text-[#5a7a9a]">{t.size?.toFixed(4)}</td>
                    <td className="px-3 py-2 text-[#5a7a9a]">{fmt(t.notional)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-5 card px-5 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{background:"linear-gradient(135deg, #0d1f2e, #0a1a28)"}}>
        <div>
          <p className="text-sm font-semibold text-[#e8f0f8]">Trade {coinUp} on Hyperliquid</p>
          <p className="text-[10px] font-mono text-[#5a7a9a] mt-0.5">Up to {data.maxLeverage}x leverage · lowest fees in DeFi</p>
        </div>
        <a href={hlUrl} target="_blank" rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-lg text-sm font-bold text-[#0a0e13] transition-all hover:opacity-90"
          style={{background:"#00e8c6"}}>
          Open {coinUp} on HL ↗
        </a>
      </div>

      <p className="mt-3 text-[9px] font-mono text-[#2a4060] text-center">
        {coinUp} data from Hyperliquid · refreshes every 5s
      </p>
    </div>
  );
}
