const express = require("express");
const router = express.Router();
const { fetchLiveFeed, fetchRecentTrades, TRACKED_COINS, MIN_NOTIONAL } = require("../services/hyperliquid");

// GET /api/feed
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 60, 200);
    const coin = req.query.coin;
    const minNotional = parseInt(req.query.minNotional) || MIN_NOTIONAL;

    let trades;
    if (coin && TRACKED_COINS.includes(coin.toUpperCase())) {
      trades = await fetchRecentTrades(coin.toUpperCase());
    } else {
      trades = await fetchLiveFeed(limit * 2);
    }

    // Apply additional filter from client
    trades = trades
      .filter((t) => t.notional >= minNotional)
      .slice(0, limit);

    res.json({ success: true, count: trades.length, coins: TRACKED_COINS, minNotional, data: trades });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/coins", (_req, res) => {
  res.json({ success: true, data: TRACKED_COINS });
});

module.exports = router;
