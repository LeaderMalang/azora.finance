"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "عربي" },
];

export function LandingNav({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const switchLang = (lang: string) => {
    setMobileOpen(false);
    const newPath = pathname.replace(`/${locale}`, `/${lang}`);
    router.push(newPath);
  };

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV_LINKS = [
    { href: "#how", label: t("howItWorks") },
    { href: "#calc", label: t("calculator") },
    { href: "#referral", label: t("referrals") },
    { href: "#faq", label: t("faq") },
  ];

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        background: scrolled || mobileOpen ? "rgba(var(--bg-rgb, 6,10,18),0.95)" : "transparent",
        backdropFilter: scrolled || mobileOpen ? "blur(20px)" : "none",
        borderBottom: scrolled || mobileOpen ? "1px solid var(--line)" : "1px solid transparent",
      }}
    >
      {/* Main nav bar */}
      <div className="mx-auto flex max-w-site items-center gap-4 px-6 py-4">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 font-display font-semibold text-lg"
          style={{ color: "var(--text)" }}
          onClick={() => setMobileOpen(false)}
        >
          <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
            <path d="M16 2 L29 24 H3 Z" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 11 L22.5 22 H9.5 Z" fill="var(--teal)" />
          </svg>
          Azora
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6 ml-4">
          {NAV_LINKS.map((item) => (
            <a key={item.href} href={item.href} className="text-[15px] transition-colors hover:text-teal" style={{ color: "var(--text-2)" }}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {/* Desktop language switcher */}
          {mounted && (
            <div className="hidden md:flex items-center gap-1">
              {LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => switchLang(lang.code)}
                  className="px-2.5 py-1.5 rounded-ctl text-xs font-semibold az-mono transition-all"
                  style={{
                    borderColor: locale === lang.code ? "var(--teal)" : "var(--line)",
                    border: "1px solid",
                    color: locale === lang.code ? "var(--teal)" : "var(--text-2)",
                    background: locale === lang.code ? "rgba(45,212,191,0.06)" : "transparent",
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}

          {/* Desktop theme toggle */}
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-ctl border transition-colors"
            style={{ borderColor: "var(--line)", color: "var(--text-2)" }}
            onClick={() => setMobileOpen((p) => !p)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: mobileOpen ? "400px" : "0" }}
      >
        <div className="px-6 pb-5 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
          {/* Nav links */}
          <nav className="space-y-1 mb-5">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 py-3 text-[15px] font-medium transition-colors hover:text-teal border-b"
                style={{ color: "var(--text-2)", borderColor: "var(--line)" }}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Language + theme row */}
          {mounted && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => switchLang(lang.code)}
                    className="px-3 py-1.5 rounded-ctl text-xs font-semibold az-mono transition-all"
                    style={{
                      borderColor: locale === lang.code ? "var(--teal)" : "var(--line)",
                      border: "1px solid",
                      color: locale === lang.code ? "var(--teal)" : "var(--text-2)",
                      background: locale === lang.code ? "rgba(45,212,191,0.06)" : "transparent",
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-ctl border transition-colors hover:border-teal"
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
