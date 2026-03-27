"use client";
import { useState, useEffect } from "react";
import { assetColor } from "../../lib/api";

const COINS = ["BTC","ETH","SOL","HYPE","ARB","AVAX","DOGE","WIF","PEPE","SUI","LINK","INJ","OP","APT","NEAR","XRP","ENA","TAO"];

function fmtP(n) {
  if (!n) return "—";
  if (n >= 10000) return n.toLocaleString("en-US",{maximumFractionDigits:0});
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(4);
  return n.toFixed(5);
}

export default function TickerTape() {
  const [prices, setPrices] = useState({});
  const [changes, setChanges] = useState({});

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch("/api/markets/overview");
        const data = await res.json();
        if (data.success) {
          const p = {}, c = {};
          data.data.forEach(m => { p[m.asset] = m.mid; c[m.asset] = m.change24h; });
          setPrices(p); setChanges(c);
        }
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 10000);
    return () => clearInterval(t);
  }, []);

  const items = COINS.filter(c => prices[c]);
  if (!items.length) return <div className="fixed top-14 left-0 right-0 z-40 h-[34px] bg-[#111720] border-b border-[#1e2a38]" />;

  const doubled = [...items, ...items];

  return (
    <div className="fixed top-14 left-0 right-0 z-40 h-[34px] bg-[#111720] border-b border-[#1e2a38] overflow-hidden flex items-center">
      <div className="ticker-inner whitespace-nowrap">
        {doubled.map((coin, i) => {
          const ch  = changes[coin] || 0;
          const pos = ch >= 0;
          return (
            <span key={`${coin}-${i}`} className="inline-flex items-center gap-1.5 mr-7 text-[11px] font-mono">
              <span className="text-[#5a7a9a] font-medium">{coin}</span>
              <span className="text-[#e8f0f8] font-medium">{fmtP(prices[coin])}</span>
              <span className={pos ? "text-[#0cd98a]" : "text-[#f0444b]"} style={{fontSize:10}}>
                {pos?"+":""}{ch.toFixed(2)}%
              </span>
              <span className="text-[#1e2a38] ml-1">·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
