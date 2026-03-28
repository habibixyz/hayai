"use client";
import { useState, useEffect } from "react";
import { assetColor } from "../../lib/api";

const HL = "https://api.hyperliquid.xyz/info";
const COINS = ["BTC","ETH","SOL","HYPE","ARB","AVAX","DOGE","WIF","PEPE","SUI","LINK","INJ","OP","APT","NEAR","XRP","ENA","TAO"];

function fmtP(n) {
  if (!n) return "—";
  if (n >= 10000) return n.toLocaleString("en-US",{maximumFractionDigits:0});
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

export default function TickerTape() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [mc, mids] = await Promise.all([
          fetch(HL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"metaAndAssetCtxs"})}).then(r=>r.json()),
          fetch(HL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"allMids"})}).then(r=>r.json()),
        ]);
        const universe = mc[0]?.universe || [], contexts = mc[1] || [];
        const data = universe.map((asset,i) => {
          const ctx = contexts[i]||{};
          const mid = parseFloat(mids[asset.name]||0);
          const prev = parseFloat(ctx.prevDayPx||mid);
          const change = prev>0 ? Math.round(((mid-prev)/prev)*10000)/100 : 0;
          return { asset: asset.name, mid, change };
        }).filter(m => m.mid > 0 && COINS.includes(m.asset));
        setItems(data);
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 12000);
    return () => clearInterval(t);
  }, []);

  if (!items.length) return <div className="fixed top-14 left-0 right-0 z-40 h-[34px] bg-[#111720] border-b border-[#1e2a38]"/>;

  const doubled = [...items, ...items];
  return (
    <div className="fixed top-14 left-0 right-0 z-40 h-[34px] bg-[#111720] border-b border-[#1e2a38] overflow-hidden flex items-center">
      <div className="ticker-inner whitespace-nowrap">
        {doubled.map((item, i) => {
          const pos = item.change >= 0;
          return (
            <span key={`${item.asset}-${i}`} className="inline-flex items-center gap-1.5 mr-7 text-[11px] font-mono">
              <span className="text-[#5a7a9a] font-medium">{item.asset}</span>
              <span className="text-[#e8f0f8] font-medium">{fmtP(item.mid)}</span>
              <span className={pos?"text-[#0cd98a]":"text-[#f0444b]"} style={{fontSize:10}}>
                {pos?"+":""}{item.change.toFixed(2)}%
              </span>
              <span className="text-[#1e2a38] ml-1">·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
