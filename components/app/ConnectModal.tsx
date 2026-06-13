"use client";

import { useTranslations } from "next-intl";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useDisconnect,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useState, useEffect } from "react";
import { CONTRACTS, STAKING_ABI } from "@/lib/contracts";
import { targetChain } from "@/lib/wagmi";
import { Spinner } from "@/components/ui/Spinner";

const WALLETS = [
  { name: "MetaMask", emoji: "🦊", desc: "Most popular EVM wallet" },
  { name: "Trust Wallet", emoji: "🛡️", desc: "Mobile-first, multi-chain" },
  { name: "WalletConnect", emoji: "🔗", desc: "Scan with any wallet" },
  { name: "Coinbase Wallet", emoji: "🔵", desc: "Self-custody by Coinbase" },
];

export function ConnectModal() {
  const t = useTranslations("connect");
  const { open } = useWeb3Modal();
  const { isConnected, address: addr } = useAccount();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [referral, setReferral] = useState("");
  const [err, setErr] = useState("");
  const [registering, setRegistering] = useState(false);
  const [isPendingReg, setIsPendingReg] = useState(false);
  const [regTxHash, setRegTxHash] = useState<`0x${string}` | undefined>();

  // Always query the correct chain regardless of connected wallet's chain
  const {
    data: userInfo,
    isFetched: userInfoFetched,
    isError: userInfoError,
    refetch: retryUserInfo,
  } = useReadContract({
    address: CONTRACTS[targetChain.id as 56 | 97].staking,
    abi: STAKING_ABI,
    functionName: "usersByAddress",
    args: addr ? [addr] : undefined,
    chainId: targetChain.id,
    query: {
      enabled: !!addr && isConnected,
      refetchInterval: isPendingReg ? 2000 : false,
      retry: 3,
    },
  });
  const isRegistered = Boolean(userInfo?.[2]);

  // True while wallet is connected but on-chain status not yet confirmed
  const isChecking = isConnected && !userInfoFetched && !userInfoError;

  // Watch for on-chain revert to surface the error instead of looping forever
  const { data: txReceipt } = useWaitForTransactionReceipt({
    hash: regTxHash,
    query: { enabled: !!regTxHash },
  });
  useEffect(() => {
    if (!txReceipt) return;
    if (txReceipt.status === "reverted") {
      setIsPendingReg(false);
      setRegistering(false);
      setRegTxHash(undefined);
      setErr("Transaction reverted — username may already be taken or referral is invalid.");
    }
  }, [txReceipt]);

  // Advance steps only after the query has confirmed status (not while loading)
  useEffect(() => {
    if (!isConnected) {
      setStep(0);
    } else if (userInfoFetched && !userInfoError && !isRegistered) {
      setStep(1);
    }
  }, [isConnected, isRegistered, userInfoFetched, userInfoError]);

  // Stop polling once registration is confirmed
  useEffect(() => {
    if (isRegistered) setIsPendingReg(false);
  }, [isRegistered]);

  const register = async () => {
    const u = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
    if (!u || u.length > 32) { setErr("Username must be 1–32 characters [a-z0-9_.]"); return; }
    setErr("");
    setRegistering(true);
    try {
      const chainId = targetChain.id as 56 | 97;
      const hash = await writeContractAsync({
        address: CONTRACTS[chainId].staking,
        abi: STAKING_ABI,
        functionName: "registerUser",
        args: [u, referral.trim().replace(/\.azr$/, "")],
      });
      setRegTxHash(hash);
      setIsPendingReg(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message.slice(0, 120) : "Transaction failed");
      setRegistering(false);
    }
  };

  if (isRegistered) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(6,10,18,0.92)", backdropFilter: "blur(16px)" }}>
      <div
        className="w-full max-w-[460px] mx-4 rounded-card border p-8 animate-modal-in"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
            <path d="M16 2 L29 24 H3 Z" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 11 L22.5 22 H9.5 Z" fill="var(--teal)" />
          </svg>
          <span className="font-display font-semibold text-xl">Azora</span>
        </div>

        {userInfoError ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <svg className="w-10 h-10" style={{ color: "#ff6b6b" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              Unable to verify your account. Please check your connection and try again.
            </p>
            <button className="az-btn-ghost text-sm px-4 py-2" onClick={() => retryUserInfo()}>
              Retry
            </button>
            <button
              className="text-sm"
              style={{ color: "var(--muted)" }}
              onClick={() => { disconnect(); setStep(0); }}
            >
              ← Choose another wallet
            </button>
          </div>
        ) : isChecking ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size="lg" />
            <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>
              Verifying your account…
            </p>
          </div>
        ) : step === 0 ? (
          <>
            <h2 className="font-display font-bold text-2xl mb-2">{t("title")}</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-2)" }}>{t("sub")}</p>
            <div className="space-y-3">
              {WALLETS.map((w) => (
                <button
                  key={w.name}
                  onClick={() => open()}
                  className="w-full flex items-center gap-4 rounded-ctl border px-4 py-3.5 transition-all text-left hover:border-teal"
                  style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}
                >
                  <span className="text-2xl">{w.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{w.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{w.desc}</div>
                  </div>
                  <svg className="w-4 h-4" style={{ color: "var(--muted)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              ))}
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h2 className="font-display font-bold text-2xl mb-2">{t("registerTitle")}</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-2)" }}>{t("registerSub")}</p>

            {isPendingReg ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Spinner size="lg" />
                <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>
                  Confirming on-chain… this takes 15–30 seconds.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs az-mono mb-2 block" style={{ color: "var(--muted)" }}>Username</label>
                  <div className="relative">
                    <input
                      className="az-input pr-12"
                      placeholder="satoshi"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setErr(""); }}
                      onKeyDown={(e) => e.key === "Enter" && register()}
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm az-mono" style={{ color: "var(--muted)" }}>.azr</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs az-mono mb-2 block" style={{ color: "var(--muted)" }}>
                    Referral username <span style={{ color: "var(--muted)", opacity: 0.6 }}>(optional)</span>
                  </label>
                  <input
                    className="az-input"
                    placeholder="friend.azr"
                    value={referral}
                    onChange={(e) => setReferral(e.target.value)}
                  />
                </div>
                {err && <p className="text-xs" style={{ color: "#ff6b6b" }}>{err}</p>}
                <button
                  className="az-btn-primary w-full"
                  onClick={register}
                  disabled={registering || isPendingReg}
                >
                  {registering ? t("registering") : t("register")}
                  {!registering && <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                </button>
                <button
                  className="w-full text-center text-sm"
                  style={{ color: "var(--muted)" }}
                  onClick={() => { disconnect(); setStep(0); }}
                >
                  ← Choose another wallet
                </button>
              </div>
            )}
          </>
        ) : null}

        <div className="flex justify-center gap-2 mt-6">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: step === i ? "var(--teal)" : "var(--line)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
