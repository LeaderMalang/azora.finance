"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppStore {
  locale: string;
  setLocale: (l: string) => void;
  connectModalOpen: boolean;
  setConnectModalOpen: (v: boolean) => void;
  registerStep: number;
  setRegisterStep: (v: number) => void;
  activeChainId: 56 | 97;
  setActiveChainId: (id: 56 | 97) => void;
}

const defaultChainId = (Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 97) === 56 ? 56 : 97) as 56 | 97;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (l) => set({ locale: l }),
      connectModalOpen: false,
      setConnectModalOpen: (v) => set({ connectModalOpen: v }),
      registerStep: 1,
      setRegisterStep: (v) => set({ registerStep: v }),
      activeChainId: defaultChainId,
      setActiveChainId: (id) => set({ activeChainId: id }),
    }),
    { name: "azora-app-state-v1" }
  )
);
