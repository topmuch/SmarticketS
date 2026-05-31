'use client';

import Link from 'next/link';
import { QrCode, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecondaryPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function SecondaryPageLayout({ children, title, subtitle }: SecondaryPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(10,37,64,0.08)] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF6B35] shadow-[0_4px_12px_rgba(255,107,53,0.25)]">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#0A2540] tracking-tight">
                SmarticketS
              </span>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="text-[#475569] hover:text-[#0A2540] text-sm font-medium gap-2">
                <ArrowLeft className="w-4 h-4 rotate-180" />
                Accueil
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0A2540] mb-4 leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base sm:text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0A2540] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">SmarticketS</span>
            </div>
            <p className="text-white/50 text-sm">
              &copy; 2026 SmarticketS. Tous droits réservés. Made with ❤️ au Sénégal
            </p>
            <div className="flex items-center gap-4">
              <Link href="/confidentialite" className="text-white/50 hover:text-white text-sm transition-colors">
                Confidentialité
              </Link>
              <Link href="/cgu" className="text-white/50 hover:text-white text-sm transition-colors">
                CGU
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
