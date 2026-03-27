const BASE = typeof window !== "undefined"
  ? "/api"
  : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api`;

async function get(path, walletAddress) {
  const res = await fetch(`${BASE}${path}`, {
    headers: walletAddress ? { "x-wallet-address": walletAddress } : {},
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post(path, body, walletAddress) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(walletAddress ? { "x-wallet-address": walletAddress } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

// ── Feed ─────────────────────────────────────────────────────────
export const getFeed = ({ limit = 60, coin, minNotional } = {}) => {
  const p = new URLSearchParams({ limit });
  if (coin) p.set("coin", coin);
  if (minNotional) p.set("minNotional", minNotional);
  return get(`/feed?${p}`);
};
export const getCoins = () => get("/feed/coins");

// ── Trader ───────────────────────────────────────────────────────
export const getTrader = (address, { page = 1, pageSize = 50 } = {}) =>
  get(`/trader/${address}?page=${page}&pageSize=${pageSize}`);

// ── Leaderboard ──────────────────────────────────────────────────
export const getLeaderboard = (sortBy = "volume") =>
  get(`/leaderboard?sortBy=${sortBy}`);

// ── Social ───────────────────────────────────────────────────────
export const getFollowing = (wallet) => get("/social/following", wallet);
export const getFollowerCount = (address) => get(`/social/followers/${address}`);
export const followTrader = (address, wallet) => post("/social/follow", { address }, wallet);
export const unfollowTrader = (address, wallet) => post("/social/unfollow", { address }, wallet);

// ── Trade meta ───────────────────────────────────────────────────
export const getTradeMeta = async () => {
  const res = await fetch("/api/hl", {
    method: "POST",
    cache: "no-store",
  });

  const json = await res.json();

  const universe = json[0]?.universe || [];
  const ctxs = json[1] || [];

  const assetMap = {};
  const mids = {};

  universe.forEach((asset, i) => {
    assetMap[asset.name] = { index: i, name: asset.name };
    mids[asset.name] = parseFloat(ctxs[i]?.markPx || 0);
  });

  return { data: { assetMap, mids } };
};
export const getFeeInfo = () => get("/trade/fees");

// ── Formatters ───────────────────────────────────────────────────
export const short = (addr = "") =>
  addr.length < 10 ? addr : `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export const fmtUSD = (n, d = 2) => {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Number(n).toFixed(d)}`;
};

export const fmtSize = (n) => {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(3)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(3)}K`;
  return Number(n).toFixed(4);
};

export const fmtPnl = (n) => {
  if (n == null || n === 0) return { str: "—", pos: null };
  return { str: `${n > 0 ? "+" : ""}${fmtUSD(n)}`, pos: n > 0 };
};

export const timeAgo = (ts) => {
  const d = Date.now() - ts;
  if (d < 60e3)     return `${Math.floor(d / 1e3)}s`;
  if (d < 3600e3)   return `${Math.floor(d / 60e3)}m`;
  if (d < 86400e3)  return `${Math.floor(d / 3600e3)}h`;
  return new Date(ts).toLocaleDateString();
};

export const ASSET_COLORS = {
  BTC:"#f7931a", ETH:"#627eea", SOL:"#9945ff", HYPE:"#00ff94",
  ARB:"#28a0f0", AVAX:"#e84142", DOGE:"#c3a634", WIF:"#ff6b35",
  PEPE:"#00c000", SUI:"#6fbcf0", LINK:"#2a5ada", TIA:"#c96fe4",
  OP:"#ff0420",  INJ:"#00b4d8", APT:"#62d1a4",  NEAR:"#00ec97",
  XRP:"#346aa9", ENA:"#9747ff",
};
export const assetColor = (a) => ASSET_COLORS[a?.toUpperCase()] || "#6060a0";

export const avatarGradient = (address = "") => {
  const n = parseInt(address.slice(2, 8) || "0", 16) % 360;
  return `linear-gradient(135deg, hsl(${n},70%,50%), hsl(${(n+120)%360},70%,40%))`;
};
