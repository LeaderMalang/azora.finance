"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function YieldCalculator() {
  const t = useTranslations("calculator");
  const [amount, setAmount] = useState(5000);
  const daily = amount * 0.007;

  return (
    <section id="calc" className="pb-24">
      <div className="mx-auto max-w-site px-6">
        <div
          className="rounded-card border overflow-hidden"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 border-b md:border-b-0 md:border-r" style={{ borderColor: "var(--line)" }}>
              <span className="az-mono text-xs tracking-widest uppercase text-teal mb-3 block">{t("title")}</span>
              <p className="text-sm mb-6" style={{ color: "var(--text-2)" }}>{t("sub")}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: "var(--text-2)" }}>{t("label")}</span>
                <span className="font-display font-bold text-xl az-mono">
                  {amount.toLocaleString()} <small className="text-sm font-normal" style={{ color: "var(--muted)" }}>AZR</small>
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100000}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer mb-2"
                style={{ accentColor: "var(--teal)", background: `linear-gradient(to right, var(--teal) 0%, var(--teal) ${(amount / 100000) * 100}%, var(--bg-2) ${(amount / 100000) * 100}%, var(--bg-2) 100%)` }}
              />
              <div className="flex justify-between text-[11px] az-mono" style={{ color: "var(--muted)" }}>
                <span>50</span><span>25k</span><span>50k</span><span>75k</span><span>100k</span>
              </div>
              <p className="text-xs mt-5" style={{ color: "var(--muted)" }}>
                Projection at the current 0.70% daily rate on principal, simple (non-compounding), over the 150-day lock. Illustrative only.
              </p>
            </div>

            <div className="p-8 flex flex-col justify-center gap-4">
              {[
                { label: t("daily"), value: daily, big: false },
                { label: t("monthly"), value: daily * 30, big: false },
                { label: t("lock") + " Total", value: daily * 150, big: true },
                { label: t("apr"), value: null, apr: "255.5%", big: false },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 border-b last:border-0" style={{ borderColor: "var(--line)" }}>
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>{row.label}</span>
                  <span className={`az-mono font-bold ${row.big ? "text-2xl text-teal" : "text-base"}`} style={!row.big ? { color: "var(--text)" } : {}}>
                    {row.apr ?? `${row.value!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZR`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
