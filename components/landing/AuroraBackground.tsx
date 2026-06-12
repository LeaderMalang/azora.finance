"use client";

export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `repeating-linear-gradient(0deg, var(--grid-line) 0px, var(--grid-line) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, var(--grid-line) 0px, var(--grid-line) 1px, transparent 1px, transparent 60px)` }}
      />
      <div className="aurora-blob animate-drift1 w-[800px] h-[700px] bg-teal/20 top-[-200px] right-[-200px]" />
      <div className="aurora-blob animate-drift2 w-[700px] h-[600px] bg-[#3880ff]/15 bottom-[10%] left-[-100px]" />
      <div className="aurora-blob animate-drift3 w-[500px] h-[500px] bg-teal-bright/10 top-[40%] right-[20%]" />
    </div>
  );
}
