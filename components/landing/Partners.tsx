"use client";

const PARTNERS = [
  {
    name: "BNB Chain",
    logo: (
      <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <circle cx="24" cy="24" r="24" fill="#F0B90B" />
        <path d="M18 24l6-6 6 6-6 6-6-6zm-6 0l6 6V24l-6-6v6zm18-6v6l6-6-6-6v6zm-6 12l-6-6 6 6 6-6-6 6z" fill="white" opacity="0.92" />
      </svg>
    ),
  },
  {
    name: "Tether USDT",
    logo: (
      <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: "#26A17B", color: "white" }}>₮</span>
    ),
  },
  {
    name: "MetaMask",
    logo: (
      <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <path d="M42 6L26 18l3-7L42 6z" fill="#E17726" />
        <path d="M6 6l16 12-3-7L6 6z" fill="#E27625" />
        <path d="M36 33.6l-4.2 6.5 9 2.5 2.6-8.7-7.4-.3z" fill="#E27625" />
        <path d="M4.6 33.9l2.6 8.7 9-2.5-4.2-6.5-7.4.3z" fill="#E27625" />
        <circle cx="24" cy="24" r="8" fill="#E27625" opacity="0.25" />
      </svg>
    ),
  },
  {
    name: "Trust Wallet",
    logo: (
      <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <circle cx="24" cy="24" r="24" fill="#3375BB" />
        <path d="M24 10l12 5.2v9.1c0 6.6-5.1 12.4-12 14.2-6.9-1.8-12-7.6-12-14.2v-9.1L24 10z" fill="white" opacity="0.9" />
      </svg>
    ),
  },
  {
    name: "WalletConnect",
    logo: (
      <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <circle cx="24" cy="24" r="24" fill="#3B99FC" />
        <path d="M14.4 19.8c5.3-5.3 13.9-5.3 19.2 0l.6.6-2.3 2.3-.6-.6c-3.7-3.7-9.6-3.7-13.3 0l-.7.6-2.3-2.3.9-.6zm9.6 5.1l3.1 3.1-3.1 3.1-3.1-3.1 3.1-3.1z" fill="white" />
      </svg>
    ),
  },
  {
    name: "PancakeSwap",
    logo: (
      <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <circle cx="24" cy="24" r="24" fill="#1FC7D4" />
        <path d="M24 12c-3.3 0-6 1.3-6 3s2.7 3 6 3 6-1.3 6-3-2.7-3-6-3zm0 18c-5 0-9-2-9-4.5S19 21 24 21s9 2 9 4.5S29 30 24 30z" fill="white" opacity="0.9" />
      </svg>
    ),
  },
];

export function Partners() {
  return (
    <section className="py-16 border-t" style={{ borderColor: "var(--line)" }}>
      <div className="mx-auto max-w-site px-6">
        <p className="text-center text-xs az-mono uppercase tracking-widest mb-10" style={{ color: "var(--muted)" }}>
          Trusted by the BNBChain ecosystem
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10">
          {PARTNERS.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
              {p.logo}
              <span className="text-xs az-mono" style={{ color: "var(--text-2)" }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
