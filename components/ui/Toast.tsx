"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Toast { id: string; msg: string; type?: "success" | "error" }

const ToastCtx = createContext<{ toast: (msg: string, type?: "success" | "error") => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-ctl border px-4 py-3 text-sm animate-toastIn"
            style={{
              background: "var(--elevated)",
              borderColor: t.type === "error" ? "rgba(255,107,107,0.4)" : "rgba(45,212,191,0.3)",
              color: "var(--text)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              pointerEvents: "auto",
            }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: t.type === "error" ? "rgba(255,107,107,0.15)" : "rgba(45,212,191,0.15)" }}
            >
              {t.type === "error" ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
