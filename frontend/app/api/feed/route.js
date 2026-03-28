import { hlInfo, round, LIVE_HEADERS } from "../_hl";

export const dynamic = "force-dynamic";

const ALL_COINS = ["BTC","ETH","SOL","HYPE","ARB","AVAX","DOGE","WIF","PEPE","SUI","LINK","INJ","TIA","APT","XRP","ENA","NEAR","OP"];

function pseudoAddress(tid, coin) {
  let h = 0x811c9dc5;
  const s = `${tid}${coin}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `0x${h.toString(16).padStart(8,"0")}${"0".repeat(32)}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const coin        = searchParams.get("coin")?.toUpperCase();
  const minNotional = parseInt(searchParams.get("minNotional") || "1000");
  const limit       = Math.min(parseInt(searchParams.get("limit") || "60"), 150);

  const COINS = coin && ALL_COINS.includes(coin) ? [coin] : ALL_COINS.slice(0, 12);

  try {
    const fetched = await Promise.allSettled(
      COINS.map(c => hlInfo({ type: "recentTrades", coin: c }))
    );

    const trades = [];
    fetched.forEach(function(item, i) {
      if (item.status !== "fulfilled") return;
      const c = COINS[i];
      (item.value || []).forEach(function(t) {
        const price    = parseFloat(t.px);
        const size     = parseFloat(t.sz);
        const notional = price * size;
        if (notional >= minNotional) {
          trades.push({
            id:       `${c}-${t.tid}`,
            tid:      t.tid,
            asset:    c,
            side:     t.side === "B" ? "LONG" : "SHORT",
            price,
            size,
            notional: round(notional),
            isWhale:  notional >= 100000,
            timestamp: t.time,
            trader:   pseudoAddress(t.tid, c),
          });
        }
      });
    });

    trades.sort(function(a, b) { return b.timestamp - a.timestamp; });

    return new Response(
      JSON.stringify({ success: true, count: trades.length, data: trades.slice(0, limit) }),
      { headers: LIVE_HEADERS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
