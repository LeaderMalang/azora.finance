"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-ctl ${className}`}
      style={{ background: "var(--surface-2)" }}
    />
  );
}
