"use client";

import { AppSidebar } from "@/components/app/AppSidebar";
import { ConnectModal } from "@/components/app/ConnectModal";
import { ToastProvider } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { SupportButton } from "@/components/ui/SupportButton";
import { SidebarContext } from "@/components/app/SidebarContext";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import { useState, useEffect } from "react";
import { CONTRACTS, STAKING_ABI } from "@/lib/contracts";
import { targetChain } from "@/lib/wagmi";

function WrongNetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
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
      <button
        onClick={() => switchChain({ chainId: targetChain.id })}
        className="ml-2 px-3 py-1 rounded-ctl text-xs font-semibold transition-colors hover:opacity-80"
        style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308" }}
      >
        Switch Network
      </button>
    </div>
  );
}

function AppShell({ children, locale }: { children: React.ReactNode; locale: string }) {
  const { isConnected, address: addr } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [wasConnected, setWasConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isConnected) {
      setWasConnected(true);
    } else if (wasConnected && mounted) {
      window.location.href = `/${locale}`;
    }
  }, [isConnected, mounted]);

  const { data: userInfo } = useReadContract({
    address: CONTRACTS[targetChain.id as 56 | 97].staking,
    abi: STAKING_ABI,
    functionName: "usersByAddress",
    args: addr ? [addr] : undefined,
    chainId: targetChain.id,
    query: { enabled: !!addr && isConnected, retry: 3 },
  });

  const { data: ownerAddr } = useReadContract({
    address: CONTRACTS[targetChain.id as 56 | 97].staking,
    abi: STAKING_ABI,
    functionName: "owner",
    chainId: targetChain.id,
    query: { enabled: true },
  });

  const isRegistered = Boolean(userInfo?.[2]);
  const username = (userInfo?.[1] as string) ?? "";
  const isOwner = !!addr && !!ownerAddr && addr.toLowerCase() === (ownerAddr as string).toLowerCase();

  const { data: referredByData } = useReadContract({
    address: CONTRACTS[targetChain.id as 56 | 97].staking,
    abi: STAKING_ABI,
    functionName: "referredBy",
    args: username ? [username] : undefined,
    chainId: targetChain.id,
    query: { enabled: !!username && isRegistered },
  });

  // Sync every registered wallet to DB on app load so referral network is populated
  useEffect(() => {
    if (!isRegistered || !addr || !username) return;
    const referrer = (referredByData as string) ?? "";
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, walletAddress: addr, referralUsername: referrer }),
    }).catch(() => {});
  }, [isRegistered, addr, username, referredByData]);

  const showModal = mounted && isConnected && !isRegistered;

  return (
    <SidebarContext.Provider value={{ open: sidebarOpen, toggle: () => setSidebarOpen((p) => !p) }}>
      <ToastProvider>
        {showModal && <ConnectModal />}
        <SupportButton />
        {/* Mobile overlay — closes sidebar when tapping outside */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
          <AppSidebar locale={locale} username={username} isOwner={isOwner} />
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <WrongNetworkBanner />
            {!mounted ? (
              <div className="flex flex-1 items-center justify-center" style={{ minHeight: "60vh" }}>
                <Spinner size="lg" />
              </div>
            ) : children}
          </div>
        </div>
      </ToastProvider>
    </SidebarContext.Provider>
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
