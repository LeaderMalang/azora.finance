"use client";

import { useState } from "react";

const TELEGRAM_URL = "https://t.me/azorafinance";

export function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="rounded-card border p-4 shadow-2xl w-64 animate-modal-in"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#229ED9" />
              <path d="M5.5 11.8 17 7l-2 10-3.5-3.2-1.7 1.6.4-3.8 4.5-4.2-5.6 3.5L5.5 11.8Z" fill="white" />
            </svg>
            <span className="font-semibold text-sm">Azora Support</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--text-2)" }}>
            Have questions or need help? Reach us on Telegram — our team typically replies within minutes.
          </p>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="az-btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="white" fillOpacity="0.15" />
              <path d="M5.5 11.8 17 7l-2 10-3.5-3.2-1.7 1.6.4-3.8 4.5-4.2-5.6 3.5L5.5 11.8Z" fill="white" />
            </svg>
            Open Telegram
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-13 h-13 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{
          width: 52,
          height: 52,
          background: "linear-gradient(135deg, var(--teal), var(--teal-deep))",
        }}
        aria-label="Support"
      >
        {open ? (
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 11.8 17 7l-2 10-3.5-3.2-1.7 1.6.4-3.8 4.5-4.2-5.6 3.5L5.5 11.8Z" fill="white" />
          </svg>
        )}
      </button>
    </div>
  );
}
