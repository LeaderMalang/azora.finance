"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminFetch } from "@/lib/useAdminFetch";
import { AdminPageShell } from "@/components/ui/AdminPageShell";
import { AdminPaginator } from "@/components/ui/AdminPaginator";
import { Spinner } from "@/components/ui/Spinner";

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { isAdmin, adminFetch, addr } = useAdminFetch();

  const [search,    setSearch]    = useState("");
  const [hasUpline, setHasUpline] = useState("");
  const [page,      setPage]      = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows,      setRows]      = useState<any[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detail,    setDetail]    = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p = page, s = search, hu = hasUpline) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String((p - 1) * PAGE_SIZE) });
      if (s)  params.set("search", s);
      if (hu) params.set("hasUpline", hu);
      const res = await adminFetch(`/api/admin/users-list?${params}`);
      if (res.ok) { const d = await res.json(); setRows(d.users ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  }, [adminFetch, page, search, hasUpline]);

  useEffect(() => { if (isAdmin) load(1, "", ""); }, [isAdmin]);

  const applySearch = () => { setPage(1); setDetail(null); load(1, search, hasUpline); };

  const loadDetail = async (wallet: string) => {
    setDetailLoading(true);
    try {
      const res = await adminFetch(`/api/admin/user-data?query=${encodeURIComponent(wallet)}`);
      if (res.ok) setDetail(await res.json());
    } finally { setDetailLoading(false); }
  };

  const sel = { background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" };

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between text-xs py-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
      <span style={{ color: "var(--text-2)" }}>{label}</span>
      <span className="az-mono font-semibold text-right ml-4">{value}</span>
    </div>
  );

  return (
    <AdminPageShell title="User Data Lookup" sub="Search and paginate all registered users" isAdmin={isAdmin} addr={addr}>
      {/* Filters */}
      <div className="az-card mb-4">
        <div className="flex flex-wrap gap-2">
          <input className="az-input flex-1 min-w-[200px] h-9 text-sm" placeholder="Search wallet or username…"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applySearch()} />
          <select className="rounded-ctl px-3 py-2 text-xs az-mono h-9" style={sel}
            value={hasUpline} onChange={e => { setHasUpline(e.target.value); setPage(1); load(1, search, e.target.value); }}>
            <option value="">All Users</option>
            <option value="yes">Has Upline</option>
            <option value="no">No Upline</option>
          </select>
          <button className="az-btn-primary h-9 px-4 text-sm" onClick={applySearch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Search"}
          </button>
        </div>
      </div>

      <div className={`grid gap-4 ${detail ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Table */}
        <div className="az-card">
          {loading && rows.length === 0 ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--text-2)" }}>No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    {["#","Username","Wallet","USDT","AZR","Stakes","Referrals","Upline","Joined",""].map(h => (
                      <th key={h} className="text-left pb-3 font-normal pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {rows.map((u: {
                    seqId: number; username: string; walletAddress: string;
                    userBalance: { usdtBalance: number; azrBalance: number } | null;
                    referredByUser: { username: string; seqId: number } | null;
                    _count: { virtualStakes: number; referrals: number };
                    createdAt: string;
                  }) => (
                    <tr key={u.seqId} className="cursor-pointer hover:opacity-80" onClick={() => loadDetail(u.walletAddress)}>
                      <td className="py-2.5 pr-3 az-mono text-xs" style={{ color: "var(--muted)" }}>#{u.seqId}</td>
                      <td className="py-2.5 pr-3 az-mono text-xs font-semibold" style={{ color: "var(--teal)" }}>{u.username}.azr</td>
                      <td className="py-2.5 pr-3 az-mono text-xs" style={{ color: "var(--muted)" }}>{u.walletAddress.slice(0,8)}…{u.walletAddress.slice(-4)}</td>
                      <td className="py-2.5 pr-3 az-mono text-xs">{(u.userBalance?.usdtBalance ?? 0).toFixed(2)}</td>
                      <td className="py-2.5 pr-3 az-mono text-xs">{(u.userBalance?.azrBalance ?? 0).toFixed(2)}</td>
                      <td className="py-2.5 pr-3 az-mono text-xs">{u._count.virtualStakes}</td>
                      <td className="py-2.5 pr-3 az-mono text-xs">{u._count.referrals}</td>
                      <td className="py-2.5 pr-3 az-mono text-xs" style={{ color: "var(--muted)" }}>{u.referredByUser ? `${u.referredByUser.username} (#${u.referredByUser.seqId})` : "—"}</td>
                      <td className="py-2.5 pr-3 az-mono text-xs" style={{ color: "var(--muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-2.5">
                        <button className="text-[11px] px-2 py-0.5 rounded-ctl" style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}>Detail</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AdminPaginator page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
            onFirst={() => { setPage(1); load(1, search, hasUpline); }}
            onPrev={() => { const p = page - 1; setPage(p); load(p, search, hasUpline); }}
            onNext={() => { const p = page + 1; setPage(p); load(p, search, hasUpline); }}
            onLast={() => { setPage(totalPages); load(totalPages, search, hasUpline); }} />
        </div>

        {/* Detail panel */}
        {(detail || detailLoading) && (
          <div className="az-card">
            {detailLoading ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : detail?.error ? (
              <p className="text-sm" style={{ color: "#ef4444" }}>{detail.error}</p>
            ) : detail?.user ? (() => {
              const u = detail.user;
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">{u.username}.azr <span className="az-mono text-xs" style={{ color: "var(--muted)" }}>#{u.seqId}</span></h3>
                    <button onClick={() => setDetail(null)} style={{ color: "var(--muted)" }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  {row("Wallet", <span className="break-all">{u.walletAddress}</span>)}
                  {row("Joined", new Date(u.createdAt).toLocaleString())}
                  {row("USDT Balance", <span style={{ color: "var(--teal)" }}>{(u.userBalance?.usdtBalance ?? 0).toFixed(4)} USDT</span>)}
                  {row("AZR Balance", <span style={{ color: "var(--teal)" }}>{(u.userBalance?.azrBalance ?? 0).toFixed(4)} AZR</span>)}
                  {row("Total Staked", <span style={{ color: "var(--teal)" }}>{detail.totalStaked?.toFixed(4)} AZR</span>)}
                  {row("Total Deposited", <span style={{ color: "var(--teal)" }}>{detail.totalDeposited?.toFixed(4)} USDT</span>)}
                  {row("Total Claims", <span style={{ color: "var(--teal)" }}>{detail.totalClaims?.toFixed(4)} AZR</span>)}
                  {row("Commissions", <span style={{ color: "var(--teal)" }}>{detail.totalCommissions?.toFixed(4)} AZR</span>)}
                  {row("Upline", u.referredByUser ? `${u.referredByUser.username}.azr (#${u.referredByUser.seqId})` : "None")}
                  {row("Downlines (L1)", u.referrals?.length ? u.referrals.map((r: {username: string; seqId: number}) => `${r.username}.azr`).join(", ") : "None")}
                  {row("Active Stakes", u.virtualStakes?.filter((s: {isActive: boolean}) => s.isActive).length ?? 0)}
                  {row("Virtual Withdrawals", u.virtualWithdrawals?.length ?? 0)}
                </>
              );
            })() : null}
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
