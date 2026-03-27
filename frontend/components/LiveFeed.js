"use client";
import { useState } from "react";
import FeedCard from "./FeedCard";
import { CardSkeleton } from "./ui/Skeletons";
import { useFeed } from "../hooks/useFeed";
import { fmtUSD } from "../lib/api";

const COINS = ["ALL","BTC","ETH","SOL","HYPE","ARB","AVAX","DOGE","WIF","PEPE","SUI","LINK","INJ","OP"];
const FILTERS = [
  { label: "$5K+",   value: 5000 },
  { label: "$25K+",  value: 25000 },
  { label: "$100K+", value: 100000 },
  { label: "$500K+", value: 500000 },
];
const PAGE_SIZE = 20;

export default function LiveFeed() {
  const [coin, setCoin] = useState("ALL");
  const [minNotional, setMinNotional] = useState(5000);
  const [page, setPage] = useState(1);

  const { trades, loading, error, newCount, paused, setPaused, flush } = useFeed({
    coin: coin === "ALL" ? undefined : coin,
    minNotional,
  });

  const visible = trades.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < trades.length;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-2 mb-4">
        {/* Coin filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {COINS.map((c) => (
            <button
              key={c}
              onClick={() => { setCoin(c); setPage(1); }}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${
                coin === c
                  ? "border-[#7c6aff]/50 text-[#7c6aff] bg-[#7c6aff]/10"
                  : "border-[#16162a] text-[#6060a0] hover:border-[#252540] hover:text-[#eeeeff]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Volume filter + pause */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-[#303060] mr-1">Min size:</span>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setMinNotional(f.value); setPage(1); }}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${
                minNotional === f.value
                  ? "border-[#00ff94]/40 text-[#00ff94] bg-[#00ff94]/8"
                  : "border-[#16162a] text-[#6060a0] hover:border-[#252540] hover:text-[#eeeeff]"
              }`}
            >
              {f.label}
            </button>
          ))}

          <div className="flex-1" />

          <div className="text-[10px] font-mono text-[#303060]">
            {trades.length} trades
          </div>

          <button
            onClick={() => setPaused((v) => !v)}
            className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${
              paused
                ? "border-[#ffd700]/40 text-[#ffd700] bg-[#ffd700]/8"
                : "border-[#16162a] text-[#303060] hover:text-[#6060a0]"
            }`}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      {/* New trades banner */}
      {newCount > 0 && !paused && (
        <button
          onClick={() => { flush(); setPage(1); }}
          className="w-full mb-3 py-2 text-[11px] font-mono text-[#7c6aff] bg-[#7c6aff]/8 border border-[#7c6aff]/20 rounded-lg hover:bg-[#7c6aff]/12 transition-all animate-fade-in"
        >
          ↑ {newCount} new trade{newCount !== 1 ? "s" : ""} above {fmtUSD(minNotional)} — tap to refresh
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 px-4 py-2.5 bg-[#ff3b5c]/8 border border-[#ff3b5c]/20 rounded-lg text-[11px] font-mono text-[#ff3b5c]">
          ⚠ {error} — retrying…
        </div>
      )}

      {/* Feed */}
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : visible.map((t, i) => <FeedCard key={t.id} trade={t} index={i} />)
        }
      </div>

      {/* Empty */}
      {!loading && trades.length === 0 && !error && (
        <div className="text-center py-20 text-[#303060] font-mono text-sm">
          <div className="text-2xl mb-3">📭</div>
          No trades above {fmtUSD(minNotional)} right now
          <br />
          <button onClick={() => setMinNotional(5000)} className="text-[#7c6aff] text-xs mt-2 hover:underline">
            Lower the threshold?
          </button>
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="w-full mt-4 py-3 text-[11px] font-mono text-[#6060a0] border border-[#16162a] rounded-lg hover:border-[#252540] hover:text-[#eeeeff] transition-all"
        >
          Show more ({trades.length - visible.length} remaining)
        </button>
      )}
    </div>
  );
}
