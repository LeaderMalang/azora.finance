"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

export function LandingNav({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(var(--bg-rgb, 6,10,18),0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
      }}
    >
      <div className="mx-auto flex max-w-site items-center gap-8 px-6 py-4">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 font-display font-semibold text-lg" style={{ color: "var(--text)" }}>
          <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
            <path d="M16 2 L29 24 H3 Z" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 11 L22.5 22 H9.5 Z" fill="var(--teal)" />
          </svg>
          Azora
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-4">
          {[
            { href: "#how", label: t("howItWorks") },
            { href: "#calc", label: t("calculator") },
            { href: "#referral", label: t("referrals") },
            { href: "#faq", label: t("faq") },
          ].map((item) => (
            <a key={item.href} href={item.href} className="text-[15px] transition-colors hover:text-teal" style={{ color: "var(--text-2)" }}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-ctl border transition-colors hover:border-teal"
              style={{ borderColor: "var(--line)", color: "var(--text-2)" }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
                </svg>
              )}
            </button>
          )}
          <Link href={`/${locale}/app/dashboard`} className="az-btn-primary text-sm px-4 py-2">
            {t("launchApp")}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
