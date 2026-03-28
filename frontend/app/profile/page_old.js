"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "../../hooks/useWallet";
import {
  getTrader, getFollowing, fmtUSD, fmtSize, fmtPnl,
  timeAgo, assetColor, avatarGradient, short,
} from "../../lib/api";
import { StatSkeleton, RowSkeleton } from "../../components/ui/Skeletons";
import TradePanel from "../../components/trading/TradePanel";

export default function ProfilePage() {
  const { address, isConnected, shortAddress } = useWallet();
  const [data, setData] = useState(null);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("trades");

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      getTrader(address, { pageSize: 100 }),
      getFollowing(address),
    ]).then(([traderRes, followRes]) => {
      setData(traderRes.data);
      setFollowing(followRes.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [address]);

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center justify-center gap-6 text-center">
        <div className="text-4xl">🔗</div>
        <h1 className="font-display font-800 text-2xl text-[#eeeeff]">Connect Your Wallet</h1>
        <p className="text-sm font-mono text-[#6060a0] max-w-sm leading-relaxed">
          Connect MetaMask, Rabby, Zerion, or any WalletConnect wallet to see your Hyperliquid trades and profile.
        </p>
        <ConnectButton label="Connect Wallet" />
        <p className="text-[10px] font-mono text-[#303060]">
          Supports HyperEVM · Arbitrum · Mainnet
        </p>
      </div>
    );
  }

  const gradStyle = { background: avatarGradient(address) };
  const stats = data?.stats;
  const fills = data?.fills || [];
  const positions = data?.positions || [];
  const pnl = stats ? fmtPnl(stats.totalPnl) : { str: "—", pos: null };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Profile header */}
      <div className="card p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex-shrink-0 ring-2 ring-[#7c6aff]/30" style={gradStyle} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-800 text-xl text-[#eeeeff]">{shortAddress}</h1>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#7c6aff]/30 text-[#7c6aff] bg-[#7c6aff]/8">YOU</span>
            </div>
            <p className="text-[10px] font-mono text-[#303060] break-all">{address}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] font-mono text-[#6060a0]">{following.length} following</span>
              {data?.accountValue > 0 && (
                <span className="text-[11px] font-mono text-[#7c6aff]">
                  {fmtUSD(data.accountValue)} account value
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://app.hyperliquid.xyz/explorer/address/${address}`}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg text-xs font-mono btn-outline"
          >
            HL Explorer ↗
          </a>
          <Link href={`/trader/${address}`} className="px-3 py-2 rounded-lg text-xs font-600 btn-primary text-center">
            Public Profile
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <StatSkeleton key={i} />)}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Total Trades", stats.totalTrades.toLocaleString(), false, false],
                ["Total Volume", fmtUSD(stats.totalVolume), true, false],
                ["Realized PnL", pnl.str, pnl.pos === true, pnl.pos === false],
                ["Win Rate", `${stats.winRate}%`, stats.winRate >= 50, false],
                ["Avg Trade", fmtUSD(stats.avgTradeSize), false, false],
                ["Fav Asset", stats.favoriteAsset || "—", false, false],
                ["Longs", stats.longsCount, true, false],
                ["Shorts", stats.shortsCount, false, true],
              ].map(([label, value, accent, red]) => (
                <div key={label} className="card p-4">
                  <p className="text-[9px] font-mono text-[#303060] uppercase tracking-widest mb-1.5">{label}</p>
                  <p className={`text-lg font-display font-700 ${accent ? "text-[#00ff94]" : red ? "text-[#ff3b5c]" : "text-[#eeeeff]"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-[#303060] font-mono text-sm">
              No Hyperliquid trading history found for this wallet.
            </div>
          )}

          {/* Tabs */}
          <div>
            <div className="flex gap-1 mb-3 bg-[#080810] border border-[#16162a] rounded-lg p-1 w-fit">
              {[
                ["trades", `My Trades (${fills.length})`],
                ["positions", `Positions (${positions.length})`],
                ["following", `Following (${following.length})`],
              ].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
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

            {tab === "trades" && (
              <div className="card overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#16162a]">
                      {["Asset","Side","Price","Size","Notional","PnL","Fee","Time"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-400 text-[#303060] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={8} />)
                      : fills.length === 0
                      ? <tr><td colSpan={8} className="px-4 py-10 text-center text-[#303060]">No trades found</td></tr>
                      : fills.slice(0, 50).map((f) => {
                          const color = assetColor(f.asset);
                          const p = fmtPnl(f.closedPnl);
                          return (
                            <tr key={f.id} className="border-b border-[#16162a] hover:bg-[#080810] transition-colors">
                              <td className="px-4 py-3"><span style={{ color }} className="font-600">{f.asset}</span></td>
                              <td className="px-4 py-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-600 ${f.side === "LONG" ? "badge-long" : "badge-short"}`}>
                                  {f.side === "LONG" ? "▲ L" : "▼ S"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#6060a0]">{fmtUSD(f.price, 2).replace("$","")}</td>
                              <td className="px-4 py-3 text-[#eeeeff]">{fmtSize(f.size)}</td>
                              <td className="px-4 py-3 text-[#6060a0]">{fmtUSD(f.notional)}</td>
                              <td className="px-4 py-3 font-600" style={{ color: p.pos === true ? "#00ff94" : p.pos === false ? "#ff3b5c" : "#303060" }}>
                                {p.str}
                              </td>
                              <td className="px-4 py-3 text-[#303060]">
                                {f.fee ? fmtUSD(f.fee, 3) : "—"}
                              </td>
                              <td className="px-4 py-3 text-[#303060]">{timeAgo(f.timestamp)}</td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            )}

            {tab === "positions" && (
              <div className="card overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#16162a]">
                      {["Asset","Side","Size","Entry","Mark","Unr. PnL","Liq. Price","Lev."].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-400 text-[#303060] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.length === 0
                      ? <tr><td colSpan={8} className="px-4 py-10 text-center text-[#303060]">No open positions</td></tr>
                      : positions.map((p) => {
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
                        })
                    }
                  </tbody>
                </table>
              </div>
            )}

            {tab === "following" && (
              <div className="space-y-2">
                {following.length === 0 ? (
                  <div className="card p-8 text-center text-[#303060] font-mono text-xs">
                    You're not following any traders yet.
                    <br />
                    <Link href="/" className="text-[#7c6aff] hover:underline mt-2 inline-block">
                      Browse the feed →
                    </Link>
                  </div>
                ) : following.map((addr) => (
                  <Link key={addr} href={`/trader/${addr}`}
                    className="card card-hover p-4 flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: avatarGradient(addr) }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-[#6060a0] group-hover:text-[#7c6aff] transition-colors">
                        {short(addr)}
                      </p>
                      <p className="text-[9px] font-mono text-[#303060] mt-0.5 truncate">{addr}</p>
                    </div>
                    <span className="text-[#303060] text-xs">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trade panel sidebar */}
        <div className="space-y-4">
          <TradePanel defaultAsset={stats?.favoriteAsset || "ETH"} />

          {/* Fee info */}
          <div className="card p-4">
            <p className="text-[10px] font-mono text-[#303060] uppercase tracking-widest mb-2">Hayai Fee</p>
            <p className="text-lg font-display font-700 text-[#7c6aff]">0.1%</p>
            <p className="text-[10px] font-mono text-[#6060a0] mt-1 leading-relaxed">
              All trades through Hayai include a 0.1% builder fee collected by the platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
