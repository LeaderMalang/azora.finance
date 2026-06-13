"use client";

export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" }[size];
  return (
    <svg className={`${s} animate-spin ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeOpacity="0.15" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--teal)" />
    </svg>
  );
}
