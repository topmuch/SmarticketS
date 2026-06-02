"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Users,
  ScrollText,
  LogOut,
  Bus,
  Menu,
  ChevronLeft,
  Ticket,
  ClipboardList,
  Package,
  PackageSearch,
  Calculator,
  Truck,
  Monitor,
  Clock,
  Megaphone,
  Database,
  BarChart3,
  Settings,
  Shield,
  Bell,
  MapPin,
  Route,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthStore, type CurrentView } from "@/stores/auth-store";
import { OfflineStatusBar } from "@/components/smart-tickets/offline-status-bar";

const NAV_ITEMS: Array<{
  id: CurrentView;
  label: string;
  icon: React.ElementType;
  roles: string[];
}> = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard, roles: ["*"] },
  {
    id: "tenants",
    label: "Transporteurs",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  { id: "tenant-users", label: "Utilisateurs", icon: Users, roles: ["*"] },
  {
    id: "stations",
    label: "Gares",
    icon: MapPin,
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR"],
  },
  {
    id: "lines",
    label: "Lignes",
    icon: Route,
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR"],
  },
  {
    id: "guichet",
    label: "Guichet",
    icon: Ticket,
    roles: ["ADMIN", "OPERATOR"],
  },
  {
    id: "tickets",
    label: "Tickets",
    icon: ClipboardList,
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR", "CONTROLLER"],
  },
  {
    id: "parcels-activate",
    label: "Colis — Guichet",
    icon: Package,
    roles: ["ADMIN", "OPERATOR"],
  },
  {
    id: "parcels",
    label: "Colis",
    icon: PackageSearch,
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR", "CONTROLLER"],
  },
  {
    id: "parcels-rates",
    label: "Tarifs Colis",
    icon: Calculator,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    id: "driver-delivery",
    label: "Livraison",
    icon: Truck,
    roles: ["DRIVER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    id: "signage-board",
    label: "Affichage Gare",
    icon: Monitor,
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR"],
  },
  {
    id: "departures",
    label: "Départs",
    icon: Clock,
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR"],
  },
  {
    id: "signage-messages",
    label: "Messages Panneau",
    icon: Megaphone,
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR"],
  },
  {
    id: "audit-logs",
    label: "Journaux d'audit",
    icon: ScrollText,
    roles: ["*"],
  },
  {
    id: "offline-queue",
    label: "File Hors-Ligne",
    icon: Database,
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR", "DRIVER", "CONTROLLER"],
  },
  {
    id: "admin-reports",
    label: "Rapports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    id: "admin-settings",
    label: "Paramètres",
    icon: Settings,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    id: "staff-management",
    label: "Gestion Staff",
    icon: Shield,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    id: "superadmin-dashboard",
    label: "Superadmin",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN"],
  },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ADMIN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  OPERATOR: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CONTROLLER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  DRIVER: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

function NavContent({
  currentView,
  userRole,
  onNavigate,
  onLogout,
  compact = false,
  canGenerateTickets = false,
  canGenerateParcels = false,
}: {
  currentView: CurrentView;
  userRole: string;
  onNavigate: (view: CurrentView) => void;
  onLogout: () => void;
  compact?: boolean;
  canGenerateTickets?: boolean;
  canGenerateParcels?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 p-4 ${compact ? "px-3" : ""}`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white shrink-0">
          <Bus className="w-5 h-5" />
        </div>
        {!compact && (
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-gray-900 dark:text-white truncate">
              Smart<span className="text-emerald-600">Ticket</span>QR
            </h1>
          </div>
        )}
      </div>

      <Separator />

      {/* Nav items */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {NAV_ITEMS.filter((item) => {
            // Hide ticket list/generation nav for non-SUPER_ADMIN without ticket generation permission
            if (
              item.id === "tickets" &&
              userRole !== "SUPER_ADMIN" &&
              !canGenerateTickets
            )
              return false;
            // Hide parcel activation nav for non-SUPER_ADMIN without parcel generation permission
            if (
              item.id === "parcels-activate" &&
              userRole !== "SUPER_ADMIN" &&
              !canGenerateParcels
            )
              return false;
            return item.roles[0] === "*" || item.roles.includes(userRole);
          }).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start gap-3 ${
                        compact ? "px-3" : ""
                      } ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => {
                        onNavigate(item.id);
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!compact && <span>{item.label}</span>}
                    </Button>
                  </TooltipTrigger>
                  {compact && (
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Logout */}
      <div className={`p-3 ${compact ? "px-3" : ""}`}>
        <Button
          variant="ghost"
          className={`w-full justify-start gap-3 text-muted-foreground hover:text-destructive ${
            compact ? "px-3" : ""
          }`}
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!compact && <span>Déconnexion</span>}
        </Button>
      </div>
    </div>
  );
}

export function DashboardLayout({
  children,
}: {
  children: (view: CurrentView) => React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const currentView = useAuthStore((s) => s.currentView);
  const setCurrentView = useAuthStore((s) => s.setCurrentView);
  const logout = useAuthStore((s) => s.logout);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 🛑 Generation Control: determine if user can see generation nav items
  const canGenerateTickets =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "ADMIN" && user?.tenant?.allowSelfTicketGeneration);
  const canGenerateParcels =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "ADMIN" && user?.tenant?.allowSelfParcelGeneration);

  const handleNavigate = useCallback(
    (view: CurrentView) => {
      setCurrentView(view);
      setMobileOpen(false);
    },
    [setCurrentView]
  );

  const handleLogout = useCallback(() => {
    logout();
    toast.success("Déconnexion réussie.");
  }, [logout]);

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : "??";

  const roleColor = user?.role ? ROLE_COLORS[user.role] || "" : "";

  const pageTitle: Record<CurrentView, string> = {
    overview: "Vue d'ensemble",
    tenants: "Transporteurs",
    "tenant-users": "Utilisateurs",
    stations: "Gestion des Gares",
    lines: "Gestion des Lignes",
    "audit-logs": "Journaux d'audit",
    tickets: "Tickets",
    guichet: "Guichet — Activation de billets",
    parcels: "Gestion des Colis",
    "parcels-activate": "Guichet — Enregistrement Colis",
    "parcels-rates": "Tarifs de Messagerie",
    "driver-delivery": "Livraison Colis",
    "signage-board": "Affichage Gare",
    departures: "Gestion des Départs",
    "signage-messages": "Messages d'Affichage",
    "offline-queue": "File d'Attente Hors-Ligne",
    "admin-reports": "Rapports",
    "admin-settings": "Paramètres Transporteur",
    "staff-management": "Gestion du Staff",
    "notifications": "Notifications",
    "superadmin-dashboard": "Tableau de Bord Plateforme",
  };

  return (
    <>
      <OfflineStatusBar />
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r bg-white dark:bg-gray-900 transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <NavContent
          currentView={currentView}
          userRole={user?.role || ""}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          compact={collapsed}
          canGenerateTickets={canGenerateTickets}
          canGenerateParcels={canGenerateParcels}
        />
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="absolute top-6 -right-3 z-10 w-6 h-6 rounded-full border bg-white dark:bg-gray-900 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ right: "-12px" }}
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        )}
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <NavContent
            currentView={currentView}
            userRole={user?.role || ""}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            canGenerateTickets={canGenerateTickets}
            canGenerateParcels={canGenerateParcels}
          />
        </SheetContent>
      </Sheet>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Expand button (when sidebar is collapsed) */}
              {collapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex"
                  onClick={() => setCollapsed(false)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              )}

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {pageTitle[currentView]}
              </h2>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3">
              {user?.tenant && (
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.tenant.name}
                </span>
              )}
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${roleColor}`}
                  >
                    {user?.role}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {children(currentView)}
          </motion.div>
        </main>
      </div>
    </div>
    </>
  );
}