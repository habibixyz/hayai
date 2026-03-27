const express = require("express");
const router = express.Router();
const { submitOrder, submitCancel, getAllMids, getMeta } = require("../services/hyperliquid");

const HAYAI_FEE_ADDRESS = process.env.HAYAI_FEE_ADDRESS;
const HAYAI_FEE_BPS = parseInt(process.env.HAYAI_FEE_BPS || "1");

// POST /api/trade/order
// Accepts a signed EIP-712 order payload from the frontend wallet
// Injects builder fee before forwarding to Hyperliquid
router.post("/order", async (req, res) => {
  try {
    const { action, nonce, signature, vaultAddress } = req.body;

    if (!action || !nonce || !signature) {
      return res.status(400).json({ success: false, error: "Missing action, nonce, or signature" });
    }

    if (action.type !== "order") {
      return res.status(400).json({ success: false, error: "Only order actions supported" });
    }

    // Inject Hayai builder fee
    const payload = {
      action: {
        ...action,
        builder: HAYAI_FEE_ADDRESS
          ? { b: HAYAI_FEE_ADDRESS, f: HAYAI_FEE_BPS }
          : undefined,
      },
      nonce,
      signature,
      ...(vaultAddress ? { vaultAddress } : {}),
    };

    console.log(`[TRADE] Order from nonce=${nonce} coins=${action.orders?.map((o) => o.a).join(",")}`);

    const result = await submitOrder(payload);

    // Log fee collection
    if (HAYAI_FEE_ADDRESS && result.status === "ok") {
      const notional = action.orders?.reduce(
        (s, o) => s + parseFloat(o.p || 0) * parseFloat(o.s || 0), 0
      ) || 0;
      const feeEarned = (notional * HAYAI_FEE_BPS) / 10000;
      console.log(`[FEE] Hayai earned ~$${feeEarned.toFixed(4)} on $${notional.toFixed(2)} notional`);
    }

    res.json({ success: true, data: result });
  } catch (e) {
    console.error("[TRADE] order error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/trade/cancel
router.post("/cancel", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.action || !payload.nonce || !payload.signature) {
      return res.status(400).json({ success: false, error: "Invalid cancel payload" });
    }
    const result = await submitCancel(payload);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/trade/meta
// Returns asset index map + mids for order building
router.get("/meta", async (req, res) => {
  try {
    const [meta, mids] = await Promise.all([getMeta(), getAllMids()]);
    const assetMap = {};
    (meta.universe || []).forEach((u, i) => { assetMap[u.name] = { index: i, ...u }; });
    res.json({ success: true, data: { assetMap, mids } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/trade/fees
// Returns Hayai fee info
router.get("/fees", (_req, res) => {
  res.json({
    success: true,
    data: {
      builderAddress: HAYAI_FEE_ADDRESS || null,
      feeBps: HAYAI_FEE_BPS,
      feePercent: `${(HAYAI_FEE_BPS / 100).toFixed(2)}%`,
      description: "Hayai charges a builder fee on all trades placed through the platform",
    },
  });
});

module.exports = router;
