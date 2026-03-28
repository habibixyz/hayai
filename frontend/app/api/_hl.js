const HL = "https://api.hyperliquid.xyz/info";

export async function hlInfo(body) {
  const res = await fetch(HL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`HL API ${res.status}`);
  return res.json();
}

export function round(n, d = 2) {
  return Math.round((n || 0) * 10 ** d) / 10 ** d;
}

// Cache headers — 8s for live data
export const LIVE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=8, stale-while-revalidate=16",
};

export const MED_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
};
