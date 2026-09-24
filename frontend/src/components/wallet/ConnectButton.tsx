"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function ConnectButton() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();

  if (!ready) {
    return (
      <div className="px-4 py-2 rounded-xs bg-stone-200 text-[#868685] text-xs font-bold">
        Memuat...
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
        className="px-4 py-2 rounded-xs bg-[#0e0f0c] text-white text-xs font-bold hover:bg-[#163300] transition-colors cursor-pointer"
      >
        Hubungkan Dompet
      </button>
    );
  }

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`;

  return (
    <div className="flex items-center gap-1.5">
      <span className="px-2.5 py-1.5 rounded-xs bg-[#e2f6d5] border border-[#9fe870]/30 text-[#163300] text-[11px] font-mono font-bold">
        {truncated}
      </span>
      <button
        type="button"
        onClick={logout}
        className="px-2.5 py-1.5 rounded-xs bg-stone-200 hover:bg-stone-300 text-[#454745] text-[11px] font-bold hover:text-[#0e0f0c] transition-colors cursor-pointer border border-stone-300"
      >
        Keluar
      </button>
    </div>
  );
}
