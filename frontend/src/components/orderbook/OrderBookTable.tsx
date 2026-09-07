"use client";

interface OrderBookRow {
  id: string;
  rateBps: number;
  amount: number;
  total: number;
}

interface OrderBookTableProps {
  bids: OrderBookRow[];
  asks: OrderBookRow[];
}

export function OrderBookTable({ bids, asks }: OrderBookTableProps) {
  return (
    <div className="flex flex-col h-full bg-[#1E293B] rounded-2xl border border-slate-800 p-4">
      <div className="flex justify-between items-center pb-3 border-b border-slate-800 text-xs font-semibold text-slate-400">
        <span>Suku Bunga (APY)</span>
        <span>Jumlah (mUSDC)</span>
        <span>Akumulasi</span>
      </div>

      <div className="flex flex-col flex-1 gap-1 py-2 overflow-y-auto">
        {/* Asks (Borrow demand) */}
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
            Borrow Orders (Demand)
          </div>
          {asks.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 text-center italic">Tidak ada antrean borrow</div>
          ) : (
            asks.map((ask) => (
              <div key={ask.id} className="flex justify-between text-xs py-1 hover:bg-slate-800/50 px-2 rounded">
                <span className="font-medium text-blue-400">{(ask.rateBps / 100).toFixed(2)}%</span>
                <span className="text-slate-300">{ask.amount.toLocaleString()}</span>
                <span className="text-slate-500">{ask.total.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>

        {/* Mid Rate Separator */}
        <div className="my-3 py-1.5 px-3 bg-slate-900/80 rounded-lg text-center text-xs font-mono text-slate-300 border border-slate-800">
          Spread Mid-Market Index
        </div>

        {/* Bids (Lend supply) */}
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Lend Orders (Supply)
          </div>
          {bids.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 text-center italic">Tidak ada antrean lend</div>
          ) : (
            bids.map((bid) => (
              <div key={bid.id} className="flex justify-between text-xs py-1 hover:bg-slate-800/50 px-2 rounded">
                <span className="font-medium text-emerald-400">{(bid.rateBps / 100).toFixed(2)}%</span>
                <span className="text-slate-300">{bid.amount.toLocaleString()}</span>
                <span className="text-slate-500">{bid.total.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
