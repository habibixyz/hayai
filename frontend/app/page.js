"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { assetColor } from "../lib/api";

function fmt(n) {
  if (!n && n !== 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(n) {
  if (!n) return "—";
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(4);
  return n.toFixed(6);
}

const TABS = ["All", "Gainers", "Losers", "High OI", "High Funding"];

export default function MarketsPage() {
  const [markets, setMarkets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("All");
  const [search, setSearch]     = useState("");
  const [sortBy, setSortBy]     = useState("volume24h");
  const [sortDir, setSortDir]   = useState("desc");
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchMarkets = useCallback(async () => {
    try {
      const res  = await fetch("/api/markets/overview");
      const data = await res.json();
      if (data.success) { setMarkets(data.data); setLastUpdate(Date.now()); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const t = setInterval(fetchMarkets, 8000);
    return () => clearInterval(t);
  }, [fetchMarkets]);

  let filtered = [...markets];
  if (search) filtered = filtered.filter(m => m.asset.toLowerCase().includes(search.toLowerCase()));
  if (tab === "Gainers")  filtered = filtered.filter(m => m.change24h > 0).sort((a,b) => b.change24h - a.change24h);
  else if (tab === "Losers") filtered = filtered.filter(m => m.change24h < 0).sort((a,b) => a.change24h - b.change24h);
  else if (tab === "High OI") filtered = [...filtered].sort((a,b) => b.openInterest - a.openInterest);
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

  const SortArrow = ({ col }) => (
    <span className={`ml-1 ${sortBy===col ? "text-[#7c6aff]" : "text-[#303060]"}`}>
      {sortBy===col ? (sortDir==="desc" ? "↓" : "↑") : "↕"}
    </span>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          ["24h Volume",       fmt(totalVol),         "#7c6aff"],
          ["Open Interest",    fmt(totalOI),           "#00e5ff"],
          ["Gainers / Losers", `${gainers} / ${losers}`, gainers > losers ? "#00ff94" : "#ff3b5c"],
          ["Markets",          markets.length,         "#eeeeff"],
        ].map(([label, value, color]) => (
          <div key={label} className="card p-4">
            <p className="text-[9px] font-mono text-[#303060] uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xl font-display font-700" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        <div className="flex gap-1 bg-[#080810] border border-[#16162a] rounded-lg p-1 flex-wrap">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-xs font-600 transition-all whitespace-nowrap ${
                tab===t ? "bg-[#7c6aff]/15 text-[#7c6aff] border border-[#7c6aff]/25" : "text-[#6060a0] hover:text-[#eeeeff]"
              }`}
            >{t}</button>
          ))}
        </div>
        <input className="input-field max-w-xs text-sm" placeholder="Search asset…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="ml-auto flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-[#00ff94] opacity-60" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-[#00ff94]" />
          </span>
          <span className="text-[10px] font-mono text-[#303060]">
            {lastUpdate ? `${Math.round((Date.now()-lastUpdate)/1000)}s ago` : "live"}
          </span>
        </div>
      </div>

      {/* Quick nav to other pages */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { href:"/whales",       label:"🐳 Whale Trades" },
          { href:"/liquidations", label:"💥 Liquidations" },
          { href:"/funding",      label:"📊 Funding Rates" },
          { href:"/feed",         label:"📡 Trade Feed" },
        ].map(({ href, label }) => (
          <Link key={href} href={href}
            className="text-[11px] font-mono px-3 py-1.5 rounded border border-[#16162a] text-[#6060a0] hover:border-[#7c6aff]/30 hover:text-[#7c6aff] hover:bg-[#7c6aff]/5 transition-all">
            {label}
          </Link>
        ))}
      </div>

      {/* Markets table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#16162a]">
              {[
                ["#",null],["Asset","asset"],["Price","mid"],["24h %","change24h"],
                ["Volume","volume24h"],["OI","openInterest"],["Funding/8h","funding"],
                ["Max Lev","maxLeverage"],["",null],
              ].map(([label, col]) => (
                <th key={label} onClick={() => col && toggleSort(col)}
                  className={`px-4 py-3.5 text-left text-[9px] font-400 text-[#303060] uppercase tracking-widest whitespace-nowrap ${col ? "cursor-pointer hover:text-[#6060a0] select-none" : ""}`}>
                  {label}{col && <SortArrow col={col} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({length:14}).map((_,i) => (
                  <tr key={i} className="border-b border-[#16162a]">
                    {Array.from({length:9}).map((_,j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 shimmer rounded" style={{width:`${40+(j*17)%50}%`}} />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((m, i) => {
                  const color = assetColor(m.asset);
                  const pos   = m.change24h >= 0;
                  const fpos  = m.funding  >= 0;
                  return (
                    <tr key={m.asset}
                      className="border-b border-[#16162a] hover:bg-[#080810] transition-colors group cursor-pointer"
                      onClick={() => window.location.href=`/market/${m.asset}`}
                    >
                      <td className="px-4 py-3.5 text-[10px] font-mono text-[#303060]">{i+1}</td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-mono font-700 flex-shrink-0"
                            style={{background:`${color}18`,border:`1.5px solid ${color}35`,color}}>
                            {m.asset.slice(0,3)}
                          </div>
                          <div>
                            <p className="text-sm font-display font-700 text-[#eeeeff] group-hover:text-[#7c6aff] transition-colors">{m.asset}</p>
                            <p className="text-[9px] font-mono text-[#303060]">PERP</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-sm font-mono font-600 text-[#eeeeff]">${fmtPrice(m.mid)}</td>

                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-mono font-600 ${pos?"text-[#00ff94]":"text-[#ff3b5c]"}`}>
                          {pos?"+":""}{m.change24h}%
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-sm font-mono text-[#6060a0]">{fmt(m.volume24h)}</td>
                      <td className="px-4 py-3.5 text-sm font-mono text-[#6060a0]">{fmt(m.openInterest)}</td>

                      <td className="px-4 py-3.5">
                        <span className={`text-[11px] font-mono font-600 ${Math.abs(m.funding)<0.001?"text-[#6060a0]":fpos?"text-[#00ff94]":"text-[#ff3b5c]"}`}>
                          {fpos?"+":""}{m.funding.toFixed(4)}%
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-[11px] font-mono text-[#303060]">{m.maxLeverage}x</td>

                      <td className="px-4 py-3.5">
                        <Link href={`/market/${m.asset}`} onClick={e=>e.stopPropagation()}
                          className="text-[10px] font-mono px-2.5 py-1.5 rounded border border-[#16162a] text-[#6060a0] hover:border-[#7c6aff]/40 hover:text-[#7c6aff] transition-all whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-[#303060] font-mono text-xs">No markets match "{search}"</div>
        )}
      </div>

      <p className="mt-3 text-[9px] font-mono text-[#303060] text-center">
        Hyperliquid perpetuals · refreshes every 8s · funding is per 8h period
      </p>
    </div>
  );
}
