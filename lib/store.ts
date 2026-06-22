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
  username: string;
  setUsername: (u: string) => void;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
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
      username: "",
      setUsername: (u) => set({ username: u }),
      isAdmin: false,
      setIsAdmin: (v) => set({ isAdmin: v }),
    }),
    {
      name: "azora-app-state-v1",
      partialize: (state) => ({
        locale: state.locale,
        activeChainId: state.activeChainId,
        // username excluded — loaded fresh each session, not persisted
      }),
    }
  )
);
