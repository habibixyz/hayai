"use client";
import { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { buildSignedOrder, submitOrderViaHayai } from "../../lib/trading";
import { getTradeMeta, fmtUSD } from "../../lib/api";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const LEVERAGES = [1, 2, 5, 10, 20, 50];

export default function TradePanel({ defaultAsset = "ETH" }) {
  const { address, isConnected, signTypedDataAsync } = useWallet();
  const [asset, setAsset] = useState(defaultAsset);
  const [side, setSide] = useState("LONG");
  const [size, setSize] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [orderType, setOrderType] = useState("FrontendMarket");
  const [limitPrice, setLimitPrice] = useState("");
  const [midPrice, setMidPrice] = useState(null);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState(null); // null | loading | success | error
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    getTradeMeta().then((res) => {
      setMeta(res.data);
      const mid = parseFloat(res.data?.mids?.[asset] || 0);
      setMidPrice(mid);
    }).catch(() => {});
  }, [asset]);

  const notional = midPrice && size ? midPrice * parseFloat(size || 0) : 0;
  const hayaiFee = notional * 0.001; // 0.1%

  async function placeOrder() {
    if (!isConnected || !address) return;
    if (!size || isNaN(parseFloat(size))) return setStatusMsg("Enter a valid size");

    setStatus("loading");
    setStatusMsg("Waiting for signature…");

    try {
      const assetInfo = meta?.assetMap?.[asset];
      if (!assetInfo) throw new Error(`Asset ${asset} not in meta`);

      const mid = parseFloat(meta?.mids?.[asset] || 0);
      const price = orderType === "FrontendMarket"
        ? (side === "LONG" ? mid * 1.01 : mid * 0.99)
        : parseFloat(limitPrice);

      if (!price || price <= 0) throw new Error("Invalid price");

      const isBuy = side === "LONG";
      const signedPayload = await buildSignedOrder({
        signTypedDataAsync,
        address,
        assetIndex: assetInfo.index,
        isBuy,
        limitPrice: price,
        size: parseFloat(size),
        orderType,
      });

      setStatusMsg("Submitting order…");
      const result = await submitOrderViaHayai(signedPayload, address);

      if (result.success && result.data?.status === "ok") {
        setStatus("success");
        const filled = result.data?.response?.data?.statuses?.[0];
        setStatusMsg(typeof filled === "object" && filled?.filled
          ? `Filled ${filled.filled.totalSz} @ ${fmtUSD(parseFloat(filled.filled.avgPx))}`
          : "Order placed successfully");
        setSize("");
      } else {
        throw new Error(result.data?.response?.data?.statuses?.[0] || "Order rejected");
      }
    } catch (e) {
      setStatus("error");
      setStatusMsg(e.message?.slice(0, 80) || "Order failed");
    }

    setTimeout(() => { setStatus(null); setStatusMsg(""); }, 5000);
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-700 text-sm text-[#eeeeff]">Place Order</h3>
        <span className="text-[10px] font-mono text-[#303060] bg-[#7c6aff]/8 border border-[#7c6aff]/15 px-2 py-0.5 rounded">
          0.1% Hayai fee
        </span>
      </div>

      {/* Asset selector */}
      <div>
        <label className="text-[10px] font-mono text-[#303060] uppercase tracking-wider mb-1.5 block">Asset</label>
        <input
          className="input-field"
          value={asset}
          onChange={(e) => setAsset(e.target.value.toUpperCase())}
          placeholder="BTC, ETH, SOL…"
        />
        {midPrice > 0 && (
          <p className="text-[10px] font-mono text-[#6060a0] mt-1">
            Mid: {fmtUSD(midPrice, midPrice >= 100 ? 1 : 4).replace("$", "")} USDC
          </p>
        )}
      </div>

      {/* Side */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("LONG")}
          className={`py-2.5 rounded-lg text-sm font-700 border transition-all ${
            side === "LONG"
              ? "bg-[#00ff94]/15 border-[#00ff94]/40 text-[#00ff94]"
              : "border-[#16162a] text-[#6060a0] hover:border-[#252540]"
          }`}
        >
          ▲ LONG
        </button>
        <button
          onClick={() => setSide("SHORT")}
          className={`py-2.5 rounded-lg text-sm font-700 border transition-all ${
            side === "SHORT"
              ? "bg-[#ff3b5c]/15 border-[#ff3b5c]/40 text-[#ff3b5c]"
              : "border-[#16162a] text-[#6060a0] hover:border-[#252540]"
          }`}
        >
          ▼ SHORT
        </button>
      </div>

      {/* Order type */}
      <div className="flex gap-1 bg-[#080810] border border-[#16162a] rounded-lg p-1">
        {[["FrontendMarket","Market"],["Gtc","Limit"],["Ioc","IOC"]].map(([v,l]) => (
          <button
            key={v}
            onClick={() => setOrderType(v)}
            className={`flex-1 py-1.5 rounded text-[11px] font-mono transition-all ${
              orderType === v
                ? "bg-[#7c6aff]/15 text-[#7c6aff] border border-[#7c6aff]/25"
                : "text-[#6060a0] hover:text-[#eeeeff]"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Size */}
      <div>
        <label className="text-[10px] font-mono text-[#303060] uppercase tracking-wider mb-1.5 block">Size</label>
        <input
          className="input-field"
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0.001"
          step="0.001"
          min="0"
        />
        {notional > 0 && (
          <p className="text-[10px] font-mono text-[#6060a0] mt-1">
            ≈ {fmtUSD(notional)} notional · {fmtUSD(hayaiFee)} fee
          </p>
        )}
      </div>

      {/* Limit price (if not market) */}
      {orderType !== "FrontendMarket" && (
        <div>
          <label className="text-[10px] font-mono text-[#303060] uppercase tracking-wider mb-1.5 block">
            Limit Price (USDC)
          </label>
          <input
            className="input-field"
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={midPrice ? midPrice.toFixed(2) : "0.00"}
          />
        </div>
      )}

      {/* Leverage */}
      <div>
        <label className="text-[10px] font-mono text-[#303060] uppercase tracking-wider mb-1.5 block">
          Leverage: {leverage}x
        </label>
        <div className="flex gap-1">
          {LEVERAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLeverage(l)}
              className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all ${
                leverage === l
                  ? "border-[#7c6aff]/40 text-[#7c6aff] bg-[#7c6aff]/10"
                  : "border-[#16162a] text-[#303060] hover:border-[#252540] hover:text-[#6060a0]"
              }`}
            >
              {l}x
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      {isConnected ? (
        <button
          onClick={placeOrder}
          disabled={status === "loading" || !size}
          className={`btn-primary w-full py-3 text-sm font-700 ${
            side === "LONG" ? "bg-[#00ff94] text-[#04040a]" : "bg-[#ff3b5c] text-white"
          } ${(status === "loading" || !size) ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{ background: side === "LONG" ? "#00ff94" : "#ff3b5c" }}
        >
          {status === "loading"
            ? statusMsg || "Processing…"
            : `${side} ${asset}${size ? ` ${size}` : ""}`}
        </button>
      ) : (
        <div className="flex justify-center">
          <ConnectButton label="Connect to Trade" />
        </div>
      )}

      {/* Status message */}
      {status && status !== "loading" && (
        <div className={`text-[11px] font-mono px-3 py-2 rounded border animate-fade-in ${
          status === "success"
            ? "text-[#00ff94] bg-[#00ff94]/8 border-[#00ff94]/20"
            : "text-[#ff3b5c] bg-[#ff3b5c]/8 border-[#ff3b5c]/20"
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[9px] font-mono text-[#303060] text-center leading-relaxed">
        Orders are placed on Hyperliquid. A 0.1% builder fee goes to Hayai.
        Trading perpetuals involves significant risk of loss.
      </p>
    </div>
  );
}