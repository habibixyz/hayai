"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTrader, getFollowerCount, short, fmtUSD, fmtSize, fmtPnl,
  timeAgo, assetColor, avatarGradient,
} from "../../../lib/api";
import { StatSkeleton, CardSkeleton, RowSkeleton } from "../../../components/ui/Skeletons";
import FollowButton from "../../../components/wallet/FollowButton";
import TradePanel from "../../../components/trading/TradePanel";
import { useWallet } from "../../../hooks/useWallet";

function StatCard({ label, value, accent, red, gold }) {
  return (
    <div className="card p-4">
      <p className="text-[9px] font-mono text-[#303060] uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-lg font-display font-700 ${accent ? "text-[#00ff94]" : red ? "text-[#ff3b5c]" : gold ? "text-[#ffd700]" : "text-[#eeeeff]"}`}>
        {value}
      </p>
    </div>
  );
}

export default function TraderPage() {
  const { address } = useParams();
  const { address: myAddress } = useWallet();
  const [data, setData] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("history"); // history | positions | orders
  const [page, setPage] = useState(1);
  const [showTradePanel, setShowTradePanel] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      getTrader(address, { pageSize: 100 }),
      getFollowerCount(address),
    ]).then(([traderRes, followRes]) => {
      setData(traderRes.data);
      setFollowerCount(followRes.count || 0);
    }).catch(console.error).finally(() => setLoading(false));
  }, [address]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-[#ff3b5c] font-mono text-sm mb-2">Trader not found</p>
        <p className="text-[#303060] font-mono text-xs mb-6">No Hyperliquid activity for this address</p>
        <Link href="/" className="text-[#7c6aff] font-mono text-xs hover:underline">← Back to feed</Link>
      </div>
    );
  }

  const { stats, positions, fills, openOrders, accountValue } = data;
  const isMe = myAddress?.toLowerCase() === address?.toLowerCase();
  const pnl = fmtPnl(stats.totalPnl);
  const gradStyle = { background: avatarGradient(address) };

  const PAGE_SIZE = 20;
  const pagedFills = fills.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(fills.length / PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <Link href="/" className="text-[10px] font-mono text-[#303060] hover:text-[#6060a0] transition-colors">
        ← Feed
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full flex-shrink-0" style={gradStyle} />
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-mono font-600 text-lg text-[#eeeeff]">{short(address)}</h1>
              {isMe && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#7c6aff]/30 text-[#7c6aff] bg-[#7c6aff]/8">
                  YOU
                </span>
              )}
              {stats.totalVolume > 1_000_000 && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded badge-whale">🐳 WHALE</span>
              )}
            </div>
            <p className="text-[10px] font-mono text-[#303060] break-all">{address}</p>
            <p className="text-[11px] font-mono text-[#6060a0] mt-1">{followerCount} followers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FollowButton address={address} />
          <button
            onClick={() => setShowTradePanel((v) => !v)}
            className="px-4 py-2 rounded-lg text-sm font-600 btn-primary"
          >
            {showTradePanel ? "Hide Panel" : "Trade"}
          </button>
          <a
            href={`https://app.hyperliquid.xyz/explorer/address/${address}`}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg text-xs font-mono btn-outline"
          >
            HL Explorer ↗
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Trades" value={stats.totalTrades.toLocaleString()} />
            <StatCard label="Total Volume" value={fmtUSD(stats.totalVolume)} accent />
            <StatCard label="Realized PnL" value={pnl.str} accent={pnl.pos === true} red={pnl.pos === false} />
            <StatCard label="Win Rate" value={`${stats.winRate}%`} accent={stats.winRate >= 50} />
            <StatCard label="Avg Trade" value={fmtUSD(stats.avgTradeSize)} />
            <StatCard label="Fav Asset" value={stats.favoriteAsset || "—"} gold={!!stats.favoriteAsset} />
            <StatCard label="Longs" value={stats.longsCount} accent />
            <StatCard label="Shorts" value={stats.shortsCount} red />
          </div>

          {/* Account value */}
          {accountValue > 0 && (
            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-mono text-[#303060] uppercase tracking-widest mb-1">Account Value</p>
                <p className="text-2xl font-display font-800 text-[#7c6aff]">{fmtUSD(accountValue)}</p>
              </div>
              <span className="text-[10px] font-mono text-[#303060]">on Hyperliquid</span>
            </div>
          )}

          {/* PnL sparkline */}
          {stats.dailyPnl?.length > 1 && (
            <div className="card p-4">
              <p className="text-[10px] font-mono text-[#303060] uppercase tracking-widest mb-3">30-Day PnL</p>
              <PnlSparkline data={stats.dailyPnl} />
            </div>
          )}

          {/* Tabs */}
          <div>
            <div className="flex gap-1 mb-3 bg-[#080810] border border-[#16162a] rounded-lg p-1 w-fit">
              {[
                ["history", `History (${fills.length})`],
                ["positions", `Positions (${positions.length})`],
                ["orders", `Open Orders (${openOrders?.length || 0})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-3 py-1.5 rounded text-xs font-600 transition-all ${
                    tab === key
                      ? "bg-[#7c6aff]/15 text-[#7c6aff] border border-[#7c6aff]/25"
                      : "text-[#6060a0] hover:text-[#eeeeff]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Trade History */}
            {tab === "history" && (
              <div className="card overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#16162a]">
                      {["Asset","Side","Price","Size","Notional","PnL","Time"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-400 text-[#303060] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedFills.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-[#303060]">No trade history</td></tr>
                    ) : pagedFills.map((f) => {
                      const color = assetColor(f.asset);
                      const pnl = fmtPnl(f.closedPnl);
                      return (
                        <tr key={f.id} className="border-b border-[#16162a] hover:bg-[#080810] transition-colors">
                          <td className="px-4 py-3"><span style={{ color }} className="font-600">{f.asset}</span></td>
                          <td className="px-4 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-600 ${f.side === "LONG" ? "badge-long" : "badge-short"}`}>
                              {f.side === "LONG" ? "▲ L" : "▼ S"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#6060a0]">{fmtUSD(f.price, f.price >= 100 ? 1 : 3).replace("$","")}</td>
                          <td className="px-4 py-3 text-[#eeeeff]">{fmtSize(f.size)}</td>
                          <td className="px-4 py-3 text-[#6060a0]">{fmtUSD(f.notional)}</td>
                          <td className="px-4 py-3 font-600" style={{ color: pnl.pos === true ? "#00ff94" : pnl.pos === false ? "#ff3b5c" : "#303060" }}>
                            {pnl.str}
                          </td>
                          <td className="px-4 py-3 text-[#303060]">{timeAgo(f.timestamp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[#16162a]">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-[10px] font-mono text-[#6060a0] disabled:opacity-30 hover:text-[#eeeeff]">← Prev</button>
                    <span className="text-[10px] font-mono text-[#303060]">Page {page} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-[10px] font-mono text-[#6060a0] disabled:opacity-30 hover:text-[#eeeeff]">Next →</button>
                  </div>
                )}
              </div>
            )}

            {/* Positions */}
            {tab === "positions" && (
              <div className="card overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#16162a]">
                      {["Asset","Side","Size","Entry","Mark","Unr. PnL","Liq.","Lev."].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-400 text-[#303060] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-[#303060]">No open positions</td></tr>
                    ) : positions.map((p) => {
                      const color = assetColor(p.asset);
                      const upnl = fmtPnl(p.unrealizedPnl);
                      return (
                        <tr key={p.asset} className="border-b border-[#16162a] hover:bg-[#080810] transition-colors">
                          <td className="px-4 py-3"><span style={{ color }} className="font-600">{p.asset}</span></td>
                          <td className="px-4 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-600 ${p.side === "LONG" ? "badge-long" : "badge-short"}`}>
                              {p.side}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#eeeeff]">{fmtSize(Math.abs(p.size))}</td>
                          <td className="px-4 py-3 text-[#6060a0]">{fmtUSD(p.entryPx, 2).replace("$","")}</td>
                          <td className="px-4 py-3 text-[#eeeeff]">{fmtUSD(p.markPx, 2).replace("$","")}</td>
                          <td className="px-4 py-3 font-600" style={{ color: upnl.pos === true ? "#00ff94" : upnl.pos === false ? "#ff3b5c" : "#303060" }}>
                            {upnl.str}
                          </td>
                          <td className="px-4 py-3 text-[#ff3b5c]/70">
                            {p.liquidationPx > 0 ? fmtUSD(p.liquidationPx, 2).replace("$","") : "—"}
                          </td>
                          <td className="px-4 py-3 text-[#6060a0]">{p.leverage}x</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Open Orders */}
            {tab === "orders" && (
              <div className="card overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#16162a]">
                      {["Asset","Side","Type","Price","Size","Time"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-400 text-[#303060] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(!openOrders || openOrders.length === 0) ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-[#303060]">No open orders</td></tr>
                    ) : openOrders.map((o, i) => {
                      const color = assetColor(o.coin);
                      return (
                        <tr key={i} className="border-b border-[#16162a] hover:bg-[#080810] transition-colors">
                          <td className="px-4 py-3"><span style={{ color }} className="font-600">{o.coin}</span></td>
                          <td className="px-4 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-600 ${o.side === "B" ? "badge-long" : "badge-short"}`}>
                              {o.side === "B" ? "▲ BUY" : "▼ SELL"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#6060a0]">{o.orderType || "Limit"}</td>
                          <td className="px-4 py-3 text-[#eeeeff]">{fmtUSD(parseFloat(o.limitPx || 0), 2).replace("$","")}</td>
                          <td className="px-4 py-3 text-[#eeeeff]">{fmtSize(parseFloat(o.sz || 0))}</td>
                          <td className="px-4 py-3 text-[#303060]">{o.timestamp ? timeAgo(o.timestamp) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {showTradePanel && <TradePanel defaultAsset={stats.favoriteAsset || "ETH"} />}

          {/* L/S ratio */}
          <div className="card p-4">
            <p className="text-[10px] font-mono text-[#303060] uppercase tracking-widest mb-3">Long / Short Split</p>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-2 bg-[#16162a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00ff94] rounded-full transition-all"
                  style={{ width: `${stats.longsCount + stats.shortsCount > 0 ? (stats.longsCount / (stats.longsCount + stats.shortsCount)) * 100 : 50}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[#00ff94]">▲ {stats.longsCount} longs</span>
              <span className="text-[#ff3b5c]">▼ {stats.shortsCount} shorts</span>
            </div>
          </div>

          {/* Asset breakdown */}
          {stats.dailyPnl?.length > 0 && (
            <div className="card p-4">
              <p className="text-[10px] font-mono text-[#303060] uppercase tracking-widest mb-3">Recent PnL (30d)</p>
              <div className="space-y-1">
                {stats.dailyPnl.slice(-7).reverse().map(({ date, pnl }) => {
                  const p = fmtPnl(pnl);
                  return (
                    <div key={date} className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-[#303060]">{date.slice(5)}</span>
                      <span style={{ color: p.pos === true ? "#00ff94" : p.pos === false ? "#ff3b5c" : "#303060" }}>
                        {p.str}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline SVG sparkline
function PnlSparkline({ data }) {
  const vals = data.map((d) => d.pnl);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 600, H = 60, PAD = 4;

  const points = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2);
    const y = PAD + ((max - v) / range) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(" ");

  const lastVal = vals[vals.length - 1];
  const color = lastVal >= 0 ? "#00ff94" : "#ff3b5c";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Zero line */}
      {min < 0 && max > 0 && (
        <line
          x1={PAD} y1={PAD + (max / range) * (H - PAD * 2)}
          x2={W - PAD} y2={PAD + (max / range) * (H - PAD * 2)}
          stroke="#303060" strokeWidth="0.5" strokeDasharray="3,3"
        />
      )}
      {/* Area fill */}
      <polyline
        points={`${PAD},${H} ${points} ${W - PAD},${H}`}
        fill="url(#sparkGrad)" stroke="none"
      />
      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
