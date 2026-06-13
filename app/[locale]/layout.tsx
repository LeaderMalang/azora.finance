import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import { Providers } from "@/lib/providers";
import { RevealObserver } from "@/components/RevealObserver";

export const metadata: Metadata = {
  title: "Azora — Stake AZR. Earn 0.7% Every Day.",
  description: "Azora is a BSC-based DeFi staking protocol with a 3-level referral program and daily rewards.",
  metadataBase: new URL("https://azora.finance"),
  openGraph: { title: "Azora", description: "Stake AZR. Earn 0.7% every day.", images: ["/og.png"] },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  const messages = await getMessages();
  const cookieStore = cookies();
  const cookie = cookieStore.get("wagmi.store")?.value ?? null;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <RevealObserver />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers cookie={cookie}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
