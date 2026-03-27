const express = require("express");
const router = express.Router();
const axios = require("axios");
const NodeCache = require("node-cache");

const HL_API = process.env.HL_API_URL || "https://api.hyperliquid.xyz/info";
const shortCache = new NodeCache({ stdTTL: 8 });
const medCache   = new NodeCache({ stdTTL: 15 });
const longCache  = new NodeCache({ stdTTL: 60 });

async function hlInfo(body) {
  const res = await axios.post(HL_API, body, {
    headers: { "Content-Type": "application/json" },
    timeout: 8000,
  });
  return res.data;
}

function round(n, d = 2) { return Math.round((n || 0) * 10 ** d) / 10 ** d; }

router.get("/overview", async (req, res) => {
  const key = "markets:overview";
  const cached = shortCache.get(key);
  if (cached) return res.json(cached);
  try {
    const [metaAndCtx, allMids] = await Promise.all([
      hlInfo({ type: "metaAndAssetCtxs" }),
      hlInfo({ type: "allMids" }),
    ]);
    const universe = metaAndCtx[0]?.universe || [];
    const contexts = metaAndCtx[1] || [];
    const markets = universe.map((asset, i) => {
      const ctx = contexts[i] || {};
      const mid       = parseFloat(allMids[asset.name] || 0);
      const markPx    = parseFloat(ctx.markPx    || mid);
      const prevDayPx = parseFloat(ctx.prevDayPx || markPx);
      const change24h = prevDayPx > 0 ? round(((markPx - prevDayPx) / prevDayPx) * 100) : 0;
      const funding   = round(parseFloat(ctx.funding || 0) * 100, 4);
      const openInterest = round(parseFloat(ctx.openInterest || 0) * markPx);
      const volume24h    = round(parseFloat(ctx.dayNtlVlm || 0));
      return {
        asset: asset.name,
        mid: round(mid, mid >= 100 ? 2 : 5),
        markPx: round(markPx, markPx >= 100 ? 2 : 5),
        change24h, volume24h, openInterest, funding,
        maxLeverage: asset.maxLeverage || 50,
        isPump: change24h > 5,
        isDump: change24h < -5,
      };
    }).filter(m => m.mid > 0).sort((a, b) => b.volume24h - a.volume24h);
    const result = { success: true, count: markets.length, data: markets };
    shortCache.set(key, result);
    res.json(result);
  } catch (e) {
    console.error("[markets/overview]", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/asset/:coin", async (req, res) => {
  const coin = req.params.coin.toUpperCase();
  const key  = "markets:asset:" + coin;
  const cached = shortCache.get(key);
  if (cached) return res.json(cached);
  try {
    const [metaAndCtx, allMids, orderBook, recentTrades] = await Promise.allSettled([
      hlInfo({ type: "metaAndAssetCtxs" }),
      hlInfo({ type: "allMids" }),
      hlInfo({ type: "l2Book", coin }),
      hlInfo({ type: "recentTrades", coin }),
    ]);
    const universe = metaAndCtx.value?.[0]?.universe || [];
    const contexts = metaAndCtx.value?.[1] || [];
    const assetIdx = universe.findIndex(u => u.name === coin);
    const ctx      = contexts[assetIdx] || {};
    const mid      = parseFloat(allMids.value?.[coin] || 0);
    const markPx   = parseFloat(ctx.markPx || mid);
    const prevDay  = parseFloat(ctx.prevDayPx || markPx);
    const book = orderBook.value || { levels: [[], []] };
    const bids = (book.levels[0] || []).slice(0, 15).map(l => ({ price: parseFloat(l.px), size: parseFloat(l.sz), n: l.n }));
    const asks = (book.levels[1] || []).slice(0, 15).map(l => ({ price: parseFloat(l.px), size: parseFloat(l.sz), n: l.n }));
    const trades = (recentTrades.value || []).slice(0, 50).map(t => ({
      tid: t.tid, side: t.side === "B" ? "BUY" : "SELL",
      price: parseFloat(t.px), size: parseFloat(t.sz),
      notional: parseFloat(t.px) * parseFloat(t.sz), time: t.time,
    }));
    const result = {
      success: true,
      data: {
        asset: coin,
        mid:          round(mid, mid >= 100 ? 2 : 5),
        markPx:       round(markPx, markPx >= 100 ? 2 : 5),
        change24h:    prevDay > 0 ? round(((markPx - prevDay) / prevDay) * 100) : 0,
        high24h:      round(parseFloat(ctx.highPx || 0), markPx >= 100 ? 2 : 5),
        low24h:       round(parseFloat(ctx.lowPx  || 0), markPx >= 100 ? 2 : 5),
        volume24h:    round(parseFloat(ctx.dayNtlVlm || 0)),
        openInterest: round(parseFloat(ctx.openInterest || 0) * markPx),
        funding:      round(parseFloat(ctx.funding || 0) * 100, 6),
        maxLeverage:  universe[assetIdx]?.maxLeverage || 50,
        orderBook: { bids, asks },
        recentTrades: trades,
      },
    };
    shortCache.set(key, result);
    res.json(result);
  } catch (e) {
    console.error("[markets/asset/" + coin + "]", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/funding", async (req, res) => {
  const key = "markets:funding";
  const cached = medCache.get(key);
  if (cached) return res.json(cached);
  try {
    const [metaAndCtx, allMids] = await Promise.all([
      hlInfo({ type: "metaAndAssetCtxs" }),
      hlInfo({ type: "allMids" }),
    ]);
    const universe = metaAndCtx[0]?.universe || [];
    const contexts = metaAndCtx[1] || [];
    const rates = universe.map((asset, i) => {
      const ctx     = contexts[i] || {};
      const funding = parseFloat(ctx.funding || 0);
      const mid     = parseFloat(allMids[asset.name] || 0);
      const oi      = parseFloat(ctx.openInterest || 0) * mid;
      return {
        asset: asset.name,
        funding8h:     round(funding * 100, 5),
        fundingAnnual: round(funding * 100 * 3 * 365, 2),
        openInterest:  round(oi),
        mid:           round(mid, mid >= 100 ? 2 : 5),
        sentiment:     funding > 0.0001 ? "LONG_HEAVY" : funding < -0.0001 ? "SHORT_HEAVY" : "NEUTRAL",
      };
    }).filter(a => a.mid > 0).sort((a, b) => Math.abs(b.funding8h) - Math.abs(a.funding8h));
    const result = { success: true, count: rates.length, data: rates };
    medCache.set(key, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/liquidations", async (req, res) => {
  const key = "markets:liquidations";
  const cached = shortCache.get(key);
  if (cached) return res.json(cached);
  try {
    const COINS = ["BTC","ETH","SOL","HYPE","ARB","AVAX","DOGE","WIF","PEPE","SUI","LINK","INJ"];
    const MIN_LIQ_NOTIONAL = 5000;
    const fetched = await Promise.allSettled(
      COINS.map(coin => hlInfo({ type: "recentTrades", coin }))
    );
    const allLiqs = [];
    fetched.forEach((item, i) => {
      if (item.status !== "fulfilled") return;
      const coin = COINS[i];
      (item.value || []).forEach(t => {
        const notional = parseFloat(t.px) * parseFloat(t.sz);
        if (notional >= MIN_LIQ_NOTIONAL) {
          allLiqs.push({
            asset:    coin,
            side:     t.side === "B" ? "SHORT_LIQ" : "LONG_LIQ",
            price:    parseFloat(t.px),
            size:     parseFloat(t.sz),
            notional: round(notional),
            time:     t.time,
            isWhale:  notional >= 100000,
          });
        }
      });
    });
    allLiqs.sort((a, b) => b.notional - a.notional);
    const result = { success: true, count: allLiqs.length, data: allLiqs.slice(0, 100) };
    shortCache.set(key, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/whales", async (req, res) => {
  const key = "markets:whales";
  const cached = shortCache.get(key);
  if (cached) return res.json(cached);
  try {
    const COINS = ["BTC","ETH","SOL","HYPE","ARB","AVAX","DOGE","WIF","PEPE","SUI","LINK","INJ","TIA","APT"];
    const fetched = await Promise.allSettled(
      COINS.map(coin => hlInfo({ type: "recentTrades", coin }))
    );
    const whales = [];
    fetched.forEach((item, i) => {
      if (item.status !== "fulfilled") return;
      const coin = COINS[i];
      (item.value || []).forEach(t => {
        const notional = parseFloat(t.px) * parseFloat(t.sz);
        if (notional >= 50000) {
          whales.push({
            asset:    coin,
            side:     t.side === "B" ? "BUY" : "SELL",
            price:    parseFloat(t.px),
            size:     parseFloat(t.sz),
            notional: round(notional),
            time:     t.time,
            tier:     notional >= 500000 ? "MEGA" : notional >= 200000 ? "LARGE" : "WHALE",
          });
        }
      });
    });
    whales.sort((a, b) => b.notional - a.notional);
    const result = { success: true, count: whales.length, data: whales.slice(0, 100) };
    shortCache.set(key, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;