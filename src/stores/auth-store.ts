import { create } from "zustand";
import { apiClient } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "CONTROLLER" | "DRIVER";
  isActive: boolean;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    allowSelfTicketGeneration: boolean;
    allowSelfParcelGeneration: boolean;
  } | null;
  lastLogin?: string;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  plan: string;
  isActive: boolean;
  maxUsers: number;
  maxStations: number;
  allowSelfTicketGeneration: boolean;
  allowSelfParcelGeneration: boolean;
  _count?: { users: number; stations?: number; lines?: number };
  createdAt: string;
}

export interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details: Record<string, unknown> | null;
  userId: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export type CurrentView =
  | "overview"
  | "tenants"
  | "tenant-users"
  | "audit-logs"
  | "stations"
  | "lines"
  | "tickets"
  | "guichet"
  | "parcels"
  | "parcels-activate"
  | "parcels-rates"
  | "driver-delivery"
  | "signage-board"
  | "departures"
  | "signage-messages"
  | "offline-queue"
  | "admin-reports"
  | "admin-settings"
  | "staff-management"
  | "notifications"
  | "superadmin-dashboard";

interface AuthStore {
  // Auth state
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showLogin: boolean;

  // Navigation state
  currentView: CurrentView;
  selectedTenantId: string | null;
  selectedTenantName: string | null;

  // Auth actions
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  loginByPhone: (phone: string, password: string) => Promise<void>;
  loginByFieldPin: (phone: string, pin: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  initAuth: () => Promise<void>;

  // Navigation actions
  setCurrentView: (view: CurrentView) => void;
  setSelectedTenantId: (id: string | null, name?: string | null) => void;
  setShowLogin: (show: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  showLogin: false,
  currentView: "overview",
  selectedTenantId: null,
  selectedTenantName: null,

  // Login action
  login: async (email: string, password: string, tenantId?: string) => {
    const body: Record<string, string> = { email, password };
    if (tenantId) body.tenantId = tenantId;

    const data = await apiClient.fetch<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    localStorage.setItem("st_access_token", data.accessToken);
    localStorage.setItem("st_refresh_token", data.refreshToken);

    set({
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  // Login by phone (for drivers/chauffeurs using password)
  loginByPhone: async (phone: string, password: string) => {
    const data = await apiClient.fetch<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/api/auth/login-phone", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });

    localStorage.setItem("st_access_token", data.accessToken);
    localStorage.setItem("st_refresh_token", data.refreshToken);

    set({
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  // Login by Field PIN (for terrain: chauffeur/controleur via PWA)
  loginByFieldPin: async (phone: string, pin: string) => {
    const data = await apiClient.fetch<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
      fieldLogin: boolean;
    }>("/api/auth/field-login", {
      method: "POST",
      body: JSON.stringify({ phone, pin }),
    });

    localStorage.setItem("st_access_token", data.accessToken);
    localStorage.setItem("st_refresh_token", data.refreshToken);
    localStorage.setItem("st_field_login", "true");

    set({
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  // Logout action
  logout: () => {
    localStorage.removeItem("st_access_token");
    localStorage.removeItem("st_refresh_token");
    localStorage.removeItem("st_field_login");
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      showLogin: false,
      currentView: "overview",
      selectedTenantId: null,
      selectedTenantName: null,
    });
  },

  // Fetch current user
  fetchCurrentUser: async () => {
    try {
      const user = await apiClient.fetch<AuthUser>("/api/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("st_access_token");
      localStorage.removeItem("st_refresh_token");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Initialize auth from localStorage
  initAuth: async () => {
    const accessToken = localStorage.getItem("st_access_token");
    if (!accessToken) {
      set({ isLoading: false });
      return;
    }

    try {
      await get().fetchCurrentUser();
    } catch {
      set({ isLoading: false });
    }
  },

  // Navigation
  setCurrentView: (view: CurrentView) => {
    set({ currentView: view });
  },

  setSelectedTenantId: (id: string | null, name?: string | null) => {
    set({ selectedTenantId: id, selectedTenantName: name ?? null });
  },

  setShowLogin: (show: boolean) => {
    set({ showLogin: show });
  },
}));
