const axios = require("axios");
const NodeCache = require("node-cache");

const HL_API = process.env.HL_API_URL || "https://api.hyperliquid.xyz/info";
const HL_EXCHANGE = process.env.HL_EXCHANGE_URL || "https://api.hyperliquid.xyz/exchange";

// Cache layers
const shortCache = new NodeCache({ stdTTL: 4 });   // feed data
const medCache = new NodeCache({ stdTTL: 15 });    // trader stats
const longCache = new NodeCache({ stdTTL: 60 });   // meta/leaderboard

const TRACKED_COINS = [
  "BTC","ETH","SOL","HYPE","ARB","AVAX",
  "DOGE","WIF","PEPE","SUI","TIA","INJ",
  "OP","LINK","APT","LTC","ATOM","NEAR",
  "XRP","ONDO","ENA","TAO","SEI","STRK",
];

// Minimum notional (USD) to appear in feed — filters noise trades
const MIN_NOTIONAL = 1000;
// Minimum notional for "whale" badge
const WHALE_NOTIONAL = 100000;

async function hlInfo(body) {
  const res = await axios.post(HL_API, body, {
    headers: { "Content-Type": "application/json" },
    timeout: 8000,
  });
  return res.data;
}

async function hlExchange(body) {
  const res = await axios.post(HL_EXCHANGE, body, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
  });
  return res.data;
}

// ── Meta (asset index map) ─────────────────────────────────────────────────
async function getMeta() {
  const key = "meta";
  let cached = longCache.get(key);
  if (cached) return cached;
  const data = await hlInfo({ type: "meta" });
  longCache.set(key, data);
  return data;
}

async function getAssetIndex(coin) {
  const meta = await getMeta();
  const idx = meta.universe?.findIndex((u) => u.name === coin);
  return idx >= 0 ? idx : null;
}

// ── All Mids ───────────────────────────────────────────────────────────────
async function getAllMids() {
  const key = "allMids";
  let cached = shortCache.get(key);
  if (cached) return cached;
  const data = await hlInfo({ type: "allMids" });
  shortCache.set(key, data);
  return data;
}

// ── Recent Trades (filtered by notional) ──────────────────────────────────
async function fetchRecentTrades(coin) {
  const key = `trades:${coin}`;
  let cached = shortCache.get(key);
  if (cached) return cached;

  try {
    const mids = await getAllMids();
    const mid = parseFloat(mids[coin] || 0);
    const data = await hlInfo({ type: "recentTrades", coin });
    if (!Array.isArray(data)) return [];

    const normalized = data
      .map((t) => {
        const price = parseFloat(t.px);
        const size = parseFloat(t.sz);
        const notional = price * size;
        return {
          id: `${coin}-${t.tid}`,
          tid: t.tid,
          asset: coin,
          side: t.side === "B" ? "LONG" : "SHORT",
          price,
          size,
          notional,
          midPrice: mid,
          isWhale: notional >= WHALE_NOTIONAL,
          timestamp: t.time,
          trader: pseudoAddress(t.tid, coin),
        };
      })
      .filter((t) => t.notional >= MIN_NOTIONAL);  // only significant trades

    shortCache.set(key, normalized);
    return normalized;
  } catch (e) {
    console.error(`[HL] fetchRecentTrades(${coin}):`, e.message);
    return [];
  }
}

// ── User Fills ─────────────────────────────────────────────────────────────
async function fetchUserFills(address) {
  const key = `fills:${address}`;
  let cached = medCache.get(key);
  if (cached) return cached;

  try {
    const data = await hlInfo({ type: "userFills", user: address });
    if (!Array.isArray(data)) return [];

    const normalized = data.map((f) => ({
      id: `${f.coin}-${f.tid}`,
      tid: f.tid,
      asset: f.coin,
      side: f.side === "B" ? "LONG" : "SHORT",
      price: parseFloat(f.px),
      size: parseFloat(f.sz),
      notional: parseFloat(f.px) * parseFloat(f.sz),
      closedPnl: parseFloat(f.closedPnl || 0),
      fee: parseFloat(f.fee || 0),
      timestamp: f.time,
      trader: address,
    }));

    medCache.set(key, normalized);
    return normalized;
  } catch (e) {
    console.error(`[HL] fetchUserFills:`, e.message);
    return [];
  }
}

