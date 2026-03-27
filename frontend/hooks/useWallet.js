"use client";
import { useAccount, useDisconnect, useSignTypedData } from "wagmi";
import { useCallback } from "react";

export function useWallet() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { signTypedDataAsync } = useSignTypedData();

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  const signOrder = useCallback(
    (typedData) => signTypedDataAsync(typedData),
    [signTypedDataAsync]
  );

  return { address, isConnected, chain, disconnect, shortAddress, signOrder, signTypedDataAsync };
}
