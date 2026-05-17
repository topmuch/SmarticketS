import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegistration } from "@/components/pwa-registration";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "QRTrans - Traçabilité & sécurité logistique pour le transport inter-villes",
    template: "%s | QRTrans",
  },
  description: "QRTrans : activez, tracez et sécurisez vos colis entre villes. Notifications WhatsApp automatiques, code PIN de retrait, suivi GPS en temps réel. Solution pour chauffeurs et agences de transport au Sénégal.",
  keywords: ["QRTrans", "QR code", "colis", "transport inter-villes", "Sénégal", "traçabilité", "logistique", "WhatsApp", "suivi colis", "chauffeur", "agence transport", "PIN retrait", "GPS"],
  authors: [{ name: "QRTrans Team" }],
  creator: "MMASOLUTION",
  publisher: "QRTrans",
  metadataBase: new URL("https://qrtrans.com"),

  // PWA Icons
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/icons/maskable-icon-512x512.png", color: "#ff7f00" },
    ],
  },

  // Open Graph
  openGraph: {
    title: "QRTrans - Traçabilité & sécurité logistique | Transport inter-villes",
    description: "Activez, tracez et sécurisez vos colis entre villes au Sénégal. Notifications WhatsApp, code PIN, suivi GPS temps réel.",
    url: "https://qrtrans.com",
    siteName: "QRTrans",
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "QRTrans Logo",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "QRTrans - Traçabilité & sécurité logistique | Transport inter-villes",
    description: "Activez, tracez et sécurisez vos colis entre villes au Sénégal. Notifications WhatsApp, code PIN, suivi GPS temps réel.",
    images: ["/icons/icon-512x512.png"],
  },

  // PWA
  manifest: "/manifest.json",

  // App info
  applicationName: "QRTrans",
  appleWebApp: {
    capable: true,
    title: "QRTrans",
    statusBarStyle: "black-translucent",
    startupImage: [
      { url: "/icons/icon-512x512.png", media: "(device-width: 320px)" },
    ],
  },

  // Format detection
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },

  // Other
  robots: {
    index: true,
    follow: true,
  },

  // Alternates
  alternates: {
    canonical: "https://qrtrans.com",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Theme script - runs before render to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="QRTrans" />
        <meta name="application-name" content="QRTrans" />
        <meta name="msapplication-TileColor" content="#ff7f00" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${inter.variable} antialiased bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white`}
      >
        {/* Skip to main content - Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#FF6B35] focus:text-white focus:rounded-lg focus:font-semibold focus:text-sm focus:shadow-lg"
        >
          Aller au contenu principal
        </a>

        {/* JSON-LD Structured Data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "QRTrans",
              url: "https://qrtrans.com",
              logo: "https://qrtrans.com/icons/icon-512x512.png",
              description: "Plateforme de traçabilité et sécurité logistique pour le transport inter-villes au Sénégal.",
              address: {
                "@type": "PostalAddress",
                addressCountry: "SN",
                addressLocality: "Dakar"
              },
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+221-78-485-82-26",
                contactType: "customer service",
                availableLanguage: ["fr", "wo", "en"]
              },
              sameAs: [
                "https://wa.me/221784858226"
              ],
              foundingDate: "2024"
            }),
          }}
        />

        {/* JSON-LD Structured Data: SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "QRTrans",
              applicationCategory: "LogisticsApplication",
              operatingSystem: "Web, iOS, Android",
              description: "Solution de traçabilité et sécurité logistique pour le transport inter-villes. Activation QR, notifications WhatsApp, code PIN de retrait, suivi GPS temps réel.",
              url: "https://qrtrans.com",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "XOF",
                description: "Plan gratuit pour chauffeurs et agences"
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "520",
                bestRating: "5"
              }
            }),
          }}
        />

        <ThemeProvider>
          <AuthProvider>
            <ServiceWorkerRegistration />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
