import type { Metadata, Viewport } from "next";
import { PwaPassagerNavWrapper } from "./PwaPassagerNavWrapper";

/**
 * Layout dédié à la PWA passager BusGo.
 *
 * Surcharge les métadonnées PWA du layout racine (qui pointent vers
 * /manifest.json = "SmarticketS") afin que l'invite d'installation affiche
 * "Bus Go" (orange #F97316) plutôt que "SmarticketS" (bleu #0A2540).
 *
 * Cf. BUG #2 : QR code ouvrait "SmarticketS" au lieu de la PWA BusGo.
 */
export const metadata: Metadata = {
  title: "Bus Go — Mon billet",
  description:
    "Application passager Bus Go : billet QR code, suivi temps réel, notifications de départ et embarquement sécurisé.",
  manifest: "/manifest-busgo.json",
  applicationName: "Bus Go",
  appleWebApp: {
    capable: true,
    title: "Bus Go",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function PwaPassagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PwaPassagerNavWrapper>{children}</PwaPassagerNavWrapper>;
}
