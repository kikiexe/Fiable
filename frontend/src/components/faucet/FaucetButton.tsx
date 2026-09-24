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
      setStatus("Hubungkan dompet terlebih dahulu");
      return;
    }

    setIsMinting(true);
    setStatus("Memproses pengiriman saldo...");

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.mockUSDC,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [address, parseUSDC("10000")],
      });

      setStatus("Menunggu konfirmasi jaringan...");
      await waitForTransactionReceipt(config, { hash });
      setStatus("10.000 mUSDC saldo uji coba berhasil masuk!");
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
        className="px-3 py-1.5 rounded-xs border border-[#9fe870]/40 bg-[#e2f6d5] text-[#163300] text-[11px] font-bold hover:bg-[#9fe870] transition-colors disabled:opacity-50 cursor-pointer"
        title="Klaim 10.000 mUSDC saldo uji coba di jaringan Monad"
      >
        {isMinting ? "Mengirim..." : "Ambil Saldo +10k"}
      </button>
      {status && (
        <span className="text-[11px] text-[#163300] font-mono font-semibold">
          {status}
        </span>
      )}
    </div>
  );
}
