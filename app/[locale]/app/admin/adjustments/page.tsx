"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminFetch } from "@/lib/useAdminFetch";
import { AdminPageShell } from "@/components/ui/AdminPageShell";
import { AdminPaginator } from "@/components/ui/AdminPaginator";
import { Spinner } from "@/components/ui/Spinner";

const PAGE_SIZE = 10;

export default function AdminAdjustmentsPage() {
  const { isAdmin, adminFetch, addr } = useAdminFetch();

  const [search, setSearch] = useState("");
  const [asset,  setAsset]  = useState("");
  const [action, setAction] = useState("");
  const [page,   setPage]   = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows,   setRows]   = useState<any[]>([]);
  const [total,  setTotal]  = useState(0);
  const [loading,setLoading]= useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p = page, s = search, a = asset, ac = action) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String((p - 1) * PAGE_SIZE) });
      if (s)  params.set("search", s);
      if (a)  params.set("asset", a);
      if (ac) params.set("action", ac);
      const res = await adminFetch(`/api/admin/balance-adjustments?${params}`);
      if (res.ok) { const d = await res.json(); setRows(d.adjustments ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  }, [adminFetch, page, search, asset, action]);

  useEffect(() => { if (isAdmin) load(1, "", "", ""); }, [isAdmin]);

  const applySearch = () => { setPage(1); load(1, search, asset, action); };

  const sel = { background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" };

  return (
    <AdminPageShell title="Balance Adjustment History" sub="All admin credit and debit operations" isAdmin={isAdmin} addr={addr}>
      {/* Filters */}
      <div className="az-card mb-4">
        <div className="flex flex-wrap gap-2">
          <input className="az-input flex-1 min-w-[200px] h-9 text-sm" placeholder="Search username or wallet…"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applySearch()} />
          <select className="rounded-ctl px-3 py-2 text-xs az-mono h-9" style={sel}
            value={asset} onChange={e => { setAsset(e.target.value); setPage(1); load(1, search, e.target.value, action); }}>
            <option value="">All Assets</option>
            <option value="azr">AZR</option>
            <option value="usdt">USDT</option>
          </select>
          <select className="rounded-ctl px-3 py-2 text-xs az-mono h-9" style={sel}
            value={action} onChange={e => { setAction(e.target.value); setPage(1); load(1, search, asset, e.target.value); }}>
            <option value="">All Actions</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
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
          <p className="text-sm text-center py-10" style={{ color: "var(--text-2)" }}>No adjustments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                  {["#","User","Wallet","Action","Asset","Amount","By Admin","Date"].map(h => (
                    <th key={h} className="text-left pb-3 font-normal pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {rows.map((b: {
                  id: number;
                  user: { username: string; walletAddress: string };
                  action: string; asset: string; amount: number;
                  adminWallet: string; note: string; createdAt: string;
                }) => (
                  <tr key={b.id}>
                    <td className="py-3 pr-4 az-mono text-xs" style={{ color: "var(--muted)" }}>#{b.id}</td>
                    <td className="py-3 pr-4 az-mono text-xs font-semibold" style={{ color: "var(--teal)" }}>
                      {b.user?.username}.azr
                    </td>
                    <td className="py-3 pr-4 az-mono text-xs" style={{ color: "var(--muted)" }}>
                      {b.user?.walletAddress?.slice(0,8)}…{b.user?.walletAddress?.slice(-4)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="az-mono text-[11px] font-semibold px-2 py-0.5 rounded"
                        style={{ background: b.action === "credit" ? "rgba(45,212,191,0.1)" : "rgba(239,68,68,0.1)", color: b.action === "credit" ? "var(--teal)" : "#ef4444" }}>
                        {b.action === "credit" ? "+" : "−"} {b.action}
                      </span>
                    </td>
                    <td className="py-3 pr-4 az-mono text-xs uppercase">{b.asset}</td>
                    <td className="py-3 pr-4 az-mono font-semibold">{b.amount.toFixed(4)}</td>
                    <td className="py-3 pr-4 az-mono text-xs" style={{ color: "var(--muted)" }}>
                      {b.adminWallet.slice(0,8)}…{b.adminWallet.slice(-4)}
                    </td>
                    <td className="py-3 az-mono text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPaginator page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
          onFirst={() => { setPage(1); load(1, search, asset, action); }}
          onPrev={() => { const p = page - 1; setPage(p); load(p, search, asset, action); }}
          onNext={() => { const p = page + 1; setPage(p); load(p, search, asset, action); }}
          onLast={() => { setPage(totalPages); load(totalPages, search, asset, action); }} />
      </div>
    </AdminPageShell>
  );
}
