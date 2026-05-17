'use client';

import Navigation from '@/components/landing/Navigation';
import HeroSection from '@/components/landing/HeroSection';
import ScrollingBanner from '@/components/landing/ScrollingBanner';
import ServicesSection from '@/components/landing/ServicesSection';
import ProcessSection from '@/components/landing/ProcessSection';
import WhyQRTransSection from '@/components/landing/WhyQRTransSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import BlogSection from '@/components/landing/BlogSection';
import CTAFinalSection from '@/components/landing/CTAFinalSection';
import Footer from '@/components/landing/Footer';
import WhatsAppFloat from '@/components/landing/WhatsAppFloat';

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main id="main-content">
        <HeroSection />
        <ScrollingBanner />
        <ServicesSection />
        <ProcessSection />
        <WhyQRTransSection />
        <TestimonialsSection />
        <BlogSection />
        <CTAFinalSection />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
