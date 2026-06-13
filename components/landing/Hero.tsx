"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function LiveCard() {
  const STAKED = 12480.62;
  const RATE_PER_SEC = STAKED * 0.007 / 86400;
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setEarned((Date.now() - t0) / 1000 * RATE_PER_SEC), 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="az-card-glow relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <span className="az-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>AI MONITOR · AZR</span>
        <span className="flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-mono" style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-glow-pulse" />
          LIVE
        </span>
      </div>
      <div className="flex items-end gap-3 mb-1">
        <span className="font-display font-bold text-4xl" style={{ color: "var(--text)" }}>
          {(STAKED + earned).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
        <span className="mb-1 text-xs font-mono" style={{ color: "var(--teal)" }}>
          +{RATE_PER_SEC.toFixed(4)}/s
        </span>
      </div>
      <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>AI-monitored stake · accruing 0.7% / day</p>
      <div className="h-12 mb-5 overflow-hidden opacity-60">
        <Sparkline />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
        {[
          { k: "AI daily yield", v: "+87.36", up: true },
          { k: "Unlocks in", v: "128d" },
          { k: "Referral", v: "+412", up: true },
        ].map((s) => (
          <div key={s.k}>
            <div className="text-[11px] az-mono mb-1" style={{ color: "var(--muted)" }}>{s.k}</div>
            <div className="text-sm font-semibold az-mono" style={{ color: s.up ? "var(--teal)" : "var(--text)" }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const pts = Array.from({ length: 40 }, (_, i) => 30 + Math.random() * 30 + i * 0.4);
    const w = 280, h = 48;
    const min = Math.min(...pts), max = Math.max(...pts);
    const xs = pts.map((_, i) => (i / (pts.length - 1)) * w);
    const ys = pts.map((v) => h - ((v - min) / (max - min)) * h * 0.9 - h * 0.05);
    const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
    if (ref.current) {
      ref.current.innerHTML = `<path d="${d}" fill="none" stroke="var(--teal)" stroke-width="1.5" stroke-linecap="round"/>`;
    }
  }, []);
  return <svg ref={ref} viewBox="0 0 280 48" className="w-full h-full" preserveAspectRatio="none" />;
}

export function Hero({ locale }: { locale: string }) {
  const t = useTranslations("hero");

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16">
      <div className="mx-auto w-full max-w-site px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="az-chip mb-6 inline-flex reveal">
              <span className="w-2 h-2 rounded-full bg-teal animate-glow-pulse" />
              {t("eyebrow")}
            </span>
            <h1
              className="font-display font-bold mb-6 leading-[0.98] reveal d1"
              style={{ fontSize: "clamp(44px,6.6vw,84px)", letterSpacing: "-0.035em" }}
            >
              Stake AZR.<br />
              Powered by{" "}
              <em
                className="not-italic"
                style={{ background: "linear-gradient(135deg, var(--teal) 0%, var(--teal-bright) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                AI.
              </em>
            </h1>
            <p className="text-lg mb-8 max-w-lg reveal d2" style={{ color: "var(--text-2)" }}>
              {t("sub")}
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-8 reveal d3">
              <Link href={`/${locale}/app/dashboard`} className="az-btn-primary">
                {t("cta1")}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <a href="#how" className="az-btn-ghost">
                {t("cta2")}
              </a>
            </div>
            <div className="flex items-center gap-3 flex-wrap reveal d3">
              {[
                { icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z" /></svg>, label: t("trust1") },
                { icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>, label: t("trust2") },
                { icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>, label: t("trust3") },
              ].map((c) => (
                <span key={c.label} className="az-chip text-xs">
                  {c.icon}
                  {c.label}
                </span>
              ))}
            </div>
          </div>
          <div className="lg:pl-8 reveal d2">
            <LiveCard />
          </div>
        </div>
      </div>
    </section>
  );
}
