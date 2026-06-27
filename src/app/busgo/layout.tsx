'use client';

/**
 * BusGo Layout — Espace BusGo indépendant avec thème dynamique.
 *
 * Refonte: header contextuel + live clock + theme toggle + palette Slate.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bus, LayoutDashboard, Clock, ScanLine, Ticket, Users, Volume2,
  LogOut, Menu, X, WifiOff, Wifi, Bell, BarChart3, Smartphone,
  AlertTriangle, Moon, Sun, Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentVocalAlerts } from '@/hooks/use-agent-vocal-alerts';
import { useKioskSocket } from '@/hooks/use-kiosk-socket';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { BusGoOnboarding } from '@/components/busgo/onboarding-wizard';
import RealtimeAlertListener from '@/components/dashboard/RealtimeAlertListener';

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

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('busgo-theme') as Theme | null;
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function BusGoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Apply theme to document
  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark') { root.classList.add('dark'); root.style.colorScheme = 'dark'; }
    else { root.classList.remove('dark'); root.style.colorScheme = 'light'; }
  }, []);

  // Theme initialization
  useEffect(() => {
    const initial = getInitialTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    applyTheme(initial);
  }, [applyTheme]);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    localStorage.setItem('busgo-theme', next);
  };

  const { config, toggleMuted, announceCustom } = useAgentVocalAlerts();

  const { isConnected: wsConnected } = useKioskSocket({
    stationSlug: user?.agency?.slug,
    enabled: isAuthenticated,
    onEvent: (event, data) => {
      if (!config.autoTTS) return;
      if (event === 'passenger:missing' && data.passengerName && data.seatNumber) {
        announceCustom(`Passager manquant: ${data.passengerName}, siège ${data.seatNumber}.`, 'high');
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
    if (typeof window === 'undefined' || loading || !isAuthenticated || !user) return;
    const onboarded = localStorage.getItem('busgo_onboarded');
    if (!onboarded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(true);
    }
  }, [loading, isAuthenticated, user]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/busgo/connexion');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Chargement BusGo...</p>
        </div>
      </div>
    );
  }

  const initials = (user.name || user.email || 'B')
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    await logout();
    router.push('/busgo/connexion');
  };

  const greeting = (() => {
    const h = currentTime.getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <BusGoOnboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* FIX (audit bonus): mount RealtimeAlertListener so agents get live alert toasts */}
      <RealtimeAlertListener />

      {/* ═══ ZONE A: En-tête contextuel (Sticky) ═══ */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-900/80">
        <div className="flex h-16 items-center px-4 md:px-6 gap-3">
          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo + Greeting */}
          <Link href="/busgo" className="flex items-center gap-3">
            <div className="bg-orange-500 dark:bg-orange-600 rounded-xl p-2">
              <Bus className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-lg leading-none">{user.agency?.name || 'BusGo'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {greeting}, {user.name?.split(' ')[0] || 'Agent'}
              </p>
            </div>
          </Link>

          {/* Live clock — center */}
          <div className="hidden md:flex items-center gap-2 ml-6 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="h-4 w-4" />
            <span>{currentTime.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {/* Network status */}
            <div className={cn(
              'hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium',
              isOnline
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            )}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* WS status */}
            {wsConnected && (
              <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                <Bell className="h-3 w-3" />
                <span>Live</span>
              </div>
            )}

            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-slate-600 dark:text-slate-300">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Mute toggle */}
            <Button variant="ghost" size="icon" onClick={toggleMuted} className="text-slate-600 dark:text-slate-300">
              {config.muted ? <Volume2 className="h-4 w-4 opacity-50" /> : <Volume2 className="h-4 w-4 text-orange-500" />}
            </Button>

            {/* Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-orange-500 text-white text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col gap-1 p-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.agency && <p className="text-xs text-muted-foreground">{user.agency.name}</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button onClick={handleLogout} className="cursor-pointer w-full flex items-center text-rose-600">
                    <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ═══ Body: Sidebar + Main ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 flex-col border-r border-slate-200 dark:border-slate-800 bg-[#EFBF04] dark:bg-[#EFBF04] p-3">
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-2.5 text-sm h-10 rounded-lg transition-all',
                      isActive
                        ? 'bg-white text-slate-900 font-bold shadow-sm'
                        : 'text-slate-800 hover:bg-white/30 hover:text-slate-900'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
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
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#EFBF04] p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold flex items-center gap-2">
                  <Bus className="h-5 w-5 text-orange-500" /> {user.agency?.name || 'BusGo'}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex flex-col gap-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)}>
                      <Button variant="ghost" className={cn(
                        'w-full justify-start gap-2 text-sm',
                        isActive && 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium'
                      )}>
                        <Icon className="h-4 w-4" /> {item.label}
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

      {/* ═══ Mobile bottom navigation ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 backdrop-blur">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 min-w-[60px] transition-colors',
                isActive ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'
              )}>
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
