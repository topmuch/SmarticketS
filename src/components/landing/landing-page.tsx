"use client";

import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { DemoSection } from "./demo-section";
import { FeaturesSection } from "./features-section";
import { HowItWorksSection } from "./how-it-works";
import { ColisSection } from "./colis-section";
import { Footer } from "./footer";

interface LandingPageProps {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  const scrollToDemo = () => {
    if (typeof window !== "undefined" && (window as unknown as Record<string, () => void>).scrollToDemo) {
      (window as unknown as Record<string, () => void>).scrollToDemo();
    } else {
      const el = document.querySelector("#demo");
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={onLoginClick} onDemoClick={scrollToDemo} />
      <HeroSection onDemoClick={scrollToDemo} />
      <FeaturesSection />
      <DemoSection />
      <HowItWorksSection />
      <ColisSection />
      <Footer />
    </div>
  );
}
