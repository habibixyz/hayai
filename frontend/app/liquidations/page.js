"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { assetColor } from "../../lib/api";

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
  return n.toFixed(4);
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60e3) return `${Math.floor(d/1e3)}s ago`;
  if (d < 3600e3) return `${Math.floor(d/60e3)}m ago`;
  return `${Math.floor(d/3600e3)}h ago`;
}

export default function LiquidationsPage() {
  const router = useRouter();
  const [liqs, setLiqs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("ALL");

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch("/api/markets/liquidations");
        const data = await res.json();
        if (data.success) setLiqs(data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch_();
    const t = setInterval(fetch_, 8000);
    return () => clearInterval(t);
  }, []);

  const COINS     = ["ALL", ...new Set(liqs.map(l => l.asset))].slice(0, 14);
  const filtered  = filter==="ALL" ? liqs : liqs.filter(l => l.asset===filter);
  const totalLiqd = liqs.reduce((s,l) => s+l.notional, 0);
  const longLiqs  = liqs.filter(l => l.side==="LONG_LIQ").length;
  const shortLiqs = liqs.filter(l => l.side==="SHORT_LIQ").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <Link href="/" className="text-[10px] font-mono text-[#2a4060] hover:text-[#5a7a9a]">← Markets</Link>

      <div className="mt-4 mb-5">
        <h1 className="text-xl font-bold text-[#e8f0f8]">Liquidations</h1>
        <p className="text-[11px] font-mono text-[#2a4060] mt-0.5">
          Large forced closes on Hyperliquid · click to see chart · min $5K
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          ["Total Liq'd", fmt(totalLiqd), "#f0444b"],
          ["Count",       liqs.length,   "#e8f0f8"],
          ["Long Liq'd",  longLiqs,      "#f0444b"],
          ["Short Liq'd", shortLiqs,     "#0cd98a"],
        ].map(([label,value,color]) => (
          <div key={label} className="card px-4 py-3.5">
            <p className="text-[10px] font-mono text-[#2a4060] uppercase tracking-widest mb-1">{label}</p>
            <p className="text-lg font-bold" style={{color}}>{value}</p>
          </div>
        ))}
      </div>

      {/* Asset filter */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {COINS.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-all ${
              filter===c
                ? "border-[#f0444b]/40 text-[#f0444b] bg-[#f0444b]/8"
                : "border-[#1e2a38] text-[#5a7a9a] hover:border-[#243040] hover:text-[#e8f0f8]"
            }`}>{c}</button>
        ))}
      </div>

      <div className="space-y-2">
        {loading
          ? Array.from({length:6}).map((_,i) => (
              <div key={i} className="card p-4"><div className="h-12 shimmer rounded"/></div>
            ))
          : filtered.length===0
          ? <div className="card p-12 text-center text-[#2a4060] font-mono text-sm">
              No liquidations found · checking every 8s
            </div>
          : filtered.map((l,i) => {
              const color  = assetColor(l.asset);
              const isLong = l.side==="LONG_LIQ";
              const hlUrl  = `https://app.hyperliquid.xyz/trade/${l.asset}`;

              return (
                <div key={i}
                  className="card cursor-pointer transition-all hover:scale-[1.005] hover:border-[#243040] animate-fade-in"
                  style={{animationDelay:`${i*15}ms`, animationFillMode:"both"}}
                  onClick={() => router.push(`/market/${l.asset}`)}>

                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0"
                        style={{background:`${color}15`, border:`1px solid ${color}30`, color}}>
                        {l.asset.slice(0,3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${isLong?"badge-short":"badge-long"}`}>
                            {isLong?"▼ LONG LIQ":"▲ SHORT LIQ"}
                          </span>
                          <span className="text-[13px] font-semibold" style={{color}}>{l.asset}</span>
                          {l.isWhale && <span className="text-[#f0b429]">🐳</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <span className="font-bold text-[#f0444b]">{fmt(l.notional)}</span>
                          <span className="text-[#1e2a38]">·</span>
                          <span className="text-[#5a7a9a]">{l.size?.toFixed(4)} @ ${fmtP(l.price)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono text-[#2a4060]">{timeAgo(l.time)}</span>
                      <div className="flex gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-1 rounded border border-[#1e2a38] text-[#2a4060]">
                          Chart →
                        </span>
                        <a href={hlUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
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
      <p className="mt-4 text-[9px] font-mono text-[#2a4060] text-center">
        Click card → Hayai chart · "Trade ↗" → Hyperliquid · refreshes every 8s
      </p>
    </div>
  );
}
