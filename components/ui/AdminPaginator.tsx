"use client";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}

export function AdminPaginator({ page, totalPages, total, pageSize, onFirst, onPrev, onNext, onLast }: Props) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  const btnBase = "text-xs az-mono px-2.5 py-1.5 rounded-ctl border transition-all select-none";
  const btnActive = `${btnBase} hover:border-teal hover:text-teal`;
  const btnDisabled = `${btnBase} opacity-30 cursor-not-allowed`;

  return (
    <div className="flex items-center justify-between mt-4 pt-4 flex-wrap gap-2" style={{ borderTop: "1px solid var(--line)" }}>
      {/* Left controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onFirst}
          disabled={page <= 1}
          className={page <= 1 ? btnDisabled : btnActive}
          style={{ border: "1px solid var(--line)", color: "var(--text-2)" }}
        >
          First
        </button>
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className={page <= 1 ? btnDisabled : btnActive}
          style={{ border: "1px solid var(--line)", color: "var(--text-2)" }}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>

      {/* Centre — page indicator */}
      <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>
        Page{" "}
        <strong style={{ color: "var(--text)" }}>{page}</strong>
        {" "}of{" "}
        <strong style={{ color: "var(--text)" }}>{totalPages}</strong>
        {total > pageSize && (
          <span style={{ color: "var(--muted)" }}>{" · "}{from}–{to} of <strong style={{ color: "var(--teal)" }}>{total}</strong></span>
        )}
      </span>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className={page >= totalPages ? btnDisabled : btnActive}
          style={{ border: "1px solid var(--line)", color: "var(--text-2)" }}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button
          onClick={onLast}
          disabled={page >= totalPages}
          className={page >= totalPages ? btnDisabled : btnActive}
          style={{ border: "1px solid var(--line)", color: "var(--text-2)" }}
        >
          Last
        </button>
      </div>
    </div>
  );
}
