import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SmarticketS — Chauffeur',
  description: 'Application chauffeur SmarticketS - Livraison de colis',
  other: {
    'viewport': 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  },
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#111827] text-white antialiased">
      <meta name="theme-color" content="#0d1117" />
      {children}
    </div>
  );
}