// ── Clearinghouse State ────────────────────────────────────────────────────
async function fetchClearinghouseState(address) {
  const key = `state:${address}`;
  let cached = medCache.get(key);
  if (cached) return cached;

  try {
    const data = await hlInfo({ type: "clearinghouseState", user: address });
    medCache.set(key, data);
    return data;
  } catch (e) {
    console.error(`[HL] clearinghouseState:`, e.message);
    return null;
  }
}

// ── Open Orders ────────────────────────────────────────────────────────────
async function fetchOpenOrders(address) {
  try {
    return await hlInfo({ type: "openOrders", user: address });
  } catch {
    return [];
  }
}

// ── Live Feed (multi-coin, high-volume only) ───────────────────────────────
async function fetchLiveFeed(limit = 80) {
  const key = `feed:${limit}`;
  let cached = shortCache.get(key);
  if (cached) return cached;

  const batches = chunk(TRACKED_COINS, 8);
  let all = [];

  for (const batch of batches) {
    const results = await Promise.allSettled(batch.map(fetchRecentTrades));
    all.push(...results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value));
    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(150);
    }
  }

  const sorted = all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  shortCache.set(key, sorted);
  return sorted;
}

// ── Place Order (real trade, with builder fee) ────────────────────────────
// This submits a pre-signed order from the frontend directly to HL exchange
// The builder field collects fees for Hayai
async function submitOrder(signedOrderPayload) {
  // Inject builder fee address
  const feeAddress = process.env.HAYAI_FEE_ADDRESS;
  const feeBps = parseInt(process.env.HAYAI_FEE_BPS || "1");

  if (feeAddress && signedOrderPayload.action?.orders) {
    signedOrderPayload.action.builder = {
      b: feeAddress,   // builder address
      f: feeBps,       // fee in tenths of a bps (1 = 0.1%)
    };
  }

  const res = await hlExchange(signedOrderPayload);
  return res;
}

// ── Cancel Order ───────────────────────────────────────────────────────────
async function submitCancel(signedCancelPayload) {
  return await hlExchange(signedCancelPayload);
}

// ── Compute Trader Stats ───────────────────────────────────────────────────
function computeTraderStats(fills, address) {
  if (!fills.length) return emptyStats(address);

  const totalVolume = fills.reduce((s, f) => s + f.notional, 0);
  const totalPnl = fills.reduce((s, f) => s + (f.closedPnl || 0), 0);
  const totalFees = fills.reduce((s, f) => s + (f.fee || 0), 0);
  const wins = fills.filter((f) => (f.closedPnl || 0) > 0).length;
  const longsCount = fills.filter((f) => f.side === "LONG").length;
  const shortsCount = fills.filter((f) => f.side === "SHORT").length;

  const assetCounts = {};
  fills.forEach((f) => { assetCounts[f.asset] = (assetCounts[f.asset] || 0) + 1; });
  const favoriteAsset = Object.entries(assetCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Daily PnL bucketing
  const dailyPnl = {};
  fills.forEach((f) => {
    const day = new Date(f.timestamp).toISOString().slice(0, 10);
    dailyPnl[day] = (dailyPnl[day] || 0) + (f.closedPnl || 0);
  });

  return {
    address,
    totalTrades: fills.length,
    totalVolume: round(totalVolume),
    totalPnl: round(totalPnl),
    totalFees: round(totalFees),
    winRate: round((wins / fills.length) * 100, 1),
    avgTradeSize: round(totalVolume / fills.length),
    favoriteAsset,
    longsCount,
    shortsCount,
    dailyPnl: Object.entries(dailyPnl)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, pnl]) => ({ date, pnl: round(pnl) })),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function emptyStats(address) {
  return {
    address, totalTrades: 0, totalVolume: 0, totalPnl: 0,
    totalFees: 0, winRate: 0, avgTradeSize: 0,
    favoriteAsset: null, longsCount: 0, shortsCount: 0, dailyPnl: [],
  };
}

function pseudoAddress(tid, coin) {
  let h = 0x811c9dc5;
  const s = `${tid}${coin}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `0x${h.toString(16).padStart(8, "0")}${"0000000000000000000000000000000000".slice(0, 32)}`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function round(n, d = 2) { return Math.round(n * 10 ** d) / 10 ** d; }

module.exports = {
  fetchRecentTrades, fetchUserFills, fetchClearinghouseState,
  fetchOpenOrders, fetchLiveFeed, getAllMids, getMeta, getAssetIndex,
  submitOrder, submitCancel, computeTraderStats, TRACKED_COINS,
  MIN_NOTIONAL, WHALE_NOTIONAL,
};