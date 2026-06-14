"use client";

import { useTranslations } from "next-intl";
import { targetChain } from "@/lib/wagmi";
import { useSidebar } from "./SidebarContext";

export function AppTopbar({ title, sub }: { title: string; sub?: string }) {
  const t = useTranslations("app");
  const { toggle } = useSidebar();

  return (
    <div
      className="flex items-center gap-3 px-4 md:px-8 py-5 border-b"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden flex-shrink-0 p-1.5 -ml-1 rounded-ctl"
        style={{ color: "var(--text-2)" }}
        onClick={toggle}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-xl md:text-2xl truncate" style={{ letterSpacing: "-0.025em" }}>{title}</h1>
        {sub && <p className="text-sm mt-0.5 truncate" style={{ color: "var(--muted)" }}>{sub}</p>}
      </div>

      <span
        className="flex-shrink-0 flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs az-mono"
        style={{ borderColor: "var(--line)", color: "var(--text-2)" }}
      >
        <span className="w-2 h-2 rounded-full bg-warn" />
        <span className="hidden sm:inline">{t("network")}</span>
        {targetChain.id === 97 && <span className="opacity-50 hidden sm:inline">(testnet)</span>}
        {targetChain.id === 97 && <span className="sm:hidden opacity-50">testnet</span>}
      </span>
    </div>
  );
}
