"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useAccount, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useEffect, useState } from "react";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { useSidebar } from "./SidebarContext";
import { useAppStore } from "@/lib/store";

const NAV = [
  {
    key: "dashboard",
    icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  },
  { key: "deposit", icon: '<path d="M12 3v12M8 11l4 4 4-4M19 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2"/>' },
  { key: "swap", icon: '<path d="M7 4v13M7 4 3 8M7 4l4 4M17 20V7M17 20l4-4M17 20l-4-4"/>' },
  { key: "stake", icon: '<path d="M12 2v20M5 9l7-7 7 7M5 15l7 7 7-7"/>' },
  {
    key: "referrals",
    icon: '<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6M14 20c0-2.6 1.8-4.4 3.8-4.4"/>',
  },
  { key: "withdrawals", icon: '<path d="M12 3v12M8 11l4 4 4-4M5 21h14"/>' },
];

export function AppSidebar({ locale, isOwner }: { locale: string; isOwner: boolean }) {
  const username = useAppStore((s) => s.username);
  const t = useTranslations("app");
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { address: addr } = useAccount();
  const { disconnect } = useDisconnect();
  const { open: openWalletModal } = useWeb3Modal();
  const [mounted, setMounted] = useState(false);
  const { open, toggle } = useSidebar();

  useEffect(() => setMounted(true), []);

  const short = addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "";

  const labels: Record<string, string> = {
    dashboard: t("dashboard"),
    deposit: "Deposit",
    swap: t("swap"),
    stake: t("stake"),
    referrals: t("referrals"),
    withdrawals: t("withdrawals"),
    admin: "Admin",
  };

  const allNav = [
    ...NAV,
    ...(isOwner ? [{ key: "admin", icon: '<path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z"/><path d="M12 8v4M12 16h.01"/>' }] : []),
  ];

  return (
    <aside
      className={[
        "flex flex-col h-full w-64 border-r",
        "fixed md:relative inset-y-0 left-0 z-50",
        "transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      ].join(" ")}
      style={{ background: "var(--bg-2)", borderColor: "var(--line)" }}
    >
      <div className="p-5 pb-4">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 font-display font-semibold text-lg"
          style={{ color: "var(--text)" }}
          onClick={() => open && toggle()}
        >
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
            <path d="M16 2 L29 24 H3 Z" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 11 L22.5 22 H9.5 Z" fill="var(--teal)" />
          </svg>
          Azora
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1 py-2">
        {allNav.map((item) => {
          const href = `/${locale}/app/${item.key}`;
          const isActive = pathname.includes(`/app/${item.key}`);
          return (
            <Link
              key={item.key}
              href={href}
              className={`side-link ${isActive ? "active" : ""}`}
              onClick={() => open && toggle()}
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: item.icon }} />
              <span>{labels[item.key]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-2" style={{ borderColor: "var(--line)" }}>
        <NetworkSwitcher />
        {addr ? (
          <>
            <div
              className="flex items-center gap-3 rounded-ctl px-3 py-2.5"
              style={{ background: "var(--elevated)" }}
            >
              <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg, var(--teal), var(--teal-deep))" }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{username || short}</div>
                <div className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>{short}</div>
              </div>
            </div>
            <div className="flex gap-2">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex-1 flex items-center justify-center h-9 rounded-ctl border transition-colors hover:border-teal"
                  style={{ borderColor: "var(--line)", color: "var(--text-2)" }}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>
                  )}
                </button>
              )}
              <button
                onClick={() => disconnect()}
                className="flex-1 flex items-center justify-center h-9 rounded-ctl border text-xs az-mono transition-colors hover:border-danger"
                style={{ borderColor: "var(--line)", color: "var(--muted)" }}
                title={t("disconnect")}
              >
                ⏻
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => openWalletModal()}
              className="az-btn-primary w-full text-sm"
            >
              Connect Wallet
            </button>
            {mounted && (
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex-1 flex items-center justify-center h-9 rounded-ctl border transition-colors hover:border-teal"
                  style={{ borderColor: "var(--line)", color: "var(--text-2)" }}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
