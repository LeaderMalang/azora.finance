"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

type VirtualStake = {
  id: number;
  amount: number;
  startTime: string;
  lastClaimTime: string;
  unlockTime: string;
  isActive: boolean;
  pendingRewards: number;
  unlocked: boolean;
};

type ClaimRow = { date: string; amount: string };

const RATE_PER_SEC = 0.007 / 86400;

export default function StakePage() {
  const t = useTranslations("staking");
  const { address: addr } = useAccount();
  const { toast } = useToast();

  const [amount, setAmount]     = useState("");
  const [pending, setPending]   = useState(false);
  const [azrBalance, setAzrBalance]  = useState(0);
  const [stakes, setStakes]          = useState<VirtualStake[]>([]);
  const [lockDays, setLockDays]      = useState(150);
  const [minStake, setMinStake]      = useState(50);
  const [claimHistory, setClaimHistory] = useState<ClaimRow[]>([]);
  // Live pending display updated every second
  const [liveRewards, setLiveRewards] = useState<Record<number, number>>({});

  const fetchBalance = useCallback(async () => {
    if (!addr) return;
    const res = await fetch(`/api/virtual/balance?wallet=${addr}`);
    if (res.ok) { const d = await res.json(); setAzrBalance(d.azrBalance ?? 0); }
  }, [addr]);

  const fetchStakes = useCallback(async () => {
    if (!addr) return;
    const res = await fetch(`/api/virtual/stake?wallet=${addr}`);
    if (res.ok) {
      const d = await res.json();
      setStakes(d.stakes ?? []);
      if (d.lockDays) setLockDays(d.lockDays);
      if (d.minStake) setMinStake(d.minStake);
    }
  }, [addr]);

  const fetchClaimHistory = useCallback(async () => {
    if (!addr) return;
    const res = await fetch(`/api/claim-history?wallet=${addr}`);
    if (res.ok) {
      const rows = await res.json();
      setClaimHistory(rows.map((r: { claimedAt: string; amount: string }) => ({
        date: new Date(r.claimedAt).toLocaleString(),
        amount: (parseFloat(r.amount) / 1e18).toFixed(4),
      })));
    }
  }, [addr]);

  useEffect(() => {
    fetchBalance();
    fetchStakes();
    fetchClaimHistory();
  }, [fetchBalance, fetchStakes, fetchClaimHistory]);

  // Live pending rewards ticker
  useEffect(() => {
    if (stakes.length === 0) return;
    const active = stakes.filter((s) => s.isActive);
    const id = setInterval(() => {
      const now = Date.now() / 1000;
      const map: Record<number, number> = {};
      for (const s of active) {
        const base = s.pendingRewards;
        const extra = s.amount * RATE_PER_SEC * (now - (new Date(s.lastClaimTime).getTime() / 1000));
        map[s.id] = Math.max(0, base + extra - s.pendingRewards) + s.pendingRewards;
      }
      setLiveRewards(map);
    }, 1000);
    return () => clearInterval(id);
  }, [stakes]);

  const doStake = async () => {
    if (!addr || !amount) return;
    const amt = parseFloat(amount);
    if (amt < minStake) { toast(`Minimum stake is ${minStake} AZR`, "error"); return; }
    if (amt > azrBalance) { toast("Insufficient AZR balance", "error"); return; }
    setPending(true);
    try {
      const res = await fetch("/api/virtual/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr, amount: amt }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error ?? "Failed", "error"); return; }
      toast(`Staked ${amt} AZR · locked for ${lockDays} days`);
      setAmount("");
      fetchBalance();
      fetchStakes();
    } catch { toast("Network error", "error"); }
    finally { setPending(false); }
  };

  const doClaim = async (stakeId?: number) => {
    if (!addr) return;
    setPending(true);
    try {
      const res = await fetch("/api/virtual/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr, stakeId }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error ?? "Claim failed", "error"); return; }
      toast(`Claimed ${d.claimed.toFixed(4)} AZR`);
      fetchBalance();
      fetchStakes();
      fetchClaimHistory();
    } catch { toast("Network error", "error"); }
    finally { setPending(false); }
  };

  const activeStakes = stakes.filter((s) => s.isActive);
  const estDaily = amount ? (parseFloat(amount || "0") * 0.007).toFixed(2) : "0.00";
  const totalPending = activeStakes.reduce((s, p) => s + (liveRewards[p.id] ?? p.pendingRewards), 0);

  return (
    <>
      <AppTopbar title={t("title")} sub={`Lock AZR for ${lockDays} days · 0.7% daily`} />
      <div className="p-4 md:p-8 max-w-app">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Stake form */}
          <div className="az-card">
            <h3 className="font-semibold mb-5">New Stake</h3>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs az-mono" style={{ color: "var(--muted)" }}>Amount (AZR)</label>
                <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>Balance: {azrBalance.toFixed(4)}</span>
              </div>
              <div className="flex gap-2">
                <input className="az-input flex-1" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button className="px-3 rounded-ctl text-xs font-semibold" style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }} onClick={() => setAmount(azrBalance.toFixed(4))}>MAX</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-ctl" style={{ background: "var(--bg-2)" }}>
              {[
                { k: t("minStake"), v: `${minStake} AZR` },
                { k: t("lockPeriod"), v: `${lockDays}d` },
                { k: t("daily"), v: "0.7%" },
              ].map((s) => (
                <div key={s.k} className="text-center">
                  <div className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>{s.k}</div>
                  <div className="text-sm font-semibold az-mono mt-1">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-5 text-sm">
              <span style={{ color: "var(--text-2)" }}>{t("estDaily")}</span>
              <span className="font-bold az-mono text-teal">+{estDaily} AZR</span>
            </div>
            {pending && (
              <div className="flex items-center gap-2 text-xs py-2 px-3 rounded-ctl mb-3" style={{ background: "rgba(45,212,191,0.08)", color: "var(--teal)" }}>
                <Spinner size="sm" /> Processing…
              </div>
            )}
            <button className="az-btn-primary w-full" onClick={doStake} disabled={pending || !amount || !addr || parseFloat(amount || "0") < minStake || parseFloat(amount || "0") > azrBalance}>
              {pending ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Processing…</span> : t("stakeBtn")}
            </button>
          </div>

          {/* Summary */}
          <div className="az-card-glow">
            <h3 className="font-semibold mb-4">Your Positions</h3>
            {activeStakes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-sm" style={{ color: "var(--text-2)" }}>
                <p>No active positions.</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Stake AZR to start earning 0.7% daily.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-ctl px-3 py-2.5" style={{ background: "var(--bg-2)" }}>
                    <div className="text-[11px] az-mono mb-1" style={{ color: "var(--muted)" }}>Active positions</div>
                    <div className="font-bold az-mono" style={{ color: "var(--teal)" }}>{activeStakes.length}</div>
                  </div>
                  <div className="rounded-ctl px-3 py-2.5" style={{ background: "var(--bg-2)" }}>
                    <div className="text-[11px] az-mono mb-1" style={{ color: "var(--muted)" }}>Pending rewards</div>
                    <div className="font-bold az-mono">{totalPending.toFixed(4)} AZR</div>
                  </div>
                </div>
                {activeStakes.length > 1 && (
                  <button className="az-btn-primary w-full mb-2 text-sm" onClick={() => doClaim()} disabled={pending}>
                    {pending ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Processing…</span> : "Claim All Rewards"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Active positions table */}
        {activeStakes.length > 0 && (
          <div className="az-card mb-6">
            <h3 className="font-semibold mb-4">Active Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    <th className="text-left pb-3 font-normal">#</th>
                    <th className="text-left pb-3 font-normal">Staked</th>
                    <th className="text-left pb-3 font-normal">Unlocks</th>
                    <th className="text-left pb-3 font-normal">Pending</th>
                    <th className="text-right pb-3 font-normal">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {activeStakes.map((pos) => {
                    const livePending = liveRewards[pos.id] ?? pos.pendingRewards;
                    return (
                      <tr key={pos.id}>
                        <td className="py-3 az-mono text-xs" style={{ color: "var(--muted)" }}>#{pos.id}</td>
                        <td className="py-3 font-semibold az-mono">{pos.amount.toFixed(2)} AZR</td>
                        <td className="py-3 az-mono text-xs" style={{ color: pos.unlocked ? "var(--teal)" : "var(--text-2)" }}>
                          {pos.unlocked ? "Unlocked ✓" : new Date(pos.unlockTime).toLocaleDateString()}
                        </td>
                        <td className="py-3 az-mono text-xs" style={{ color: "var(--teal)" }}>
                          {livePending.toFixed(4)}
                        </td>
                        <td className="py-3 text-right">
                          <button className="az-btn-primary text-xs px-3 py-1.5" onClick={() => doClaim(pos.id)} disabled={pending}>
                            {pending ? <Spinner size="sm" /> : "Claim"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Claim history */}
        {addr && (
          <div className="az-card">
            <h3 className="font-semibold mb-4">Claim History</h3>
            {claimHistory.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: "var(--text-2)" }}>
                No claim history yet. Claim your rewards to see them here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                      <th className="text-left pb-3 font-normal">#</th>
                      <th className="text-left pb-3 font-normal">Date</th>
                      <th className="text-right pb-3 font-normal">Amount (AZR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {claimHistory.map((c, i) => (
                      <tr key={i}>
                        <td className="py-2.5 az-mono text-xs" style={{ color: "var(--muted)" }}>{claimHistory.length - i}</td>
                        <td className="py-2.5 text-xs" style={{ color: "var(--text-2)" }}>{c.date}</td>
                        <td className="py-2.5 az-mono text-right font-semibold" style={{ color: "var(--teal)" }}>+{c.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
