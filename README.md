# 速 Hayai v2 — Social Trading on Hyperliquid

Real-time high-volume trade feed, wallet connect, copy trading with real order execution, and a 0.1% builder fee on every trade you route through the platform.

---

## What's New in v2

| Feature | v1 | v2 |
|---|---|---|
| Feed filter | All trades (noise) | **$5,000+ notional only** |
| Wallet connect | None | **MetaMask, Rabby, Zerion, WalletConnect** |
| HyperEVM chain | No | **Chain ID 999, rpc.hyperliquid.xyz/evm** |
| Real trading | Simulated only | **Real EIP-712 signed orders → Hyperliquid** |
| Fee collection | None | **0.1% builder fee → your wallet on every trade** |
| User identity | IP-based | **Wallet address** |
| User profile | None | **/profile — your trades, positions, following** |
| Copy trade | Console.log | **Real order placed with 0.5% slippage protection** |
| Price ticker | None | **Live scrolling ticker tape** |
| PnL chart | None | **30-day sparkline on trader profiles** |
| Follow system | Memory only | **DB-persisted, wallet-keyed** |

---

## Project Structure

```
hayai-v2/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── services/hyperliquid.js     ← All HL API calls, $5K+ filter, order submission
│   ├── routes/
│   │   ├── feed.js                 ← GET /api/feed (filtered)
│   │   ├── traders.js              ← GET /api/trader/:address
│   │   ├── leaderboard.js          ← GET /api/leaderboard
│   │   ├── social.js               ← follow/unfollow (wallet-keyed)
│   │   └── trading.js              ← POST /api/trade/order (fee injection)
│   ├── db/
│   │   ├── index.js
│   │   └── schema.sql
│   └── middleware/rateLimiter.js
│
└── frontend/
    ├── app/
    │   ├── layout.js               ← WagmiProvider + RainbowKit + ReactQuery
    │   ├── page.js                 ← Feed + TradePanel sidebar
    │   ├── leaderboard/page.js     ← Sortable leaderboard
    │   ├── trader/[address]/page.js ← Trader profile + positions + PnL chart
    │   └── profile/page.js         ← MY profile, trades, following
    ├── components/
    │   ├── Navbar.js               ← RainbowKit ConnectButton
    │   ├── LiveFeed.js             ← Volume-filtered feed with polling
    │   ├── FeedCard.js             ← Trade card + real copy trade button
    │   ├── Providers.js            ← All React providers
    │   ├── ui/
    │   │   ├── TickerTape.js       ← Live price scroller
    │   │   └── Skeletons.js
    │   ├── trading/
    │   │   └── TradePanel.js       ← Real order entry (Market/Limit/IOC)
    │   └── wallet/
    │       └── FollowButton.js     ← Wallet-aware follow
    ├── hooks/
    │   ├── useWallet.js
    │   └── useFeed.js
    └── lib/
        ├── api.js                  ← Fetch helpers + formatters
        ├── wagmi.js                ← Wagmi + HyperEVM chain config
        └── trading.js              ← EIP-712 order signing
```

---

## ⚡ Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (optional — runs without DB)
- WalletConnect Project ID (free at cloud.walletconnect.com)

---

### Step 1 — Install
```bash
cd hayai-v2
npm install
npm run install:all
```

### Step 2 — Configure backend
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/hayai
HL_API_URL=https://api.hyperliquid.xyz/info
HL_EXCHANGE_URL=https://api.hyperliquid.xyz/exchange

# !! SET THIS — this wallet earns fees from every trade placed on Hayai
HAYAI_FEE_ADDRESS=0xYOUR_WALLET_ADDRESS

# Fee in tenths of a basis point — 1 = 0.1% (Hyperliquid builder fee max is ~0.1%)
HAYAI_FEE_BPS=1

NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Step 3 — Configure frontend
```bash
cd frontend
cp .env.local.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id_from_cloud_walletconnect_com
```

### Step 4 — (Optional) Database
```bash
createdb hayai
psql -d hayai -f backend/db/schema.sql
```

### Step 5 — Run
```bash
# From root — starts both
npm run dev

# OR separately:
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

Open **http://localhost:3000**

---

## How Fees Work

Hayai uses Hyperliquid's official **builder fee** system:

```js
// Injected server-side in backend/routes/trading.js
action.builder = {
  b: "0xYOUR_FEE_ADDRESS",   // your wallet
  f: 1,                       // 1 = 0.1% (in tenths of basis points)
}
```

Every order routed through `/api/trade/order` has this field injected **before** it's forwarded to Hyperliquid's exchange. The fee is:
- Collected automatically by Hyperliquid
- Transferred to `HAYAI_FEE_ADDRESS` on every filled order
- Cannot be removed by the frontend (server-side injection)
- Displayed transparently to users in the UI

**Register as a builder:**
Visit `https://app.hyperliquid.xyz` → Settings → Builder → register your address.

---

## Wallet Support

Via RainbowKit + Wagmi v2:
- **MetaMask**
- **Rabby**
- **Zerion**
- **Rainbow**
- **Coinbase Wallet**
- **Any WalletConnect v2 wallet**
- **HyperEVM** (Chain ID 999, added as custom chain)

---

## Order Signing (EIP-712)

Orders are signed client-side using EIP-712 typed data:

```
Domain: { name: "Exchange", version: "1", chainId: 1337 }
Type:   Agent { source: string, connectionId: bytes32 }
```

The `connectionId` is a hash of the action + nonce. The signed payload is sent to the Hayai backend which injects the builder fee and forwards to `https://api.hyperliquid.xyz/exchange`.

**Note:** For production-grade signing, replace `hashAction()` in `lib/trading.js` with the exact msgpack + keccak256 implementation from the [Hyperliquid Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk) or [JS SDK](https://github.com/hyperliquid-dex/hyperliquid-ts-sdk).

---

## Production Checklist

- [ ] Replace `hashAction()` with proper HL SDK action hashing
- [ ] Add JWT/session auth tied to wallet signature (replace IP-based user keys)
- [ ] Move to Hyperliquid WebSocket for true real-time feed
- [ ] Add Redis for distributed cache (replace node-cache)
- [ ] Rate limit by wallet address (not just IP)
- [ ] Add order history persistence to PostgreSQL
- [ ] Register `HAYAI_FEE_ADDRESS` as a Hyperliquid builder
- [ ] Set up WalletConnect Project ID for production domain
