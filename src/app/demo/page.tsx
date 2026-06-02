// @ts-nocheck
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import WhatsAppFloat from '@/components/landing/WhatsAppFloat';
import DemoContent from './DemoContent';

export default function DemoPage() {
  return (
    <>
      <Navigation />
      <main className="pt-20 min-h-screen bg-gradient-to-b from-[#f8fafc] to-white">
        <DemoContent />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
