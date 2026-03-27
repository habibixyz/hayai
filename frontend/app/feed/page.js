"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { assetColor } from "../../lib/api";

function fmt(n) {
  if (!n && n!==0) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtP(n) {
  if (!n) return "—";
  if (n >= 10000) return n.toLocaleString("en-US",{maximumFractionDigits:0});
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60e3) return `${Math.floor(d/1e3)}s ago`;
  if (d < 3600e3) return `${Math.floor(d/60e3)}m ago`;
  return `${Math.floor(d/3600e3)}h ago`;
}

const COINS = ["ALL","BTC","ETH","SOL","HYPE","ARB","AVAX","DOGE","WIF","PEPE","SUI","LINK"];
const MIN_SIZES = [
  { label: "$1K+",  value: 1000 },
  { label: "$5K+",  value: 5000 },
  { label: "$25K+", value: 25000 },
  { label: "$100K+",value: 100000 },
];

export default function FeedPage() {
  const [trades, setTrades]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [coin, setCoin]         = useState("ALL");
  const [minSize, setMinSize]   = useState(1000);
  const [paused, setPaused]     = useState(false);
  const [newCount, setNewCount] = useState(0);
  const seenIds = useRef(new Set());

  const fetchTrades = useCallback(async (reset = false) => {
    if (paused && !reset) return;
    try {
      const params = new URLSearchParams({ limit: 80 });
      if (coin !== "ALL") params.set("coin", coin);
      params.set("minNotional", minSize);
      const res  = await fetch(`/api/feed?${params}`);
      const data = await res.json();
      const incoming = data.data || [];
      if (reset) {
        seenIds.current = new Set(incoming.map(t => t.id));
        setTrades(incoming);
        setNewCount(0);
      } else {
        const fresh = incoming.filter(t => !seenIds.current.has(t.id));
        fresh.forEach(t => seenIds.current.add(t.id));
        if (fresh.length) {
          setNewCount(c => c + fresh.length);
          setTrades(prev => [...fresh, ...prev].slice(0, 300));
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [coin, minSize, paused]);

  useEffect(() => {
    setLoading(true);
    setTrades([]);
    seenIds.current = new Set();
    fetchTrades(true);
  }, [coin, minSize]);

  useEffect(() => {
    const t = setInterval(() => fetchTrades(false), 6000);
    return () => clearInterval(t);
  }, [fetchTrades]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8f0f8]">Live Trade Feed</h1>
          <p className="text-[11px] font-mono text-[#2a4060] mt-0.5">Real Hyperliquid perp trades</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#00e8c6]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-[#00e8c6] opacity-60"/>
            <span className="relative rounded-full h-1.5 w-1.5 bg-[#00e8c6]"/>
          </span>
          {paused ? "paused" : "live · 6s"}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-1 flex-wrap">
          {COINS.map(c => (
            <button key={c} onClick={() => setCoin(c)}
              className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-all ${
                coin===c ? "border-[#00e8c6]/40 text-[#00e8c6] bg-[#00e8c6]/8" : "border-[#1e2a38] text-[#5a7a9a] hover:border-[#243040] hover:text-[#e8f0f8]"
              }`}>{c}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-[#2a4060]">Min size:</span>
          {MIN_SIZES.map(s => (
            <button key={s.value} onClick={() => setMinSize(s.value)}
              className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-all ${
                minSize===s.value ? "border-[#0cd98a]/40 text-[#0cd98a] bg-[#0cd98a]/8" : "border-[#1e2a38] text-[#5a7a9a] hover:border-[#243040] hover:text-[#e8f0f8]"
              }`}>{s.label}</button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#2a4060]">{trades.length} trades</span>
            <button onClick={() => setPaused(v => !v)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${
                paused ? "border-[#f0b429]/40 text-[#f0b429] bg-[#f0b429]/8" : "border-[#1e2a38] text-[#2a4060] hover:text-[#5a7a9a]"
              }`}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
          </div>
        </div>
      </div>

      {/* New trades banner */}
      {newCount > 0 && !paused && (
        <button onClick={() => setNewCount(0)}
          className="w-full mb-3 py-2 text-[11px] font-mono text-[#00e8c6] bg-[#00e8c6]/8 border border-[#00e8c6]/20 rounded hover:bg-[#00e8c6]/12 transition-all">
          ↑ {newCount} new trade{newCount>1?"s":""} — click to clear
        </button>
      )}

      {/* Feed */}
      <div className="space-y-1.5">
        {loading
          ? Array.from({length:8}).map((_,i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full shimmer flex-shrink-0"/>
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 shimmer rounded"/>
                  <div className="h-3 w-48 shimmer rounded"/>
                </div>
              </div>
            ))
          : trades.length === 0
          ? <div className="card p-12 text-center text-[#2a4060] font-mono text-sm">
              No trades above {fmt(minSize)} — try lowering the min size
            </div>
          : trades.map((t, i) => {
              const color = assetColor(t.asset);
              const isLong = t.side === "LONG";
              return (
                <div key={t.id} className="card card-hover p-3.5 animate-fade-in">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0"
                        style={{background:`${color}18`,border:`1px solid ${color}30`,color}}>
                        {t.asset.slice(0,3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${isLong?"badge-long":"badge-short"}`}>
                            {isLong?"▲ LONG":"▼ SHORT"}
                          </span>
                          <Link href={`/market/${t.asset}`}
                            className="text-[13px] font-semibold hover:text-[#00e8c6] transition-colors" style={{color}}>
                            {t.asset}
                          </Link>
                          <span className="text-[12px] font-mono text-[#e8f0f8]">{t.size?.toFixed ? t.size.toFixed(4) : t.size}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-[#5a7a9a]">
                          <span>@ ${fmtP(t.price)}</span>
                          <span className="text-[#1e2a38]">·</span>
                          <span className={`font-semibold ${t.notional >= 100000 ? "text-[#f0b429]" : "text-[#e8f0f8]"}`}>
                            {fmt(t.notional)}
                          </span>
                          {t.isWhale && <span className="text-[#f0b429]">🐳</span>}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#2a4060] flex-shrink-0">
                      {timeAgo(t.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
