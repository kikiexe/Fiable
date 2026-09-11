"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function ConnectButton() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();

  if (!ready) {
    return (
      <div className="px-4 py-2 rounded-xl bg-slate-800 text-slate-500 text-sm font-medium">
        Loading...
      </div>
    );
  }

  const isUserConnected = authenticated || isWagmiConnected;
  const activeAddress = wagmiAddress ?? user?.wallet?.address;

  if (!isUserConnected || !activeAddress) {
    return (
      <button
        type="button"
        onClick={login}
        className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-600 transition-colors cursor-pointer shadow-sm"
      >
        Connect Wallet
      </button>
    );
  }

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`;

  return (
    <div className="flex items-center gap-2.5">
      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
        {truncated}
      </span>
      <button
        type="button"
        onClick={logout}
        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs hover:text-white transition-colors cursor-pointer border border-slate-700"
      >
        Disconnect
      </button>
    </div>
  );
}
