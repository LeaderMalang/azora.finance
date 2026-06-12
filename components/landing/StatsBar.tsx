"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

function CountUp({ to, decimals = 0, prefix = "", suffix = "" }: { to: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const dur = 1800, start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(eased * to);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {prefix}{val.toFixed(decimals)}{suffix}
    </span>
  );
}

export function StatsBar() {
  const t = useTranslations("stats");
  return (
    <section className="py-10 border-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <div className="mx-auto max-w-site px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x" style={{ "--tw-divide-opacity": 1, borderColor: "var(--line)" } as React.CSSProperties}>
          {[
            { prefix: "$", val: 48.2, dec: 1, suffix: "M", label: t("tvl") },
            { val: 31840, dec: 0, label: t("stakers") },
            { val: 0.70, dec: 2, suffix: "%", label: t("daily"), teal: true },
            { prefix: "$", val: 9.4, dec: 1, suffix: "M", label: t("rewards") },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center py-7 px-4">
              <div className={`font-display font-bold text-3xl mb-1 az-mono ${s.teal ? "text-teal" : ""}`} style={s.teal ? {} : { color: "var(--text)" }}>
                <CountUp to={s.val} decimals={s.dec} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} />
              </div>
              <div className="text-sm az-mono" style={{ color: "var(--muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
