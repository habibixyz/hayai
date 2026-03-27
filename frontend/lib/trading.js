"use client";

// Hyperliquid signing chain ID (not HyperEVM — HL uses its own chain ID for perp signing)
export const HL_SIGNING_CHAIN_ID = 1337;

/**
 * EIP-712 domain for Hyperliquid order signing
 * Users sign an "Agent" type which authorises the action hash
 */
const HL_DOMAIN = {
  name: "Exchange",
  version: "1",
  chainId: HL_SIGNING_CHAIN_ID,
  verifyingContract: "0x0000000000000000000000000000000000000000",
};

const AGENT_TYPES = {
  Agent: [
    { name: "source",       type: "string"  },
    { name: "connectionId", type: "bytes32" },
  ],
};

/**
 * Hash the action using the same method as the Hyperliquid SDK
 * Returns a 32-byte hex string suitable for the connectionId field
 */
export function hashAction(action, nonce, vaultAddress = null) {
  // We encode action + nonce as JSON and hash it
  // In production replace with the exact msgpack + keccak from HL's Python/JS SDK
  const raw = JSON.stringify({ action, nonce, vaultAddress: vaultAddress || null });
  // Simple deterministic hash for demo — swap for proper HL action hash in prod
  let h = BigInt("0x811c9dc5");
  for (let i = 0; i < raw.length; i++) {
    h ^= BigInt(raw.charCodeAt(i));
    h = (h * BigInt("0x01000193")) & BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  }
  return ("0x" + h.toString(16).padStart(64, "0")).slice(0, 66);
}

/**
 * Build + sign an order and return the full payload ready for /api/trade/order
 * Requires wagmi's signTypedData
 */
export async function buildSignedOrder({
  signTypedDataAsync,   // from useSignTypedData().signTypedDataAsync
  address,
  assetIndex,           // number — from /api/trade/meta
  isBuy,                // boolean
  limitPrice,           // number (USDC)
  size,                 // number (base asset)
  reduceOnly = false,
  orderType = "Gtc",    // Gtc | Ioc | FrontendMarket
}) {
  const nonce = Date.now();

  const action = {
    type: "order",
    orders: [{
      a: assetIndex,
      b: isBuy,
      p: limitPrice.toFixed(6),
      s: size.toFixed(6),
      r: reduceOnly,
      t: orderType === "FrontendMarket"
        ? { trigger: { isMarket: true, tpsl: "tp", triggerPx: "0" } }
        : { limit: { tif: orderType } },
    }],
    grouping: "na",
  };

  const connectionId = hashAction(action, nonce);

  const signature = await signTypedDataAsync({
    domain: HL_DOMAIN,
    types: AGENT_TYPES,
    primaryType: "Agent",
    message: { source: "a", connectionId },
  });

  return { action, nonce, signature };
}

/**
 * Build + sign a cancel order payload
 */
export async function buildSignedCancel({
  signTypedDataAsync,
  assetIndex,
  orderId,
}) {
  const nonce = Date.now();
  const action = {
    type: "cancel",
    cancels: [{ a: assetIndex, o: orderId }],
  };
  const connectionId = hashAction(action, nonce);
  const signature = await signTypedDataAsync({
    domain: HL_DOMAIN,
    types: AGENT_TYPES,
    primaryType: "Agent",
    message: { source: "a", connectionId },
  });
  return { action, nonce, signature };
}

/**
 * Submit a signed order through Hayai backend (which injects builder fee)
 */
export async function submitOrderViaHayai(signedPayload, walletAddress) {
  const res = await fetch("/api/trade/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": walletAddress || "",
    },
    body: JSON.stringify(signedPayload),
  });
  if (!res.ok) throw new Error(`Order failed: ${res.status}`);
  return res.json();
}

/**
 * Submit a cancel through Hayai backend
 */
export async function cancelOrderViaHayai(signedPayload, walletAddress) {
  const res = await fetch("/api/trade/cancel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": walletAddress || "",
    },
    body: JSON.stringify(signedPayload),
  });
  return res.json();
}
