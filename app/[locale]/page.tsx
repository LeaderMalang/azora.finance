import { getTranslations } from "next-intl/server";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { StatsBar } from "@/components/landing/StatsBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { YieldCalculator } from "@/components/landing/YieldCalculator";
import { Features } from "@/components/landing/Features";
import { ReferralProgram } from "@/components/landing/ReferralProgram";
import { FAQ } from "@/components/landing/FAQ";
import { CTABand } from "@/components/landing/CTABand";
import { Partners } from "@/components/landing/Partners";
import { PriceTicker } from "@/components/landing/PriceTicker";
import { Footer } from "@/components/landing/Footer";

export default async function LandingPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  await getTranslations({ locale, namespace: "hero" });
  return (
    <>
      <AuroraBackground />
      <LandingNav locale={locale} />
      <div className="pt-[73px]">
        <PriceTicker />
      </div>
      <main>
        <Hero locale={locale} />
        <StatsBar />
        <HowItWorks />
        <YieldCalculator />
        <Features />
        <ReferralProgram />
        <FAQ />
        <Partners />
        <CTABand locale={locale} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
