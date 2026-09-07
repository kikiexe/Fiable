export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-[#0F172A]">
      <main className="flex flex-col items-center gap-8 text-center px-8">
        <h1 className="text-5xl font-bold text-white tracking-tight">
          Fieble
        </h1>
        <p className="text-xl text-[#64748B] max-w-lg">
          Fixed-rate credit market, fully onchain on Monad.
          Set your own rate. Choose your tenor. Get matched.
        </p>
        <div className="flex gap-4">
          <a
            href="/orderbook"
            className="rounded-full bg-[#2563EB] px-6 py-3 text-white font-medium hover:bg-[#1d4ed8] transition-colors"
          >
            Open Order Book
          </a>
          <a
            href="/positions"
            className="rounded-full border border-[#64748B] px-6 py-3 text-[#F1F5F9] font-medium hover:bg-white/5 transition-colors"
          >
            My Positions
          </a>
        </div>
      </main>
    </div>
  );
}
