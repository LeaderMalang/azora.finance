"use client";

import { ThemeProvider } from "next-themes";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { wagmiConfig, projectId, targetChain } from "./wagmi";
import { ReactNode, useState, useEffect } from "react";
import { cookieToInitialState } from "wagmi";

export function Providers({ children, cookie }: { children: ReactNode; cookie?: string | null }) {
  const [queryClient] = useState(() => new QueryClient());
  const initialState = cookieToInitialState(wagmiConfig, cookie);

  useEffect(() => {
    createWeb3Modal({
      wagmiConfig,
      projectId,
      defaultChain: targetChain,
      allowUnsupportedChain: true,
      themeMode: "dark",
      themeVariables: { "--w3m-accent": "#2dd4bf", "--w3m-border-radius-master": "12px" },
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange={false}>
      <WagmiProvider config={wagmiConfig} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
