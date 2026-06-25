'use client';

/**
 * Agent Layout — Espace agent embarquement (PWA mobile-first).
 *
 * Adapté de BusGo agent/layout.tsx pour SmarticketS.
 *
 * - Sidebar desktop avec navigation agent
 * - Bottom nav mobile (PWA)
 * - Header avec logo + déconnexion
 * - VocalProvider + KioskSocket pour temps réel
 * - OfflineIndicator pour mode hors-ligne
 *
 * Routes:
 *   /agent                    — Dashboard (trajets du jour)
 *   /agent/trajets            — Liste des trajets assignés
 *   /agent/embarquement/[id]  — Embarquement passagers d'un trajet
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bus,
  LayoutDashboard,
  Clock,
  ScanLine,
  LogOut,
  Menu,
  X,
  WifiOff,
  Wifi,
  Volume2,
  VolumeX,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentVocalAlerts } from '@/hooks/use-agent-vocal-alerts';
import { useKioskSocket } from '@/hooks/use-kiosk-socket';
import { AnnouncementPriority } from '@/lib/audioSystem';
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

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { href: '/agent', label: 'Accueil', icon: LayoutDashboard },
  { href: '/agent/trajets', label: 'Trajets', icon: Clock },
  { href: '/agent/embarquement', label: 'Embarquement', icon: ScanLine },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const { config, toggleMuted, announceCustom } = useAgentVocalAlerts();

  // Listen to kiosk events for real-time updates
  const { isConnected: wsConnected } = useKioskSocket({
    stationSlug: user?.agency?.slug,
    enabled: isAuthenticated && user?.role === 'agent',
    onEvent: (event, data) => {
      // Auto-announce certain events via TTS
      if (!config.autoTTS) return;
      switch (event) {
        case 'passenger:missing':
          if (data.passengerName && data.seatNumber) {
            announceCustom(
              `Passager manquant : ${data.passengerName}, siège ${data.seatNumber}.`,
              AnnouncementPriority.HIGH
            );
          }
          break;
        case 'departure:delay':
          if (data.delayMinutes && data.message) {
            announceCustom(data.message, AnnouncementPriority.NORMAL);
          }
          break;
        case 'announcement':
          if (data.message) {
            announceCustom(data.message, AnnouncementPriority.NORMAL);
          }
          break;
      }
    },
  });

  // Online/offline detection
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    // Allow only agents (and admins/superadmins for testing)
    if (!loading && user && !['agent', 'admin', 'superadmin'].includes(user.role)) {
      router.push('/agence/tableau-de-bord');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const initials = (user.name || user.email || 'A')
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
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6 gap-3">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <Link href="/agent" className="flex items-center gap-2 font-bold text-lg">
            <Bus className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">SmarticketS</span>
            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
              Agent
            </span>
          </Link>

          {/* Status indicators */}
          <div className="ml-auto flex items-center gap-2">
            {/* Online status */}
            <div
              className={cn(
                'hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded',
                isOnline
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
              )}
              title={isOnline ? 'En ligne' : 'Hors ligne'}
            >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* WS connection */}
            {wsConnected && (
              <div
                className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                title="Connecté au serveur temps réel"
              >
                <Bell className="h-3 w-3" />
                <span>Live</span>
              </div>
            )}

            {/* Vocal mute toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMuted}
              title={config.muted ? 'Activer le son' : 'Couper le son'}
            >
              {config.muted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4 text-primary" />
              )}
            </Button>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-amber-600 text-white text-xs">
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
        <aside className="hidden md:flex w-56 flex-col border-r bg-muted/40 p-4">
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
                      isActive && 'bg-accent text-accent-foreground font-medium'
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

        {/* Mobile sidebar (drawer) */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileNavOpen(false)}>
            <div
              className="absolute left-0 top-0 bottom-0 w-64 bg-background p-4 border-r"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold">Menu</span>
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
                          isActive && 'bg-accent text-accent-foreground font-medium'
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

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ─── Mobile bottom navigation ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 min-w-[60px] transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
