"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function FAQ() {
  const t = useTranslations("faq");
  const [open, setOpen] = useState<number | null>(null);

  const items = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
    { q: t("q6"), a: t("a6") },
  ];

  return (
    <section id="faq" className="py-24" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-site px-6 max-w-3xl">
        <div className="text-center mb-12">
          <span className="az-mono text-xs tracking-widest uppercase text-teal mb-3 block">{t("title")}</span>
          <h2 className="font-display font-bold" style={{ fontSize: "clamp(34px,5vw,56px)", letterSpacing: "-0.03em" }}>Questions, answered.</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          {items.map((item, i) => (
            <div key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
              <button
                className="flex w-full items-center justify-between gap-4 py-5 text-left font-semibold transition-colors"
                style={{ color: open === i ? "var(--teal)" : "var(--text)" }}
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{item.q}</span>
                <svg
                  className="w-5 h-5 flex-shrink-0 transition-transform duration-300"
                  style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)", color: open === i ? "var(--teal)" : "var(--muted)" }}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: open === i ? "300px" : "0" }}
              >
                <p className="pb-5 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
