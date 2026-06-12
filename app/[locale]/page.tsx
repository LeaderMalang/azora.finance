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
import { Footer } from "@/components/landing/Footer";

export default function LandingPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return (
    <>
      <AuroraBackground />
      <LandingNav locale={locale} />
      <main>
        <Hero locale={locale} />
        <StatsBar />
        <HowItWorks />
        <YieldCalculator />
        <Features />
        <ReferralProgram />
        <FAQ />
        <CTABand locale={locale} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
