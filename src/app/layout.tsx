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

// SEO: JSON-LD Structured Data (constantes pour éviter les problèmes JSX)
const jsonLdSoftwareApplication = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "QRTrans",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description: "Plateforme de traçabilité de colis par QR code pour le transport inter-villes au Sénégal. Notifications WhatsApp automatiques, code PIN de retrait sécurisé, suivi GPS en temps réel, dashboard agence.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "XOF",
    availability: "https://schema.org/InStock"
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "127",
    bestRating: "5",
    worstRating: "1"
  },
  featureList: [
    "Activation de colis par QR code en 30 secondes",
    "Notifications WhatsApp automatiques via wa.me",
    "Code PIN à 6 chiffres pour sécuriser la livraison",
    "Suivi GPS en temps réel des colis",
    "Dashboard agence avec gestion de flotte",
    "Mode hors-ligne pour zones sans réseau",
    "Détection IP pour saisie téléphone simplifiée",
    "Export CSV et reporting comptable"
  ],
  areaServed: [
    { "@type": "Country", name: "Sénégal" },
    { "@type": "Country", name: "Mali" },
    { "@type": "Country", name: "Guinée" },
    { "@type": "Country", name: "Côte d'Ivoire" }
  ],
  url: "https://qrtrans.pro",
  logo: "https://qrtrans.pro/icons/icon-512x512.png",
  sameAs: [
    "https://facebook.com/qrtrans.sn",
    "https://linkedin.com/company/qrtrans",
    "https://wa.me/221784858226"
  ]
});

const jsonLdWebSite = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "QRTrans",
  url: "https://qrtrans.pro",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://qrtrans.pro/suivi/{search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
});

const jsonLdService = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Traçabilité de Colis par QR Code",
  description: "Activez, tracez et sécurisez vos colis inter-villes avec QRTrans. Activation QR code, notifications WhatsApp, code PIN de retrait, suivi GPS en temps réel.",
  provider: {
    "@type": "Organization",
    name: "QRTrans",
    url: "https://qrtrans.pro"
  },
  areaServed: [
    { "@type": "Country", name: "Sénégal" },
    { "@type": "Country", name: "Mali" },
    { "@type": "Country", name: "Guinée" },
    { "@type": "Country", name: "Côte d'Ivoire" }
  ],
  serviceType: "Traçabilité logistique",
  featureList: [
    "Activation QR code en 30 secondes",
    "Notifications WhatsApp via wa.me",
    "Code PIN de retrait sécurisé",
    "Suivi GPS en temps réel",
    "Dashboard agence avec gestion de flotte"
  ]
});

const jsonLdPlace = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Place",
  name: "Sénégal",
  addressCountry: "SN"
});

export const metadata: Metadata = {
  title: {
    default: "QRTrans — Traçabilité de Colis par QR Code au Sénégal",
    template: "%s | QRTrans",
  },
  description: "Plateforme de traçabilité de colis par QR code pour le transport inter-villes au Sénégal. Activation en 30s, notifications WhatsApp automatiques, code PIN sécurisé, suivi GPS temps réel, dashboard agence.",
  keywords: [
    "QRTrans", "QR code colis", "traçabilité colis", "transport inter-villes Sénégal",
    "logistique Sénégal", "suivi colis", "notifications WhatsApp", "code PIN livraison",
    "GPS colis", "dashboard agence transport", "chauffeur livreur",
    "colis Dakar Ziguinchor", "colis Dakar Saint-Louis", "colis Touba Thiès",
    "expédition colis Sénégal", "livraison colis Sénégal", "sécurité colis",
    "agence transport Sénégal", "Mali Guinée Côte d'Ivoire"
  ],
  authors: [{ name: "QRTrans Team" }],
  creator: "MMASOLUTION",
  publisher: "QRTrans",
  metadataBase: new URL("https://qrtrans.pro"),
  category: "business",

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
      { rel: "mask-icon", url: "/icons/maskable-icon-512x512.png", color: "#0A2540" },
    ],
  },

  // Open Graph — optimisé pour le partage social
  openGraph: {
    title: "QRTrans — Traçabilité de Colis par QR Code au Sénégal",
    description: "Activez un colis en 30 secondes avec un QR code. Notifications WhatsApp automatiques, code PIN sécurisé, suivi GPS temps réel. Solution complète pour agences de transport.",
    url: "https://qrtrans.pro",
    siteName: "QRTrans",
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["en_US", "ar_SA"],
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "QRTrans — Traçabilité de Colis par QR Code",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "QRTrans — Traçabilité de Colis par QR Code au Sénégal",
    description: "Activez un colis en 30 secondes. Notifications WhatsApp, code PIN sécurisé, suivi GPS. Solution pour agences de transport.",
    images: ["/icons/icon-512x512.png"],
    creator: "@qrtrans_sn",
    site: "@qrtrans_sn",
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
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Alternates
  alternates: {
    canonical: "https://qrtrans.pro",
    languages: {
      "fr": "https://qrtrans.pro",
      "en": "https://qrtrans.pro/?lang=en",
      "ar": "https://qrtrans.pro/?lang=ar",
    },
  },

  // Google Search Console Verification
  verification: {
    google: "89137c0360e6b581",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0A2540" },
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
        <meta name="msapplication-TileColor" content="#0A2540" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Preconnect & DNS Prefetch for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//wa.me" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
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
              url: "https://qrtrans.pro",
              logo: "https://qrtrans.pro/icons/icon-512x512.png",
              description: "Plateforme de traçabilité de colis par QR code pour le transport inter-villes au Sénégal. Notifications WhatsApp, code PIN, suivi GPS, dashboard agence.",
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
                "https://facebook.com/qrtrans.sn",
                "https://linkedin.com/company/qrtrans",
                "https://wa.me/221784858226"
              ],
              foundingDate: "2024"
            }),
          }}
        />

        {/* JSON-LD Structured Data: SoftwareApplication - SEO Optimise */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSoftwareApplication }} />

        {/* JSON-LD Structured Data: WebSite - Recherche Google */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdWebSite }} />

        {/* JSON-LD Structured Data: Service - Semantique logistique */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdService }} />

        {/* JSON-LD Structured Data: Place - SEO local */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdPlace }} />

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
