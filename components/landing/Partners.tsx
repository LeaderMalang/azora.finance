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
        <path d="M42.7 5L27.2 16.6l2.8-6.7L42.7 5z" fill="#E17726" stroke="#E17726" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M5.3 5l15.3 11.7-2.7-6.8L5.3 5z" fill="#E27625" stroke="#E27625" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M37 33.2l-4.1 6.3 8.8 2.4 2.5-8.4L37 33.2z" fill="#E27625" stroke="#E27625" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M4.8 33.5l2.5 8.4 8.8-2.4-4.1-6.3-7.2.3z" fill="#E27625" stroke="#E27625" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M15.7 21.8l-2.3 3.5 8.2.4-.3-8.8-5.6 4.9z" fill="#E27625" stroke="#E27625" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M32.3 21.8l-5.7-5-.3 8.9 8.2-.4-2.2-3.5z" fill="#E27625" stroke="#E27625" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M16.1 39.5l4.9-2.4-4.2-3.3-.7 5.7z" fill="#E27625" stroke="#E27625" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M27 37.1l4.9 2.4-.7-5.7-4.2 3.3z" fill="#E27625" stroke="#E27625" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M32 39.5l-4.9-2.4.4 3.3-.1 1.8L32 39.5z" fill="#D6C0B3" stroke="#D6C0B3" strokeWidth="0.3" strokeLinejoin="round"/>
        <path d="M16 39.5l4.6 2.7-.1-1.8.4-3.3L16 39.5z" fill="#D6C0B3" stroke="#D6C0B3" strokeWidth="0.3" strokeLinejoin="round"/>
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
        {/* Bunny ears */}
        <ellipse cx="18" cy="12" rx="4" ry="6.5" fill="white" opacity="0.9"/>
        <ellipse cx="30" cy="12" rx="4" ry="6.5" fill="white" opacity="0.9"/>
        <ellipse cx="18" cy="12" rx="2.2" ry="4.5" fill="#FF6B81"/>
        <ellipse cx="30" cy="12" rx="2.2" ry="4.5" fill="#FF6B81"/>
        {/* Face */}
        <circle cx="24" cy="28" r="11" fill="white" opacity="0.9"/>
        <circle cx="20" cy="26" r="1.5" fill="#1FC7D4"/>
        <circle cx="28" cy="26" r="1.5" fill="#1FC7D4"/>
        <path d="M21 31 Q24 33.5 27 31" stroke="#1FC7D4" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
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
