"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminFetch } from "@/lib/useAdminFetch";
import { AdminPageShell } from "@/components/ui/AdminPageShell";
import { AdminPaginator } from "@/components/ui/AdminPaginator";
import { Spinner } from "@/components/ui/Spinner";
import { TokenIcon } from "@/components/ui/TokenIcon";

const PAGE_SIZE = 10;
const STATUS_LABEL = ["Pending","Sent","Rejected","Cancelled"];
const STATUS_COLOR  = ["var(--warn)","var(--teal)","#ef4444","var(--muted)"];
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 97);
const isValidTxHash = (h: string) => /^0x[0-9a-fA-F]{64}$/.test(h);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminWithdrawalsPage() {
  const { isAdmin, adminFetch, addr } = useAdminFetch();

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assetFilter,  setAssetFilter]  = useState("");
  const [page,         setPage]         = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows,         setRows]         = useState<any[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [sentHash,     setSentHash]     = useState<Record<number,string>>({});

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p = page, s = search, sf = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String((p - 1) * PAGE_SIZE) });
      if (s)  params.set("search", s);
      if (sf) params.set("status", sf);
      const res = await adminFetch(`/api/admin/virtual-withdrawals?${params}`);
      if (res.ok) { const d = await res.json(); setRows(d.withdrawals ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  }, [adminFetch, page, search, statusFilter]);

  useEffect(() => { if (isAdmin) load(1, "", ""); }, [isAdmin]);

  const applySearch = () => { setPage(1); load(1, search, statusFilter); };

  const action = async (id: number, act: "send" | "reject") => {
    const res = await adminFetch("/api/admin/withdrawal-send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawalId: id, action: act, sentTxHash: sentHash[id] || null }),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.error ?? "Failed"); return; }
    load(page, search, statusFilter);
  };

  const sel = { background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" };

  return (
    <AdminPageShell title="Withdrawal Queue" sub="All virtual withdrawal requests with pagination" isAdmin={isAdmin} addr={addr}>
      {/* Filters */}
      <div className="az-card mb-4">
        <div className="flex flex-wrap gap-2">
          <input className="az-input flex-1 min-w-[180px] h-9 text-sm" placeholder="Search username or wallet…"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applySearch()} />
          <select className="rounded-ctl px-3 py-2 text-xs az-mono h-9" style={sel}
            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); load(1, search, e.target.value); }}>
            <option value="">All Status</option>
            <option value="0">Pending</option>
            <option value="1">Sent</option>
            <option value="2">Rejected</option>
            <option value="3">Cancelled</option>
          </select>
          <select className="rounded-ctl px-3 py-2 text-xs az-mono h-9" style={sel}
            value={assetFilter} onChange={e => setAssetFilter(e.target.value)}>
            <option value="">All Assets</option>
            <option value="0">AZR</option>
            <option value="1">USDT</option>
          </select>
          <button className="az-btn-primary h-9 px-4 text-sm" onClick={applySearch} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Search"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="az-card">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: "var(--text-2)" }}>No withdrawals found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                  {["#","User","Asset","Amount","To Wallet","Status","Date","TX Hash","Action"].map(h => (
                    <th key={h} className="text-left pb-3 font-normal pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {rows
                  .filter(w => assetFilter === "" || w.assetType === parseInt(assetFilter))
                  .map(w => {
                  const bscUrl = `${CHAIN_ID === 56 ? "https://bscscan.com/tx/" : "https://testnet.bscscan.com/tx/"}${w.sentTxHash}`;
                  return (
                    <tr key={w.id}>
                      <td className="py-3 pr-4 az-mono text-xs" style={{ color: "var(--muted)" }}>#{w.id}</td>
                      <td className="py-3 pr-4 az-mono text-xs font-semibold" style={{ color: "var(--teal)" }}>
                        {w.user?.username ?? w.user?.walletAddress?.slice(0,8)}.azr
                      </td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1">
                          <TokenIcon symbol={w.assetType === 0 ? "AZR" : "USDT"} size="sm" />
                          <span className="az-mono text-xs">{w.assetType === 0 ? "AZR" : "USDT"}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 az-mono font-semibold">{w.amount.toFixed(4)}</td>
                      <td className="py-3 pr-4 az-mono text-xs" style={{ color: "var(--muted)" }}>
                        {w.toWallet.slice(0,10)}…{w.toWallet.slice(-4)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="az-mono text-xs font-semibold" style={{ color: STATUS_COLOR[w.status] }}>
                          {STATUS_LABEL[w.status] ?? "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 az-mono text-xs" style={{ color: "var(--muted)" }}>
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        {w.sentTxHash && (
                          <div className="flex items-center gap-1">
                            {isValidTxHash(w.sentTxHash) ? (
                              <a href={bscUrl} target="_blank" rel="noopener noreferrer"
                                className="az-mono text-[10px] underline" style={{ color: "var(--teal)" }}>
                                {w.sentTxHash.slice(0,8)}…
                              </a>
                            ) : (
                              <span className="az-mono text-[10px]" style={{ color: "var(--muted)" }}>{w.sentTxHash.slice(0,8)}…</span>
                            )}
                            <button onClick={() => navigator.clipboard.writeText(w.sentTxHash)} style={{ color: "var(--muted)" }}>
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        {w.status === 0 && (
                          <div className="flex gap-1 items-center">
                            <input className="az-input h-6 text-[11px]" style={{ width: 90 }} placeholder="TX hash"
                              value={sentHash[w.id] ?? ""} onChange={e => setSentHash(p => ({ ...p, [w.id]: e.target.value }))} />
                            <button className="az-btn-primary text-[11px] px-2 py-0.5" onClick={() => action(w.id, "send")}>Sent</button>
                            <button className="text-[11px] px-2 py-0.5 rounded-ctl" style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }} onClick={() => action(w.id, "reject")}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <AdminPaginator page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
          onFirst={() => { setPage(1); load(1, search, statusFilter); }}
          onPrev={() => { const p = page - 1; setPage(p); load(p, search, statusFilter); }}
          onNext={() => { const p = page + 1; setPage(p); load(p, search, statusFilter); }}
          onLast={() => { setPage(totalPages); load(totalPages, search, statusFilter); }} />
      </div>
    </AdminPageShell>
  );
}
