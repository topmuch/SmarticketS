'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/pwa-passenger/BottomNav';
import { PwaAdsBanner } from '@/components/pwa-passenger/PwaAdsBanner';

/**
 * PWA Passager — Layout Client avec BottomNav
 *
 * Montre la bottom navigation sur toutes les pages PWA passager
 * SAUF sur /pwa-passager/install (page d'installation, pas de nav).
 *
 * Détermine l'onglet actif à partir du pathname.
 */

export function PwaPassagerNavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('busgo_ticket_id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTicketId(id);
  }, []);

  // Ne pas afficher le BottomNav sur la page d'installation
  const isInstallPage = pathname === '/pwa-passager/install';

  // Déterminer l'onglet actif
  const getActiveTab = (): 'board' | 'ticket' | 'alerts' | 'profile' => {
    if (pathname === '/pwa-passager' || pathname === '/pwa-passager/') return 'board';
    if (pathname?.startsWith('/pwa-passager/ticket')) return 'ticket';
    if (pathname?.startsWith('/pwa-passager/alerts')) return 'alerts';
    if (pathname?.startsWith('/pwa-passager/settings') || pathname?.startsWith('/pwa-passager/faq')) return 'profile';
    return 'board';
  };

  return (
    <>
      <div className={isInstallPage ? '' : 'pb-20'}>
        {/* Ads banner en haut de chaque page PWA (sauf install) */}
        {!isInstallPage && (
          <div className="px-4 pt-3">
            <PwaAdsBanner />
          </div>
        )}
        {children}
      </div>
      {!isInstallPage && (
        <BottomNav
          active={getActiveTab()}
          ticketId={ticketId}
          alertsCount={0}
        />
      )}
    </>
  );
}
