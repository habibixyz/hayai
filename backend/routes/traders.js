const express = require("express");
const router = express.Router();
const {
  fetchUserFills, fetchClearinghouseState, fetchOpenOrders, computeTraderStats,
} = require("../services/hyperliquid");

router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address))
      return res.status(400).json({ success: false, error: "Invalid address" });

    const [fillsRes, stateRes, ordersRes] = await Promise.allSettled([
      fetchUserFills(address),
      fetchClearinghouseState(address),
      fetchOpenOrders(address),
    ]);

    const fills = fillsRes.status === "fulfilled" ? fillsRes.value : [];
    const state = stateRes.status === "fulfilled" ? stateRes.value : null;
    const openOrders = ordersRes.status === "fulfilled" ? ordersRes.value : [];

    const stats = computeTraderStats(fills, address);

    let positions = [];
    let accountValue = 0;

    if (state) {
      accountValue = parseFloat(state.marginSummary?.accountValue || 0);
      positions = (state.assetPositions || [])
        .filter((p) => p.position && Math.abs(parseFloat(p.position.szi)) > 0)
        .map((p) => ({
          asset: p.position.coin,
          size: parseFloat(p.position.szi),
          side: parseFloat(p.position.szi) > 0 ? "LONG" : "SHORT",
          entryPx: parseFloat(p.position.entryPx || 0),
          markPx: parseFloat(p.position.markPx || 0),
          unrealizedPnl: parseFloat(p.position.unrealizedPnl || 0),
          leverage: p.position.leverage?.value || 1,
          liquidationPx: parseFloat(p.position.liquidationPx || 0),
          marginUsed: parseFloat(p.position.marginUsed || 0),
        }));
    }

    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 200);

    res.json({
      success: true,
      data: {
        address, stats, accountValue, positions,
        openOrders: openOrders.slice(0, 20),
        fills: fills.slice((page - 1) * pageSize, page * pageSize),
        pagination: {
          page, pageSize, total: fills.length,
          totalPages: Math.ceil(fills.length / pageSize),
        },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
