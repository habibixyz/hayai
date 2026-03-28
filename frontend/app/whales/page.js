"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { assetColor } from "../../lib/api";

const HL = "https://api.hyperliquid.xyz/info";
const COINS = ["BTC","ETH","SOL","HYPE","ARB","AVAX","DOGE","WIF","PEPE","SUI","LINK","INJ","TIA","APT","XRP","ENA","TAO","NEAR"];

function fmt(n) {
  const a = Math.abs(n||0);
  if (a >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${(n||0).toFixed(0)}`;
}
function fmtP(n) {
  if (!n) return "—";
  if (n >= 10000) return n.toLocaleString("en-US",{maximumFractionDigits:0});
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}
function timeAgo(ts) {
  const d = Date.now()-ts;
  if (d < 60e3) return `${Math.floor(d/1e3)}s ago`;
  if (d < 3600e3) return `${Math.floor(d/60e3)}m ago`;
  return `${Math.floor(d/3600e3)}h ago`;
}

const TIERS = {
  MEGA:  { label:"🚨 MEGA",  color:"#f0b429", border:"rgba(240,180,41,0.3)",  bg:"rgba(240,180,41,0.06)"  },
  LARGE: { label:"🐋 LARGE", color:"#3b8ef0", border:"rgba(59,142,240,0.25)", bg:"rgba(59,142,240,0.05)"  },
  WHALE: { label:"🐳 WHALE", color:"#00e8c6", border:"rgba(0,232,198,0.2)",   bg:"rgba(0,232,198,0.04)"   },
};

export default function WhalesPage() {
  const router = useRouter();
  const [trades, setTrades]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("ALL");

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const results = await Promise.allSettled(
          COINS.map(coin => fetch(HL, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({type:"recentTrades", coin})
          }).then(r=>r.json()))
        );
        const whales = [];
        results.forEach((item, i) => {
          if (item.status !== "fulfilled") return;
          const coin = COINS[i];
          (item.value||[]).forEach(t => {
            const notional = parseFloat(t.px) * parseFloat(t.sz);
            if (notional >= 50000) {
              whales.push({
                asset: coin, side: t.side==="B"?"BUY":"SELL",
                price: parseFloat(t.px), size: parseFloat(t.sz),
                notional: Math.round(notional), time: t.time,
                tier: notional>=500000?"MEGA":notional>=200000?"LARGE":"WHALE",
              });
            }
          });
        });
        whales.sort((a,b) => b.notional-a.notional);
        setTrades(whales.slice(0,100));
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch_();
    const t = setInterval(fetch_, 8000);
    return () => clearInterval(t);
  }, []);

  const filtered = filter==="ALL" ? trades : trades.filter(t => t.tier===filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <Link href="/" className="text-[10px] font-mono text-[#2a4060] hover:text-[#5a7a9a]">← Markets</Link>
      <div className="flex items-center justify-between mt-4 mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#e8f0f8]">Whale Trades</h1>
          <p className="text-[11px] font-mono text-[#2a4060] mt-0.5">Trades above $50K · click to see chart</p>
        </div>
        <div className="flex gap-0.5 bg-[#111720] border border-[#1e2a38] rounded-lg p-0.5">
          {[["ALL","All"],["WHALE","$50K+"],["LARGE","$200K+"],["MEGA","$500K+"]].map(([v,l]) => (
            <button key={v} onClick={()=>setFilter(v)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition-all ${filter===v?"bg-[#00e8c6]/12 text-[#00e8c6] border border-[#00e8c6]/20":"text-[#5a7a9a] hover:text-[#e8f0f8]"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {loading
          ? Array.from({length:6}).map((_,i) => <div key={i} className="card p-4"><div className="h-12 shimmer rounded"/></div>)
          : filtered.length===0
          ? <div className="card p-12 text-center text-[#2a4060] font-mono text-sm">No whale trades right now · checking every 8s</div>
          : filtered.map((t,i) => {
              const color = assetColor(t.asset);
              const tier  = TIERS[t.tier]||TIERS.WHALE;
              const isBuy = t.side==="BUY";
              return (
                <div key={i} className="card cursor-pointer transition-all hover:scale-[1.005]"
                  style={{borderColor:tier.border}}
                  onClick={()=>router.push(`/market/${t.asset}`)}>
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                        style={{background:`${color}15`,border:`1.5px solid ${color}30`,color}}>
                        {t.asset.slice(0,3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                            style={{background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`}}>{tier.label}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${isBuy?"badge-long":"badge-short"}`}>
                            {isBuy?"▲ BUY":"▼ SELL"}
                          </span>
                          <span className="text-[13px] font-bold" style={{color}}>{t.asset}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold font-mono" style={{color:tier.color}}>{fmt(t.notional)}</span>
                          <span className="text-[11px] font-mono text-[#5a7a9a]">{t.size?.toFixed(4)} @ ${fmtP(t.price)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono text-[#2a4060]">{timeAgo(t.time)}</span>
                      <div className="flex gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-1 rounded border border-[#1e2a38] text-[#2a4060]">Chart →</span>
                        <a href={`https://app.hyperliquid.xyz/trade/${t.asset}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e=>e.stopPropagation()}
                          className="text-[10px] font-mono px-2 py-1 rounded border border-[#00e8c6]/25 text-[#00e8c6] hover:bg-[#00e8c6]/10 transition-all">
                          Trade ↗
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
