"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getLeaderboard, short, fmtUSD, assetColor } from "../../lib/api";
import { RowSkeleton } from "../../components/ui/Skeletons";

const SORTS = [
  { value: "volume",   label: "Volume" },
  { value: "activity", label: "Activity" },
  { value: "pnl",      label: "PnL" },
  { value: "winRate",  label: "Win Rate" },
];
const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("volume");
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(sortBy)
      .then((res) => { setData(res.data || []); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-800 text-xl text-[#eeeeff]">Leaderboard</h1>
          <p className="text-[11px] font-mono text-[#303060] mt-0.5">
            Top traders by recent Hyperliquid activity
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[#080810] border border-[#16162a] rounded-lg p-1">
          {SORTS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSortBy(value)}
              className={`px-3 py-1.5 rounded text-xs font-600 transition-all ${
                sortBy === value
                  ? "bg-[#7c6aff]/15 text-[#7c6aff] border border-[#7c6aff]/25"
                  : "text-[#6060a0] hover:text-[#eeeeff]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-[#ff3b5c]/8 border border-[#ff3b5c]/20 rounded-lg text-[11px] font-mono text-[#ff3b5c]">
          ⚠ {error}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#16162a]">
              {["#","Trader","Volume","Trades","L/S","Top Asset","Win Rate","PnL"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[9px] font-400 text-[#303060] uppercase tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <RowSkeleton key={i} cols={8} />)
              : data.map((trader) => {
                  const total = trader.longsCount + trader.shortsCount;
                  const longPct = total > 0 ? Math.round((trader.longsCount / total) * 100) : 50;
                  const col = assetColor(trader.favoriteAsset);
                  const pnlPos = trader.totalPnl > 0;

                  return (
                    <tr key={trader.address} className="border-b border-[#16162a] hover:bg-[#080810] transition-colors group">
                      <td className="px-4 py-3.5">
                        <span className={trader.rank <= 3 ? "text-base" : "text-[#303060]"}>
                          {MEDALS[trader.rank] || `#${trader.rank}`}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${assetColor(trader.favoriteAsset || "ETH")}, #7c6aff)` }}
                          />
                          <Link
                            href={`/trader/${trader.address}`}
                            className="text-[#6060a0] group-hover:text-[#7c6aff] transition-colors"
                          >
                            {short(trader.address)}
                          </Link>
                          {trader.isWhale && (
                            <span className="badge-whale text-[8px] px-1 py-0.5 rounded">🐳</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-[#00ff94] font-600">
                        {fmtUSD(trader.totalVolume)}
                      </td>

                      <td className="px-4 py-3.5 text-[#eeeeff]">
                        {trader.totalTrades.toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-[#ff3b5c]/25 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#00ff94] rounded-full"
                              style={{ width: `${longPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-[#6060a0]">{longPct}%L</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {trader.favoriteAsset
                          ? <span style={{ color: col }} className="font-600">{trader.favoriteAsset}</span>
                          : <span className="text-[#303060]">—</span>
                        }
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={trader.winRate >= 50 ? "text-[#00ff94]" : trader.winRate > 0 ? "text-[#6060a0]" : "text-[#303060]"}>
                          {trader.winRate > 0 ? `${trader.winRate}%` : "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-600" style={{
                        color: trader.totalPnl > 0 ? "#00ff94" : trader.totalPnl < 0 ? "#ff3b5c" : "#303060"
                      }}>
                        {trader.totalPnl !== 0
                          ? `${trader.totalPnl > 0 ? "+" : ""}${fmtUSD(trader.totalPnl)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {!loading && data.length === 0 && !error && (
          <div className="py-16 text-center text-[#303060] font-mono text-xs">
            No data yet — leaderboard builds from live trades
          </div>
        )}
      </div>

      <p className="mt-4 text-[9px] font-mono text-[#303060] text-center">
        Rankings computed from the most recent 300 high-volume trades · refreshes every 30s
      </p>
    </div>
  );
}
