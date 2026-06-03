import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SmarticketS — Contrôleur',
  description: 'Validation et contrôle de billets SmarticketS. Scanner QR code, saisie manuelle, mode hors-ligne.',
  manifest: '/manifest-controller.json',
  appleWebApp: {
    capable: true,
    title: 'Contrôleur',
    statusBarStyle: 'black-translucent',
    startupImage: [
      { url: '/icons/icon-512x512.png', media: '(device-width: 320px)' },
    ],
  },
  applicationName: 'SmarticketS Contrôleur',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0d1117',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function ControllerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ControllerPWASetup />
      <div className="min-h-screen bg-[#0d1117]">
        {children}
      </div>
    </>
  );
}

// Client component for PWA setup (inline to keep it simple)
function ControllerPWASetup() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            if ('serviceWorker' in navigator) {
              // Register service worker if not already registered
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                var hasSw = registrations.some(function(reg) {
                  return reg.scope.includes('/sw.js');
                });
                if (!hasSw) {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[Controller] SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('[Controller] SW registration failed:', err);
                  });
                }
              });
            }
          })();
        `,
      }}
    />
  );
}
