"use client";

import { useTranslations } from "next-intl";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useAppStore } from "@/lib/store";

const WALLETS = [
  { name: "MetaMask",       emoji: "🦊",  desc: "Most popular EVM wallet" },
  { name: "Trust Wallet",   emoji: "🛡️", desc: "Mobile-first, multi-chain" },
  { name: "WalletConnect",  emoji: "🔗",  desc: "Scan with any wallet" },
  { name: "Coinbase Wallet",emoji: "🔵",  desc: "Self-custody by Coinbase" },
];

export function ConnectModal() {
  const t = useTranslations("connect");
  const { open } = useWeb3Modal();
  const { isConnected, address: addr } = useAccount();
  const { disconnect } = useDisconnect();
  const setUsername = useAppStore((s) => s.setUsername);

  const [step, setStep]               = useState(0);   // 0=wallet pick, 1=register form
  const [usernameInput, setUsernameInput] = useState("");
  const [referral, setReferral]       = useState(() => {
    if (typeof window === "undefined") return "";
    // Read from URL param first, then sessionStorage
    const urlRef = new URLSearchParams(window.location.search).get("ref");
    if (urlRef) sessionStorage.setItem("pendingReferral", urlRef);
    return sessionStorage.getItem("pendingReferral") ?? "";
  });
  const [err, setErr]                 = useState("");
  const [checking, setChecking]       = useState(false);
  const [checkError, setCheckError]   = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered]   = useState(false);

  // On wallet connect: check DB for existing user
  const checkAccount = async (wallet: string, attempt = 1) => {
    setChecking(true);
    setCheckError(false);
    try {
      const r = await fetch(`/api/users?wallet=${wallet}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.user?.username) {
        setUsername(d.user.username);
        setRegistered(true);
      } else {
        setStep(1);
      }
    } catch {
      if (attempt < 3) {
        // Auto-retry up to 3 times with increasing delay (handles cold-start crashes on cPanel)
        setTimeout(() => checkAccount(wallet, attempt + 1), attempt * 1500);
        return; // keep checking=true during retry
      }
      setCheckError(true);
    } finally {
      if (attempt >= 3) setChecking(false);
      else if (attempt === 1) setChecking(false); // will be set true again on retry
    }
  };

  useEffect(() => {
    if (!isConnected || !addr) { setStep(0); return; }
    checkAccount(addr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, addr]);

  if (registered) return null;

  const handleRegister = async () => {
    const u = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
    if (!u || u.length < 2 || u.length > 32) {
      setErr("Username must be 2–32 characters (a-z, 0-9, _, .)");
      return;
    }
    if (!addr) return;
    setErr("");
    setRegistering(true);
    try {
      const ref = referral.trim().replace(/\.azr$/, "");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, walletAddress: addr, referralUsername: ref || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Registration failed. Username may already be taken.");
        return;
      }
      // Success — set username in store and close modal
      setUsername(u);
      sessionStorage.removeItem("pendingReferral");
      setRegistered(true);
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setRegistering(false);
    }
  };

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

        {/* Step 0: Choose wallet */}
        {step === 0 && !checking && (
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
        )}

        {/* Checking DB */}
        {checking && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size="lg" />
            <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>Verifying your account…</p>
          </div>
        )}

        {/* DB check error — retry instead of silently showing registration form */}
        {checkError && !checking && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <svg className="w-10 h-10" style={{ color: "#f3ba2f" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>Unable to verify your account. Check your connection and try again.</p>
            <button className="az-btn-primary px-6 py-2 text-sm" onClick={() => addr && checkAccount(addr)}>Retry</button>
            <button className="text-sm" style={{ color: "var(--muted)" }} onClick={() => { disconnect(); setStep(0); setCheckError(false); }}>
              ← Choose another wallet
            </button>
          </div>
        )}

        {/* Step 1: Register username (DB-only, no gas) */}
        {step === 1 && !checking && (
          <>
            <h2 className="font-display font-bold text-2xl mb-2">{t("registerTitle")}</h2>
            <p className="text-sm mb-2" style={{ color: "var(--text-2)" }}>{t("registerSub")}</p>
            <div className="flex items-center gap-2 mb-6 text-[11px] az-mono px-3 py-2 rounded-ctl" style={{ background: "rgba(45,212,191,0.06)", color: "var(--teal)" }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              No gas fee — instant, free registration
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs az-mono mb-2 block" style={{ color: "var(--muted)" }}>Username</label>
                <div className="relative">
                  <input
                    className="az-input pr-12"
                    placeholder="satoshi"
                    value={usernameInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const clean = raw.toLowerCase().replace(/[^a-z0-9_.]/g, "");
                      setUsernameInput(raw);
                      setErr(raw !== clean && raw.length > 0 ? `Only letters, numbers, _ and . allowed. Will be saved as: "${clean}"` : "");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm az-mono" style={{ color: "var(--muted)" }}>.azr</span>
                </div>
              </div>
              <div>
                <label className="text-xs az-mono mb-2 block" style={{ color: "var(--muted)" }}>
                  Referrer username <span style={{ opacity: 0.6 }}>(optional)</span>
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
                onClick={handleRegister}
                disabled={registering}
              >
                {registering
                  ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Creating account…</span>
                  : <span className="flex items-center justify-center gap-2">{t("register")}<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
                }
              </button>
              <button
                className="w-full text-center text-sm"
                style={{ color: "var(--muted)" }}
                onClick={() => { disconnect(); setStep(0); setRegistered(false); }}
              >
                ← Choose another wallet
              </button>
            </div>
          </>
        )}

        <div className="flex justify-center gap-2 mt-6">
          {[0, 1].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full transition-all"
              style={{ background: step === i ? "var(--teal)" : "var(--line)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
