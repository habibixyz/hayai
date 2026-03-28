import { hlInfo, round, LIVE_HEADERS } from "../../_hl";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [metaAndCtx, allMids] = await Promise.all([
      hlInfo({ type: "metaAndAssetCtxs" }),
      hlInfo({ type: "allMids" }),
    ]);

    const universe = metaAndCtx[0]?.universe || [];
    const contexts = metaAndCtx[1] || [];

    const markets = universe.map((asset, i) => {
      const ctx       = contexts[i] || {};
      const mid       = parseFloat(allMids[asset.name] || 0);
      const markPx    = parseFloat(ctx.markPx    || mid);
      const prevDayPx = parseFloat(ctx.prevDayPx || markPx);
      const change24h = prevDayPx > 0 ? round(((markPx - prevDayPx) / prevDayPx) * 100) : 0;

      return {
        asset:        asset.name,
        mid:          round(mid, mid >= 100 ? 2 : 5),
        markPx:       round(markPx, markPx >= 100 ? 2 : 5),
        change24h,
        volume24h:    round(parseFloat(ctx.dayNtlVlm    || 0)),
        openInterest: round(parseFloat(ctx.openInterest || 0) * markPx),
        funding:      round(parseFloat(ctx.funding      || 0) * 100, 4),
        maxLeverage:  asset.maxLeverage || 50,
        isPump: change24h > 5,
        isDump: change24h < -5,
      };
    })
      .filter(m => m.mid > 0)
      .sort((a, b) => b.volume24h - a.volume24h);

    return new Response(
      JSON.stringify({ success: true, count: markets.length, data: markets }),
      { headers: LIVE_HEADERS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
