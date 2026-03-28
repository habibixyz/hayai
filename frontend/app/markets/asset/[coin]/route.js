import { hlInfo, round, LIVE_HEADERS } from "../../../_hl";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const coin = params.coin.toUpperCase();
  try {
    const [metaAndCtx, allMids, orderBook, recentTrades] = await Promise.allSettled([
      hlInfo({ type: "metaAndAssetCtxs" }),
      hlInfo({ type: "allMids" }),
      hlInfo({ type: "l2Book", coin }),
      hlInfo({ type: "recentTrades", coin }),
    ]);

    const universe = metaAndCtx.value?.[0]?.universe || [];
    const contexts = metaAndCtx.value?.[1] || [];
    const idx      = universe.findIndex(u => u.name === coin);
    const ctx      = contexts[idx] || {};
    const mid      = parseFloat(allMids.value?.[coin] || 0);
    const markPx   = parseFloat(ctx.markPx || mid);
    const prev     = parseFloat(ctx.prevDayPx || markPx);

    const book = orderBook.value || { levels: [[], []] };
    const bids = (book.levels[0] || []).slice(0, 15).map(l => ({
      price: parseFloat(l.px), size: parseFloat(l.sz), n: l.n,
    }));
    const asks = (book.levels[1] || []).slice(0, 15).map(l => ({
      price: parseFloat(l.px), size: parseFloat(l.sz), n: l.n,
    }));

    const trades = (recentTrades.value || []).slice(0, 50).map(t => ({
      side:     t.side === "B" ? "BUY" : "SELL",
      price:    parseFloat(t.px),
      size:     parseFloat(t.sz),
      notional: parseFloat(t.px) * parseFloat(t.sz),
      time:     t.time,
    }));

    const data = {
      asset:        coin,
      mid:          round(mid, mid >= 100 ? 2 : 5),
      markPx:       round(markPx, markPx >= 100 ? 2 : 5),
      change24h:    prev > 0 ? round(((markPx - prev) / prev) * 100) : 0,
      high24h:      round(parseFloat(ctx.highPx || 0), markPx >= 100 ? 2 : 5),
      low24h:       round(parseFloat(ctx.lowPx  || 0), markPx >= 100 ? 2 : 5),
      volume24h:    round(parseFloat(ctx.dayNtlVlm    || 0)),
      openInterest: round(parseFloat(ctx.openInterest || 0) * markPx),
      funding:      round(parseFloat(ctx.funding || 0) * 100, 6),
      maxLeverage:  universe[idx]?.maxLeverage || 50,
      orderBook:    { bids, asks },
      recentTrades: trades,
    };

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: LIVE_HEADERS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
