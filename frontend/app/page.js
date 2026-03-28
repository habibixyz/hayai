"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { assetColor } from "../lib/api";

const HL = "https://api.hyperliquid.xyz/info";

async function hlPost(body) {
  const res = await fetch(HL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function fmt(n) {
  if (!n && n !== 0) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtP(n) {
  if (!n) return "—";
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}
function round(n, d = 2) { return Math.round((n || 0) * 10 ** d) / 10 ** d; }

const TABS = ["All", "Gainers", "Losers", "High OI", "High Funding"];

export default function MarketsPage() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("volume24h");
  const [sortDir, setSortDir] = useState("desc");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  const fetchMarkets = useCallback(async () => {
    try {
      const [metaAndCtx, allMids] = await Promise.all([
        hlPost({ type: "metaAndAssetCtxs" }),
        hlPost({ type: "allMids" }),
      ]);

      const universe = metaAndCtx[0]?.universe || [];
      const contexts = metaAndCtx[1] || [];

      const data = universe.map((asset, i) => {
        const ctx       = contexts[i] || {};
        const mid       = parseFloat(allMids[asset.name] || 0);
        const markPx    = parseFloat(ctx.markPx    || mid);
        const prevDayPx = parseFloat(ctx.prevDayPx || markPx);
        const change24h = prevDayPx > 0 ? round(((markPx - prevDayPx) / prevDayPx) * 100) : 0;
        return {
          asset:        asset.name,
          mid:          round(mid, mid >= 100 ? 2 : 5),
          change24h,
          volume24h:    round(parseFloat(ctx.dayNtlVlm    || 0)),
          openInterest: round(parseFloat(ctx.openInterest || 0) * markPx),
          funding:      round(parseFloat(ctx.funding      || 0) * 100, 4),
          maxLeverage:  asset.maxLeverage || 50,
        };
      }).filter(m => m.mid > 0).sort((a, b) => b.volume24h - a.volume24h);

      setMarkets(data);
      setLastUpdate(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const t = setInterval(fetchMarkets, 8000);
    return () => clearInterval(t);
  }, [fetchMarkets]);

  let filtered = [...markets];
  if (search) filtered = filtered.filter(m => m.asset.toLowerCase().includes(search.toLowerCase()));
  if      (tab === "Gainers")      filtered = filtered.filter(m => m.change24h > 0).sort((a,b) => b.change24h - a.change24h);
  else if (tab === "Losers")       filtered = filtered.filter(m => m.change24h < 0).sort((a,b) => a.change24h - b.change24h);
  else if (tab === "High OI")      filtered = [...filtered].sort((a,b) => b.openInterest - a.openInterest);
  else if (tab === "High Funding") filtered = [...filtered].sort((a,b) => Math.abs(b.funding) - Math.abs(a.funding));
  else filtered.sort((a,b) => sortDir === "desc" ? (b[sortBy]||0)-(a[sortBy]||0) : (a[sortBy]||0)-(b[sortBy]||0));

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  const totalVol = markets.reduce((s,m) => s+m.volume24h, 0);
  const totalOI  = markets.reduce((s,m) => s+m.openInterest, 0);
  const gainers  = markets.filter(m => m.change24h > 0).length;
  const losers   = markets.filter(m => m.change24h < 0).length;

  const Arr = ({ col }) => (
    <span className={`ml-1 text-[10px] ${sortBy===col?"text-[#00e8c6]":"text-[#2a4060]"}`}>
      {sortBy===col ? (sortDir==="desc"?"▼":"▲") : "⇅"}
    </span>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">
      {error && (
        <div className="mb-4 px-4 py-2.5 rounded border border-[#f0444b]/30 bg-[#f0444b]/8 text-[11px] font-mono text-[#f0444b]">
          ⚠ {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          ["24h Volume",       fmt(totalVol),                                    "#00e8c6"],
          ["Open Interest",    fmt(totalOI),                                     "#3b8ef0"],
          ["Gainers / Losers", `${gainers} / ${losers}`,  gainers>=losers?"#0cd98a":"#f0444b"],
          ["Markets",          markets.length,                                   "#e8f0f8"],
        ].map(([label,value,color]) => (
          <div key={label} className="card px-4 py-3.5">
            <p className="text-[10px] font-mono text-[#2a4060] uppercase tracking-widest mb-1">{label}</p>
            <p className="text-lg font-bold" style={{color}}>{value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          {href:"/whales",       icon:"🐳", label:"Whale Trades"},
          {href:"/liquidations", icon:"💥", label:"Liquidations"},
          {href:"/funding",      icon:"📊", label:"Funding Rates"},
          {href:"/feed",         icon:"📡", label:"Trade Feed"},
        ].map(({href,icon,label}) => (
          <Link key={href} href={href}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded border border-[#1e2a38] text-[#5a7a9a] hover:border-[#00e8c6]/30 hover:text-[#00e8c6] hover:bg-[#00e8c6]/5 transition-all">
            {icon} {label}
          </Link>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3 items-start sm:items-center">
        <div className="flex gap-0.5 bg-[#111720] border border-[#1e2a38] rounded-lg p-0.5">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition-all whitespace-nowrap ${
                tab===t ? "bg-[#00e8c6]/12 text-[#00e8c6] border border-[#00e8c6]/20" : "text-[#5a7a9a] hover:text-[#e8f0f8]"
              }`}>{t}</button>
          ))}
        </div>
        <input className="input-field max-w-[180px]" placeholder="Search…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-[#2a4060]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-[#00e8c6] opacity-60"/>
            <span className="relative rounded-full h-1.5 w-1.5 bg-[#00e8c6]"/>
          </span>
          {lastUpdate ? `${Math.round((Date.now()-lastUpdate)/1000)}s ago` : "connecting…"}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2a38]" style={{background:"#0d1420"}}>
              {[["#",null],["Asset","asset"],["Price","mid"],["24h %","change24h"],
                ["Volume","volume24h"],["Open Interest","openInterest"],
                ["Funding/8h","funding"],["Max Lev","maxLeverage"],["",null]].map(([label,col]) => (
                <th key={label} onClick={() => col && toggleSort(col)}
                  className={`px-4 py-3 text-left text-[10px] font-medium text-[#2a4060] uppercase tracking-wider whitespace-nowrap ${col?"cursor-pointer hover:text-[#5a7a9a] select-none":""}`}>
                  {label}{col && <Arr col={col}/>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({length:14}).map((_,i) => (
                  <tr key={i} className="border-b border-[#1e2a38]">
                    {Array.from({length:9}).map((_,j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 shimmer rounded" style={{width:`${40+(j*17)%50}%`}}/>
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((m,i) => {
                  const color = assetColor(m.asset);
                  const pos   = m.change24h >= 0;
                  const fpos  = m.funding >= 0;
                  return (
                    <tr key={m.asset}
                      className="border-b border-[#1e2a38] hover:bg-[#111720] transition-colors cursor-pointer group"
                      onClick={() => window.location.href=`/market/${m.asset}`}>
                      <td className="px-4 py-3.5 text-[11px] font-mono text-[#2a4060]">{i+1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0"
                            style={{background:`${color}18`,border:`1px solid ${color}30`,color}}>
                            {m.asset.slice(0,3)}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#e8f0f8] group-hover:text-[#00e8c6] transition-colors">{m.asset}</p>
                            <p className="text-[9px] font-mono text-[#2a4060]">PERP</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-mono font-semibold text-[#e8f0f8]">${fmtP(m.mid)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[13px] font-mono font-semibold ${pos?"text-[#0cd98a]":"text-[#f0444b]"}`}>
                          {pos?"+":""}{m.change24h}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-mono text-[#5a7a9a]">{fmt(m.volume24h)}</td>
                      <td className="px-4 py-3.5 text-[13px] font-mono text-[#5a7a9a]">{fmt(m.openInterest)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[12px] font-mono font-semibold ${
                          Math.abs(m.funding)<0.001?"text-[#5a7a9a]":fpos?"text-[#0cd98a]":"text-[#f0444b]"
                        }`}>
                          {fpos?"+":""}{m.funding.toFixed(4)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] font-mono text-[#2a4060]">{m.maxLeverage}x</td>
                      <td className="px-4 py-3.5">
                        <Link href={`/market/${m.asset}`} onClick={e=>e.stopPropagation()}
                          className="text-[11px] font-mono px-2.5 py-1 rounded border border-[#1e2a38] text-[#2a4060] hover:border-[#00e8c6]/30 hover:text-[#00e8c6] transition-all whitespace-nowrap">
                          Chart →
                        </Link>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
        {!loading && filtered.length===0 && (
          <div className="py-16 text-center text-[#2a4060] font-mono text-xs">
            {search ? `No markets match "${search}"` : "No data yet — loading…"}
          </div>
        )}
      </div>
      <p className="mt-3 text-[9px] font-mono text-[#2a4060] text-center">
        Hyperliquid perpetuals · refreshes every 8s · funding is per 8h period
      </p>
    </div>
  );
}
