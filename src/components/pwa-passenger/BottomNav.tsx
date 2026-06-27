'use client';

/**
 * BottomNav — Fixed bottom navigation bar for the BusGo passenger PWA
 * (mobile only — sidebar replaces it on md+ screens).
 *
 * FitNexus style:
 *   - White background, top border (gray-200)
 *   - Active item: teal #10B981 (text-emerald-500)
 *   - Inactive: gray #6B7280 (text-gray-500)
 *   - Smooth transition (transition-colors duration-200)
 *
 * Uses Next.js `<Link>` for client-side navigation. Shows an unread-count
 * badge on "Alertes" when `alertsCount > 0`, and disables "Mon Billet"
 * when no `ticketId` is provided.
 */

import Link from 'next/link';
import { Home, Ticket, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomNavProps {
  active: 'board' | 'ticket' | 'alerts' | 'profile';
  /** When set, "Mon Billet" links to /pwa-passager/ticket. Otherwise it is disabled. */
  ticketId?: string | null;
  /** Unread alerts count (shows a red badge when > 0). */
  alertsCount?: number;
}

interface NavItem {
  key: BottomNavProps['active'];
  label: string;
  href: string;
  icon: typeof Home;
  disabled?: boolean;
}

export function BottomNav({ active, ticketId, alertsCount = 0 }: BottomNavProps) {
  const items: NavItem[] = [
    { key: 'board', label: 'Horaires', href: '/pwa-passager', icon: Home },
    {
      key: 'ticket',
      label: 'Mon Billet',
      href: ticketId ? '/pwa-passager/ticket' : '#',
      icon: Ticket,
      disabled: !ticketId,
    },
    { key: 'alerts', label: 'Alertes', href: '/pwa-passager/alerts', icon: Bell },
    { key: 'profile', label: 'Profil', href: '/pwa-passager/settings', icon: User },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] md:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        const showBadge = item.key === 'alerts' && alertsCount > 0;

        if (item.disabled) {
          return (
            <span
              key={item.key}
              aria-disabled="true"
              className="flex cursor-not-allowed flex-col items-center gap-1 text-gray-300"
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              'flex flex-col items-center gap-1 transition-colors duration-200',
              isActive ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {showBadge && (
                <span
                  className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-bold text-white ring-2 ring-white"
                  aria-label={`${alertsCount} alerte${alertsCount > 1 ? 's' : ''} non lue${alertsCount > 1 ? 's' : ''}`}
                >
                  {alertsCount > 99 ? '99+' : alertsCount}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
