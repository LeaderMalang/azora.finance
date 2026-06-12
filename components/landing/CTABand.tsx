"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export function CTABand({ locale }: { locale: string }) {
  const t = useTranslations("cta");
  return (
    <section
      className="py-28 text-center relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse at center, rgba(45,212,191,0.08) 0%, transparent 70%), var(--bg)` }}
    >
      <div className="mx-auto max-w-site px-6">
        <h2 className="font-display font-bold mb-4" style={{ fontSize: "clamp(34px,5vw,56px)", letterSpacing: "-0.03em" }}>
          {t("title")}
        </h2>
        <p className="text-lg mb-10 max-w-md mx-auto" style={{ color: "var(--text-2)" }}>{t("sub")}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href={`/${locale}/app/dashboard`} className="az-btn-primary">
            {t("btn")}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
          <a href="#faq" className="az-btn-ghost">Read the FAQ</a>
        </div>
      </div>
    </section>
  );
}
