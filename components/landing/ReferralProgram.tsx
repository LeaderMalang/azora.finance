"use client";

import { useTranslations } from "next-intl";

const NODES = [
  { label: "YOU", name: "your.azr", sub: "commissions paid in AZR", rate: "+820", rateLabel: "AZR earned", isYou: true },
  { label: "L1", name: "maya.azr", sub: "staked 8,000 AZR", rate: "5%", rateLabel: "= 400 AZR", pct: "5%" },
  { label: "L2", name: "deniz.azr", sub: "staked 10,000 AZR", rate: "3%", rateLabel: "= 300 AZR", pct: "3%" },
  { label: "L3", name: "arman.azr", sub: "staked 6,000 AZR", rate: "2%", rateLabel: "= 120 AZR", pct: "2%" },
];

export function ReferralProgram() {
  const t = useTranslations("referral");

  return (
    <section id="referral" className="py-24">
      <div className="mx-auto max-w-site px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <span className="az-mono text-xs tracking-widest uppercase text-teal mb-3 block">{t("title")}</span>
            <h2 className="font-display font-bold mb-5" style={{ fontSize: "clamp(34px,5vw,56px)", letterSpacing: "-0.03em" }}>AI-tracked, three levels deep.</h2>
            <p className="mb-8" style={{ color: "var(--text-2)" }}>{t("sub")}</p>

            {[
              { badge: "L1", label: t("l1"), pct: "5%", teal: true },
              { badge: "L2", label: t("l2"), pct: "3%" },
              { badge: "L3", label: t("l3"), pct: "2%" },
            ].map((row) => (
              <div key={row.badge} className="flex items-center justify-between py-4 border-b" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-ctl flex items-center justify-center text-xs font-bold az-mono"
                    style={{ background: row.teal ? "rgba(45,212,191,0.15)" : "var(--surface-2)", color: row.teal ? "var(--teal)" : "var(--text-2)" }}
                  >
                    {row.badge}
                  </span>
                  <span style={{ color: "var(--text-2)" }}>{row.label}</span>
                </div>
                <span className={`font-display font-bold text-2xl ${row.teal ? "text-teal" : ""}`} style={!row.teal ? { color: "var(--text)" } : {}}>{row.pct}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {NODES.map((n, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-card border px-5 py-4"
                style={{
                  background: n.isYou ? "linear-gradient(135deg, rgba(45,212,191,0.08), var(--surface))" : "var(--surface)",
                  borderColor: n.isYou ? "rgba(45,212,191,0.35)" : "var(--line)",
                  marginLeft: i > 0 ? `${i * 20}px` : 0,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold az-mono text-xs"
                  style={{ background: n.isYou ? "var(--teal)" : "var(--surface-2)", color: n.isYou ? "#04201c" : "var(--text-2)" }}
                >
                  {n.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm az-mono">{n.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{n.sub}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold az-mono" style={{ color: "var(--teal)" }}>{n.rate}</div>
                  <div className="text-xs az-mono" style={{ color: "var(--muted)" }}>{n.rateLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
