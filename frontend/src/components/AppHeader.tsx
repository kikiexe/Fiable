'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { FaucetButton } from '@/components/faucet/FaucetButton';

interface NavigationItem {
  href: string;
  label: string;
  tag?: string;
}

const NAV_ITEMS: readonly NavigationItem[] = [
  { href: '/dashboard', label: 'Ringkasan' },
  { href: '/orderbook', label: 'Buku Penawaran', tag: 'Pasar' },
  { href: '/positions', label: 'Pinjaman Saya' },
  { href: '/market-maker', label: 'Program Imbalan' },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer when user presses Escape

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/icon.png"
              alt="Fieble Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xs object-contain transition-transform group-hover:scale-105"
              priority
            />
            <div className="flex items-center gap-2">
              <span className="font-black text-[#0e0f0c] tracking-tight text-lg">FIEBLE</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs bg-[#e8ebe6] text-[#163300] border border-stone-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2ead4b]" />
                Monad 10143
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-xs font-bold" aria-label="Navigasi Utama">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-xs transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0e0f0c] text-white shadow-xs'
                      : 'text-[#454745] hover:text-[#0e0f0c] hover:bg-[#e8ebe6]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.tag && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded-2xs ${
                        isActive ? 'bg-white/20 text-stone-200' : 'bg-stone-200 text-[#454745]'
                      }`}
                    >
                      {item.tag}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center">
            <FaucetButton />
          </div>
          <ConnectButton />

          {/* Accessible Mobile Menu Toggle button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xs border border-stone-200 bg-[#f6f7f5] text-[#0e0f0c] hover:bg-stone-200 transition-colors"
            aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-4 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <span className="text-[10px] font-mono font-bold uppercase text-[#868685] tracking-wider">
              Menu Navigasi
            </span>
            <div className="sm:hidden">
              <FaucetButton />
            </div>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Navigasi Ponsel">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-xs text-sm font-bold flex items-center justify-between transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-[#0e0f0c] text-white'
                      : 'bg-[#f6f7f5] text-[#0e0f0c] hover:bg-[#e8ebe6]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.tag && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xs ${
                        isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-[#454745]'
                      }`}
                    >
                      {item.tag}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-[#868685]">
            <span className="font-mono">Jaringan: Monad Testnet</span>
            <a
              href="https://testnet.monadexplorer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#163300] font-bold hover:underline"
            >
              Explorer
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
