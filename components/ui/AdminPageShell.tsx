"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface Props {
  title: string;
  sub?: string;
  isAdmin: boolean | null;
  addr?: string;
  children: React.ReactNode;
}

export function AdminPageShell({ title, sub, isAdmin, addr, children }: Props) {
  const { locale } = useParams<{ locale: string }>();

  if (!addr) {
    return (
      <div className="p-8 flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <p style={{ color: "var(--text-2)" }}>Connect your wallet to access admin pages.</p>
      </div>
    );
  }

  if (isAdmin === null) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3" style={{ minHeight: "60vh" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "var(--text-2)" }}>Verifying admin access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4" style={{ minHeight: "60vh" }}>
        <svg className="w-12 h-12" style={{ color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <p className="font-semibold">Access Denied</p>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>Your wallet is not authorized as an admin.</p>
        <p className="text-xs az-mono" style={{ color: "var(--muted)" }}>{addr}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-app">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/app/admin`} className="text-xs az-mono flex items-center gap-1" style={{ color: "var(--muted)" }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Admin
        </Link>
        <span style={{ color: "var(--line)" }}>/</span>
        <span className="text-xs az-mono" style={{ color: "var(--text-2)" }}>{title}</span>
      </div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl mb-1">{title}</h1>
        {sub && <p className="text-sm" style={{ color: "var(--text-2)" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}
