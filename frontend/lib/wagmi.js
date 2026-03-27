"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { arbitrum, mainnet } from "wagmi/chains";

// HyperEVM — Hyperliquid's EVM layer
export const hyperEVM = {
  id: 999,
  name: "HyperEVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.hyperliquid.xyz/evm"] },
    public:  { http: ["https://rpc.hyperliquid.xyz/evm"] },
  },
  blockExplorers: {
    default: { name: "HyperEVM Explorer", url: "https://explorer.hyperliquid.xyz" },
  },
  testnet: false,
};

export const wagmiConfig = getDefaultConfig({
  appName: "Hayai — Social Trading on Hyperliquid",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo_project_id",
  chains: [hyperEVM, arbitrum, mainnet],
  transports: {
    [hyperEVM.id]: http("https://rpc.hyperliquid.xyz/evm"),
    [arbitrum.id]: http(),
    [mainnet.id]:  http(),
  },
  ssr: true,
});
