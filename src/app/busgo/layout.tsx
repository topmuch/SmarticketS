'use client';

/**
 * BusGo Layout — Espace BusGo indépendant.
 *
 * BusGo est un module autonome de gestion de transport en bus.
 * Accessible via /busgo/* pour les compagnies créées par le SuperAdmin.
 *
 * Routes:
 *   /busgo                    — Dashboard (trajets du jour, KPIs)
 *   /busgo/trajets            — Tous les trajets
 *   /busgo/embarquement       — Embarquement (scan QR)
 *   /busgo/guichet            — Vente de billets
 *   /busgo/bus                — Gestion flotte de bus
 *   /busgo/voix               — Configuration annonces vocales
 *   /busgo/rapports           — Rapports et statistiques
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bus,
  LayoutDashboard,
  Clock,
  ScanLine,
  Ticket,
  Users,
  Volume2,
  VolumeX,
  LogOut,
  Menu,
  X,
  WifiOff,
  Wifi,
  Bell,
  BarChart3,
  Cog,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentVocalAlerts } from '@/hooks/use-agent-vocal-alerts';
import { useKioskSocket } from '@/hooks/use-kiosk-socket';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { BusGoOnboarding } from '@/components/busgo/onboarding-wizard';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { href: '/busgo', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/busgo/trajets', label: 'Trajets', icon: Clock },
  { href: '/busgo/embarquement', label: 'Embarquement', icon: ScanLine },
  { href: '/busgo/scanner', label: 'Scanner', icon: ScanLine },
  { href: '/busgo/guichet', label: 'Guichet', icon: Ticket },
  { href: '/busgo/billets', label: 'Billets', icon: Ticket },
  { href: '/busgo/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/busgo/equipe', label: 'Équipe', icon: Users },
  { href: '/busgo/voix', label: 'Voix & Annonces', icon: Volume2 },
  { href: '/busgo/notifications', label: 'Notifications', icon: Bell },
  { href: '/busgo/pwa-terrain', label: 'PWA Terrain', icon: Smartphone },
  { href: '/busgo/rapports', label: 'Rapports', icon: BarChart3 },
];

export default function BusGoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding on first visit
  useEffect(() => {
    if (typeof window === 'undefined' || loading || !isAuthenticated || !user) return;
    const onboarded = localStorage.getItem('busgo_onboarded');
    if (!onboarded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(true);
    }
  }, [loading, isAuthenticated, user]);

  const { config, toggleMuted, announceCustom } = useAgentVocalAlerts();

  const { isConnected: wsConnected } = useKioskSocket({
    stationSlug: user?.agency?.slug,
    enabled: isAuthenticated,
    onEvent: (event, data) => {
      if (!config.autoTTS) return;
      if (event === 'passenger:missing' && data.passengerName && data.seatNumber) {
        announceCustom(
          `Passager manquant : ${data.passengerName}, siège ${data.seatNumber}.`,
          'high'
        );
      } else if (event === 'announcement' && data.message) {
        announceCustom(data.message, 'normal');
      }
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/busgo/connexion');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Chargement BusGo...</p>
        </div>
      </div>
    );
  }

  const initials = (user.name || user.email || 'B')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <BusGoOnboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="flex h-14 items-center px-4 md:px-6 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/20"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo — company logo if available, else BusGo default */}
          <Link href="/busgo" className="flex items-center gap-2 font-bold text-lg text-white">
            {user?.agency?.id ? (
              // Try to load company logo — fallback to Bus icon
              <img
                src={`/api/agency/logo/${user.agency.id}`}
                alt={user.agency.name || 'BusGo'}
                className="h-8 w-8 rounded-lg object-cover bg-white/20"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="bg-white/20 rounded-lg p-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2L21 4H4a2 2 0 0 0-2 2v11h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg></div>';
                  }
                }}
              />
            ) : (
              <div className="bg-white/20 rounded-lg p-1">
                <Bus className="h-5 w-5" />
              </div>
            )}
            <span className="hidden sm:inline">
              {user?.agency?.name || 'BusGo'}
            </span>
          </Link>

          {/* Agency name */}
          {user.agency && (
            <span className="hidden md:inline text-sm text-white/80 ml-2">
              — {user.agency.name}
            </span>
          )}

          {/* Status indicators */}
          <div className="ml-auto flex items-center gap-2">
            <div
              className={cn(
                'hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded',
                isOnline
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-500/30 text-white'
              )}
            >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {wsConnected && (
              <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/20 text-white">
                <Bell className="h-3 w-3" />
                <span>Live</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMuted}
              className="text-white hover:bg-white/20"
              title={config.muted ? 'Activer le son' : 'Couper le son'}
            >
              {config.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/20">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-white text-amber-700 text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col gap-1 p-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.agency && (
                    <p className="text-xs text-muted-foreground">{user.agency.name}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button
                    onClick={handleLogout}
                    className="cursor-pointer w-full flex items-center text-rose-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ─── Body: Sidebar + Main ────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-56 flex-col border-r bg-amber-50/50 dark:bg-amber-950/10 p-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-2 text-sm',
                      isActive && 'bg-amber-200/50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-medium'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile sidebar */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileNavOpen(false)}>
            <div
              className="absolute left-0 top-0 bottom-0 w-64 bg-background p-4 border-r"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold flex items-center gap-2">
                  <Bus className="h-5 w-5 text-amber-600" />
                  BusGo
                </span>
                <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-start gap-2 text-sm',
                          isActive && 'bg-amber-200/50 dark:bg-amber-900/30 font-medium'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ─── Mobile bottom navigation ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 min-w-[60px] transition-colors',
                  isActive ? 'text-amber-600' : 'text-muted-foreground hover:text-amber-600'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
