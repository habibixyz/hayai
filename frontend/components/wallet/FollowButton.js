"use client";
import { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { getFollowing, followTrader, unfollowTrader } from "../../lib/api";

export default function FollowButton({ address }) {
  const { address: wallet, isConnected } = useWallet();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    getFollowing(wallet).then((res) => {
      setFollowing((res.data || []).map((a) => a.toLowerCase()).includes(address?.toLowerCase()));
    }).catch(() => {});
  }, [wallet, address]);

  async function toggle() {
    if (!isConnected) {
      alert("Connect your wallet to follow traders.");
      return;
    }
    setLoading(true);
    try {
      if (following) {
        await unfollowTrader(address, wallet);
        setFollowing(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await followTrader(address, wallet);
        setFollowing(true);
        setCount((c) => c + 1);
      }
    } catch (e) {
      console.error("Follow error:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-600 border transition-all ${
        loading ? "opacity-50 cursor-wait" : ""
      } ${
        following
          ? "border-[#00ff94]/30 text-[#00ff94] bg-[#00ff94]/8 hover:bg-[#ff3b5c]/8 hover:text-[#ff3b5c] hover:border-[#ff3b5c]/30"
          : "border-[#16162a] text-[#6060a0] hover:border-[#7c6aff]/40 hover:text-[#7c6aff] hover:bg-[#7c6aff]/5"
      }`}
    >
      {loading ? "…" : following ? "✓ Following" : "+ Follow"}
    </button>
  );
}
