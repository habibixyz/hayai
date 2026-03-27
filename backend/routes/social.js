const express = require("express");
const router = express.Router();
const { query } = require("../db");

// Fallback in-memory store if no DB
const memFollows = new Map();

function getUserKey(req) {
  // In production, replace with JWT/session auth from wallet signature
  return (req.headers["x-wallet-address"] || req.ip || "anon").toLowerCase();
}

async function getFollowingFromDB(userKey) {
  const res = await query(
    "SELECT trader_address FROM follows WHERE follower_key = $1",
    [userKey]
  );
  return res?.rows?.map((r) => r.trader_address) || null;
}

async function followInDB(userKey, address) {
  await query(
    `INSERT INTO follows (follower_key, trader_address) VALUES ($1, $2)
     ON CONFLICT (follower_key, trader_address) DO NOTHING`,
    [userKey, address.toLowerCase()]
  );
}

async function unfollowInDB(userKey, address) {
  await query(
    "DELETE FROM follows WHERE follower_key = $1 AND trader_address = $2",
    [userKey, address.toLowerCase()]
  );
}

// GET /api/social/following
router.get("/following", async (req, res) => {
  const key = getUserKey(req);
  const dbResult = await getFollowingFromDB(key);
  if (dbResult !== null) {
    return res.json({ success: true, data: dbResult });
  }
  // fallback memory
  res.json({ success: true, data: Array.from(memFollows.get(key) || new Set()) });
});

// GET /api/social/followers/:address
router.get("/followers/:address", async (req, res) => {
  const res2 = await query(
    "SELECT COUNT(*) as count FROM follows WHERE trader_address = $1",
    [req.params.address.toLowerCase()]
  );
  res.json({ success: true, count: parseInt(res2?.rows[0]?.count || 0) });
});

// POST /api/social/follow
router.post("/follow", async (req, res) => {
  const { address } = req.body;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address))
    return res.status(400).json({ success: false, error: "Invalid address" });

  const key = getUserKey(req);
  await followInDB(key, address);

  // memory fallback
  if (!memFollows.has(key)) memFollows.set(key, new Set());
  memFollows.get(key).add(address.toLowerCase());

  res.json({ success: true, following: true });
});

// POST /api/social/unfollow
router.post("/unfollow", async (req, res) => {
  const { address } = req.body;
  const key = getUserKey(req);
  await unfollowInDB(key, address);
  memFollows.get(key)?.delete(address?.toLowerCase());
  res.json({ success: true, following: false });
});

module.exports = router;
