"use client";

import { useTranslations } from "next-intl";
import { targetChain } from "@/lib/wagmi";

export function AppTopbar({ title, sub }: { title: string; sub?: string }) {
  const t = useTranslations("app");

  return (
    <div
      className="flex items-center gap-4 px-8 py-5 border-b"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <div className="flex-1">
        <h1 className="font-display font-bold text-2xl" style={{ letterSpacing: "-0.025em" }}>{title}</h1>
        {sub && <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
      </div>
      <span
        className="flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs az-mono"
        style={{ borderColor: "var(--line)", color: "var(--text-2)" }}
      >
        <span className="w-2 h-2 rounded-full bg-warn" />
        {t("network")}
        {targetChain.id === 97 && <span className="opacity-50">(testnet)</span>}
      </span>
    </div>
  );
}
