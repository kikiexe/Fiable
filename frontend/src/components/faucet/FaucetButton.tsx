"use client";

import { useState } from "react";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { CONTRACT_ADDRESSES, ERC20_ABI, parseUSDC } from "@/lib/contracts";

export function FaucetButton() {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const handleMint = async () => {
    if (!isConnected || !address) {
      setStatus("Hubungkan wallet");
      return;
    }

    setIsMinting(true);
    setStatus("Mengirim mint...");

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.mockUSDC,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [address, parseUSDC("10000")],
      });

      setStatus("Menunggu konfirmasi blok...");
      await waitForTransactionReceipt(config, { hash });
      setStatus("10,000 mUSDC berhasil ditambahkan!");
      setTimeout(() => setStatus(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaksi gagal";
      setStatus(`Gagal: ${msg.slice(0, 30)}...`);
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setIsMinting(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleMint}
        disabled={isMinting}
        className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 cursor-pointer"
        title="Mint 10,000 mUSDC untuk testing di Monad Testnet"
      >
        {isMinting ? "Minting..." : "Faucet +10k mUSDC"}
      </button>
      {status && (
        <span className="text-[11px] text-emerald-300 font-mono">
          {status}
        </span>
      )}
    </div>
  );
}
