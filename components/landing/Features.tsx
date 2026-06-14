"use client";

import { useTranslations } from "next-intl";

const icons = [
  <svg key={0} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z" /></svg>,
  <svg key={1} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3.3 2.7-6 6-6M14 20c0-2.6 1.8-4.4 3.8-4.4" /></svg>,
  <svg key={2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4" /><rect x="3" y="4" width="18" height="16" rx="2" /></svg>,
  <svg key={3} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="12" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 12h20" /></svg>,
  <svg key={4} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5h3.2a1.8 1.8 0 0 1 0 3.6H9.5h3.5a1.8 1.8 0 0 1 0 3.6H9" /></svg>,
  <svg key={5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
];

const stagger = ["d1", "d2", "d3", "d1", "d2", "d3"];

export function Features() {
  const t = useTranslations("features");
  const feats = [
    { icon: 0, title: t("f1Title"), desc: t("f1Desc") },
    { icon: 1, title: t("f2Title"), desc: t("f2Desc") },
    { icon: 2, title: t("f3Title"), desc: t("f3Desc") },
    { icon: 3, title: t("f4Title"), desc: t("f4Desc") },
    { icon: 4, title: t("f5Title"), desc: t("f5Desc") },
    { icon: 5, title: t("f6Title"), desc: t("f6Desc") },
  ];

  return (
    <section id="features" className="py-24" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-site px-6">
        <div className="mb-14 max-w-xl reveal">
          <span className="az-mono text-xs tracking-widest uppercase text-teal mb-3 block">{t("title")}</span>
          <h2 className="font-display font-bold mb-4" style={{ fontSize: "clamp(34px,5vw,56px)", letterSpacing: "-0.03em" }}>Smart contracts behind every action.</h2>
          <p style={{ color: "var(--text-2)" }}>{t("sub")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {feats.map((f, i) => (
            <div
              key={i}
              className={`rounded-card border p-7 cursor-default reveal feat-card ${stagger[i]}`}
              style={{ background: "var(--bg)" }}
            >
              <div className="w-11 h-11 rounded-ctl flex items-center justify-center mb-5 transition-colors" style={{ background: "rgba(45,212,191,0.08)", color: "var(--teal)" }}>
                <div className="w-5 h-5">{icons[f.icon]}</div>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2.5">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
