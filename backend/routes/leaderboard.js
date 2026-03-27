const express = require("express");
const router = express.Router();
const { fetchLiveFeed, computeTraderStats } = require("../services/hyperliquid");
const NodeCache = require("node-cache");

const lbCache = new NodeCache({ stdTTL: 30 });

router.get("/", async (req, res) => {
  try {
    const sortBy = req.query.sortBy || "volume";
    const key = `lb:${sortBy}`;
    const cached = lbCache.get(key);
    if (cached) return res.json(cached);

    const trades = await fetchLiveFeed(300);

    const map = {};
    trades.forEach((t) => {
      if (!map[t.trader]) map[t.trader] = { address: t.trader, trades: [] };
      map[t.trader].trades.push(t);
    });

    const board = Object.values(map).map(({ address, trades }) => {
      const s = computeTraderStats(trades, address);
      return {
        rank: 0, address,
        totalTrades: s.totalTrades,
        totalVolume: s.totalVolume,
        winRate: s.winRate,
        totalPnl: s.totalPnl,
        favoriteAsset: s.favoriteAsset,
        longsCount: s.longsCount,
        shortsCount: s.shortsCount,
        isWhale: trades.some((t) => t.isWhale),
      };
    });

    const sorted = board
      .filter((t) => t.totalTrades > 0)
      .sort((a, b) => {
        if (sortBy === "activity") return b.totalTrades - a.totalTrades;
        if (sortBy === "winRate") return b.winRate - a.winRate;
        if (sortBy === "pnl") return b.totalPnl - a.totalPnl;
        return b.totalVolume - a.totalVolume;
      })
      .slice(0, 50)
      .map((t, i) => ({ ...t, rank: i + 1 }));

    const result = { success: true, sortBy, count: sorted.length, data: sorted };
    lbCache.set(key, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
