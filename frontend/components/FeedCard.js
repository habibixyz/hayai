"use client";
import Link from "next/link";
import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { short, fmtUSD, fmtSize, timeAgo, assetColor } from "../lib/api";
import { buildSignedOrder, submitOrderViaHayai } from "../lib/trading";
import { getTradeMeta } from "../lib/api";

export default function FeedCard({ trade, index = 0 }) {
  const { address, isConnected, signTypedDataAsync } = useWallet();
  const [copyState, setCopyState] = useState("idle"); // idle | signing | done | error
  const [copyMsg, setCopyMsg] = useState("");

  const isLong = trade.side === "LONG";
  const color = assetColor(trade.asset);
  const pnlFmt = trade.closedPnl
    ? { str: `${trade.closedPnl > 0 ? "+" : ""}${fmtUSD(trade.closedPnl)}`, pos: trade.closedPnl > 0 }
    : null;

  async function handleCopyTrade() {
    if (!isConnected) {
      setCopyMsg("Connect wallet first");
      setTimeout(() => setCopyMsg(""), 2500);
      return;
    }
    setCopyState("signing");
    try {
      // Fetch asset index for this coin
      const metaRes = await getTradeMeta();
      const assetInfo = metaRes?.data?.assetMap?.[trade.asset];
      if (!assetInfo) throw new Error(`Asset ${trade.asset} not found in meta`);

      const price = parseFloat(metaRes.data.mids?.[trade.asset] || trade.price);
      // Slippage: 0.5% for longs (buy higher), 0.5% for shorts (sell lower)
      const limitPrice = isLong ? price * 1.005 : price * 0.995;

      const signedPayload = await buildSignedOrder({
        signTypedDataAsync,
        address,
        assetIndex: assetInfo.index,
        isBuy: isLong,
        limitPrice,
        size: trade.size,
        orderType: "FrontendMarket",
      });

      const result = await submitOrderViaHayai(signedPayload, address);

      if (result.success && result.data?.status === "ok") {
        setCopyState("done");
        setCopyMsg("Order placed ✓");
      } else {
        setCopyState("error");
        setCopyMsg(result.data?.response?.data?.statuses?.[0] || "Order failed");
      }
    } catch (e) {
      setCopyState("error");
      setCopyMsg(e.message?.slice(0, 40) || "Error");
    }
    setTimeout(() => { setCopyState("idle"); setCopyMsg(""); }, 3000);
  }

  return (
    <div
      className="card card-hover group animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 25, 300)}ms`, animationFillMode: "both" }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Asset circle */}
          <div className="flex-shrink-0 mt-0.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-mono font-600 flex-shrink-0"
              style={{ background: `${color}18`, border: `1.5px solid ${color}35`, color }}
            >
              {trade.asset.slice(0, 3)}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {/* Trader + badges row */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <Link
                    href={`/trader/${trade.trader}`}
                    className="text-[11px] font-mono text-[#6060a0] hover:text-[#7c6aff] transition-colors"
                  >
                    {short(trade.trader)}
                  </Link>
                  {trade.isWhale && (
                    <span className="badge-whale text-[9px] font-mono px-1.5 py-0.5 rounded">
                      🐳 WHALE
                    </span>
                  )}
                </div>

                {/* Trade details */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-mono font-600 px-2 py-0.5 rounded ${isLong ? "badge-long" : "badge-short"}`}>
                    {isLong ? "▲ LONG" : "▼ SHORT"}
                  </span>
                  <span className="font-display font-700 text-[15px] text-[#eeeeff]" style={{ color }}>
                    {trade.asset}
                  </span>
                  <span className="font-mono text-[14px] text-[#eeeeff] font-500">
                    {fmtSize(trade.size)}
                  </span>
                </div>

                {/* Price + notional */}
                <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-[#6060a0]">
                  <span>@ {fmtUSD(trade.price, trade.price >= 100 ? 1 : 3).replace("$", "")}</span>
                  <span className="text-[#303060]">·</span>
                  <span className="font-600" style={{ color: trade.notional >= 100000 ? "#ffd700" : "#eeeeff" }}>
                    {fmtUSD(trade.notional)} notional
                  </span>
                  {pnlFmt && (
                    <>
                      <span className="text-[#303060]">·</span>
                      <span className={pnlFmt.pos ? "text-green-400" : "text-red-400"} style={{ color: pnlFmt.pos ? "#00ff94" : "#ff3b5c" }}>
                        {pnlFmt.str} PnL
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right: time + actions */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-[#303060]">{timeAgo(trade.timestamp)}</span>

                <button
                  onClick={handleCopyTrade}
                  disabled={copyState === "signing"}
                  className={`text-[10px] font-mono px-2.5 py-1.5 rounded border transition-all whitespace-nowrap ${
                    copyState === "done"
                      ? "border-[#00ff94]/40 text-[#00ff94] bg-[#00ff94]/8"
                      : copyState === "error"
                      ? "border-[#ff3b5c]/40 text-[#ff3b5c] bg-[#ff3b5c]/8"
                      : copyState === "signing"
                      ? "border-[#7c6aff]/40 text-[#7c6aff] bg-[#7c6aff]/8 cursor-wait"
                      : "border-[#16162a] text-[#6060a0] hover:border-[#7c6aff]/40 hover:text-[#7c6aff] hover:bg-[#7c6aff]/5 cursor-pointer"
                  }`}
                >
                  {copyState === "signing" ? "Signing…" :
                   copyState === "done" ? "✓ Placed" :
                   copyState === "error" ? "✗ Failed" :
                   "Copy Trade"}
                </button>

                {copyMsg && (
                  <span className={`text-[9px] font-mono max-w-[100px] text-right leading-tight ${
                    copyState === "error" ? "text-[#ff3b5c]" : "text-[#6060a0]"
                  }`}>
                    {copyMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
