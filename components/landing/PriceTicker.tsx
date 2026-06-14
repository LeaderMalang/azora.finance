"use client";

import { useEffect, useState } from "react";

type PriceData = {
  usd: number;
  usd_24h_change: number;
};

type Prices = Record<string, PriceData>;

const TOKENS = [
  { id: "binancecoin", symbol: "BNB", color: "#F0B90B" },
  { id: "bitcoin", symbol: "BTC", color: "#F7931A" },
  { id: "ethereum", symbol: "ETH", color: "#627EEA" },
  { id: "tether", symbol: "USDT", color: "#26A17B" },
];

function Arrow({ up }: { up: boolean }) {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
      {up
        ? <path d="M5 2l4 6H1L5 2z" />
        : <path d="M5 8L1 2h8L5 8z" />}
    </svg>
  );
}

export function PriceTicker() {
  const [prices, setPrices] = useState<Prices>({});
  const [loading, setLoading] = useState(true);

  const fetchPrices = async () => {
    try {
      const ids = TOKENS.map((t) => t.id).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch {
      // silently ignore — prices stay stale
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="border-b"
      style={{
        background: "var(--surface)",
        borderColor: "var(--line)",
      }}
    >
      <div className="mx-auto max-w-site px-6 py-2 flex items-center gap-6 overflow-x-auto scrollbar-none">
        {/* AZR — placeholder until listed */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--teal), var(--teal-deep))" }}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 32 32" fill="none">
              <path d="M16 4 L27 22 H5 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" />
              <path d="M16 10 L21 19 H11 Z" fill="white" />
            </svg>
          </span>
          <span className="text-xs az-mono font-semibold">AZR</span>
          <span className="text-xs az-mono" style={{ color: "var(--text-2)" }}>—</span>
          <span className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>Not listed yet</span>
        </div>

        <span className="w-px h-4 flex-shrink-0" style={{ background: "var(--line)" }} />

        {loading
          ? TOKENS.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5 flex-shrink-0 animate-pulse">
                <div className="w-4 h-4 rounded-full" style={{ background: "var(--elevated)" }} />
                <div className="w-8 h-3 rounded" style={{ background: "var(--elevated)" }} />
                <div className="w-14 h-3 rounded" style={{ background: "var(--elevated)" }} />
              </div>
            ))
          : TOKENS.map((t) => {
              const p = prices[t.id];
              if (!p) return null;
              const change = p.usd_24h_change;
              const up = change >= 0;
              return (
                <div key={t.id} className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ background: t.color, color: "white" }}
                  >
                    {t.symbol[0]}
                  </span>
                  <span className="text-xs az-mono font-semibold">{t.symbol}</span>
                  <span className="text-xs az-mono" style={{ color: "var(--text-2)" }}>
                    ${p.usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className="flex items-center gap-0.5 text-[11px] az-mono"
                    style={{ color: up ? "#22c55e" : "#ef4444" }}
                  >
                    <Arrow up={up} />
                    {Math.abs(change).toFixed(2)}%
                  </span>
                </div>
              );
            })}

        <div className="flex-1" />
        <span className="text-[10px] az-mono flex-shrink-0" style={{ color: "var(--muted)" }}>
          Live · CoinGecko
        </span>
      </div>
    </div>
  );
}
