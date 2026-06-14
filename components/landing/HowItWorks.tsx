"use client";

import { useTranslations } from "next-intl";

const icons = [
  <svg key={0} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h4" /></svg>,
  <svg key={1} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M5 9l7-7 7 7M5 15l7 7 7-7" /></svg>,
  <svg key={2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17l6-6 4 4 8-8M21 7v5M21 7h-5" /></svg>,
];

const stagger = ["d1", "d2", "d3"];

export function HowItWorks() {
  const t = useTranslations("howItWorks");
  const steps = [
    { num: "01", title: t("step1Title"), desc: t("step1Desc") },
    { num: "02", title: t("step2Title"), desc: t("step2Desc") },
    { num: "03", title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <section id="how" className="py-24">
      <div className="mx-auto max-w-site px-6">
        <div className="mb-14 max-w-xl reveal">
          <span className="az-mono text-xs tracking-widest uppercase text-teal mb-3 block">{t("title")}</span>
          <h2 className="font-display font-bold mb-4" style={{ fontSize: "clamp(34px,5vw,56px)", letterSpacing: "-0.03em" }}>Three steps. Completely on-chain.</h2>
          <p style={{ color: "var(--text-2)" }}>{t("sub")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className={`az-card relative overflow-hidden how-step reveal ${stagger[i]}`}
            >
              <div className="flex items-start gap-4 mb-5">
                <span className="font-mono font-bold text-5xl opacity-10 leading-none select-none" style={{ color: "var(--teal)" }}>{s.num}</span>
                <div className="w-11 h-11 rounded-ctl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(45,212,191,0.08)", color: "var(--teal)" }}>
                  <div className="w-5 h-5">{icons[i]}</div>
                </div>
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{s.desc}</p>
              {i < 2 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" opacity="0.4"><path d="M9 5l7 7-7 7" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
