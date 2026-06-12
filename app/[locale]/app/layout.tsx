"use client";

import { AppSidebar } from "@/components/app/AppSidebar";
import { ConnectModal } from "@/components/app/ConnectModal";
import { ToastProvider } from "@/components/ui/Toast";
import { useAccount } from "wagmi";

function WrongNetworkBanner() {
  const { isConnected, chainId } = useAccount();
  if (!isConnected || chainId === 56 || chainId === 97) return null;
  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium"
      style={{
        background: "rgba(234,179,8,0.10)",
        color: "#eab308",
        borderBottom: "1px solid rgba(234,179,8,0.18)",
      }}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      Please switch to BNB Smart Chain to use Azora
    </div>
  );
}

function AppShell({ children, locale }: { children: React.ReactNode; locale: string }) {
  const { isConnected } = useAccount();

  return (
    <ToastProvider>
      {!isConnected && <ConnectModal />}
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
        <AppSidebar locale={locale} />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <WrongNetworkBanner />
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}

export default function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return <AppShell locale={params.locale}>{children}</AppShell>;
}
