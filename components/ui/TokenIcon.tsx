export function TokenIcon({ symbol, size = "md" }: { symbol: "AZR" | "USDT" | "BNB"; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "sm" ? "w-5 h-5 text-[10px]" :
    size === "lg" ? "w-10 h-10 text-lg" :
    "w-7 h-7 text-sm";

  if (symbol === "USDT") return (
    <span className={`${cls} rounded-full flex items-center justify-center font-bold flex-shrink-0`} style={{ background: "#26A17B", color: "white" }}>₮</span>
  );
  if (symbol === "BNB") return (
    <span className={`${cls} rounded-full flex items-center justify-center flex-shrink-0`} style={{ background: "#F0B90B" }}>
      <svg viewBox="0 0 24 24" fill="white" className="w-[58%] h-[58%]">
        <path d="M12 2l2.4 2.4-2.4 2.4-2.4-2.4L12 2zm4.8 4.8l2.4 2.4-2.4 2.4-2.4-2.4 2.4-2.4zM7.2 6.8l2.4 2.4-2.4 2.4-2.4-2.4 2.4-2.4zm4.8 4.8l2.4 2.4-2.4 2.4-2.4-2.4 2.4-2.4zm4.8 4.8L19.2 19l-2.4-2.4 2.4-2.4zM7.2 16.4L9.6 19l-2.4-2.6z"/>
      </svg>
    </span>
  );
  return (
    <span className={`${cls} rounded-full flex items-center justify-center flex-shrink-0`} style={{ background: "linear-gradient(135deg, #2dd4bf, #0f766e)" }}>
      <svg viewBox="0 0 32 32" fill="none" className="w-[55%] h-[55%]">
        <path d="M16 4 L27 22 H5 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 11 L21 20 H11 Z" fill="white" />
      </svg>
    </span>
  );
}
