"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "عربي" },
];

export function Footer({ locale }: { locale: string }) {
  const t = useTranslations("footer");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const switchLocale = (lang: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${lang}`);
    router.push(newPath);
  };

  return (
    <footer className="py-16 border-t reveal" style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}>
      <div className="mx-auto max-w-site px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div>
            <Link href={`/${locale}`} className="flex items-center gap-2.5 font-display font-semibold text-lg mb-4" style={{ color: "var(--text)" }}>
              <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
                <path d="M16 2 L29 24 H3 Z" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M16 11 L22.5 22 H9.5 Z" fill="var(--teal)" />
              </svg>
              Azora
            </Link>
            <p className="text-sm mb-5" style={{ color: "var(--text-2)" }}>{t("tagline")}</p>
            <div className="flex gap-2 flex-wrap">
              {LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => switchLocale(lang.code)}
                  className="px-3 py-1.5 rounded-ctl text-xs az-mono border transition-colors"
                  style={{
                    borderColor: locale === lang.code ? "var(--teal)" : "var(--line)",
                    color: locale === lang.code ? "var(--teal)" : "var(--text-2)",
                    background: locale === lang.code ? "rgba(45,212,191,0.06)" : "transparent",
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Protocol</h4>
            {[
              { href: "#how", label: "How it works" },
              { href: "#features", label: "Features" },
              { href: "#calc", label: "Yield estimator" },
              { href: "#referral", label: "Referrals" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="block text-sm py-1.5 transition-colors hover:text-teal" style={{ color: "var(--text-2)" }}>{l.label}</a>
            ))}
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">App</h4>
            {[
              { href: `/${locale}/app/dashboard`, label: "Dashboard" },
              { href: `/${locale}/app/swap`, label: "Swap" },
              { href: `/${locale}/app/stake`, label: "Stake" },
              { href: `/${locale}/app/referrals`, label: "Referrals" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="block text-sm py-1.5 transition-colors hover:text-teal" style={{ color: "var(--text-2)" }}>{l.label}</Link>
            ))}
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Resources</h4>
            {[
              { href: "#faq", label: "FAQ" },
              { href: `https://testnet.bscscan.com/address/0x8BcC54F3587ea804fE3054B3eB75D77cf23C240d`, label: "BscScan Contract", external: true },
              { href: `https://testnet.bscscan.com/address/0x45490483797889A8Be1946CE0013DA0b9F1ADae6`, label: "AZR Token", external: true },
            ].map((l) => (
              <a key={l.href} href={l.href} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined} className="block text-sm py-1.5 transition-colors hover:text-teal" style={{ color: "var(--text-2)" }}>{l.label}</a>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 pt-8 border-t" style={{ borderColor: "var(--line)" }}>
          <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>{t("rights")}</span>
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-ctl border text-xs az-mono transition-colors hover:border-teal"
              style={{ borderColor: "var(--line)", color: "var(--text-2)" }}
            >
              {theme === "dark" ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>
              )}
              Theme
            </button>
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          {t("disclaimer")}
        </p>
      </div>
    </footer>
  );
}
