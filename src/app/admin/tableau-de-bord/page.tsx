'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  CheckCircle,
  Users,
  Building,
  Package,
  MessageSquare,
  ShoppingCart,
  Search,
  RefreshCw,
  Plus,
  Filter
} from "lucide-react";

// Types
interface DashboardStats {
  totalQR: number;
  qrActivatedHajj: number;
  qrActivatedVoyageur: number;
  totalPelerins: number;
  totalVoyageurs: number;
  expiringSoon: number;
  pendingOrders: number;
  totalAgencies: number;
}

interface RecentActivity {
  id: string;
  type: 'activation' | 'order' | 'scan';
  name: string;
  reference: string;
  time: string;
  details: string;
  status: 'success' | 'warning' | 'info';
  agency?: string;
}

interface DailyActivation {
  day: string;
  count: number;
  fullDate?: string;
}

// Modern Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  iconBg
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  iconBg: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">{title}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// KPI Card Component - Colored
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  colorVariant
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  colorVariant: 'green' | 'blue' | 'purple' | 'orange' | 'cyan' | 'red' | 'pink' | 'indigo';
}) {
  const chartBars = Array.from({ length: 12 }, (_, i) => ({
    height: 20 + Math.random() * 80,
  }));

  return (
    <div className={`kpi-card kpi-card-${colorVariant} p-6 opacity-0 animate-slide-up`}>
      <div className="flex items-start justify-between relative z-10">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <span className="text-white">{icon}</span>
        </div>
      </div>
      <div className="mt-4 relative z-10">
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-white/90 mt-1">{title}</p>
        <p className="text-xs text-white/70 mt-1">{subtitle}</p>
      </div>
      
      <div className="mini-chart-bars mt-4">
        {chartBars.map((bar, i) => (
          <div 
            key={i} 
            className="mini-chart-bar" 
            style={{ height: `${bar.height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Quick Actions Component
function QuickActions() {
  const actions = [
    { label: "Générer QR", icon: <QrCode className="w-5 h-5" />, href: "/admin/generer", color: "bg-emerald-500" },
    { label: "Hajj 2026", icon: <Users className="w-5 h-5" />, href: "/admin/hajj", color: "bg-blue-500" },
    { label: "Commandes", icon: <ShoppingCart className="w-5 h-5" />, href: "/admin/messages", color: "bg-orange-500" },
    { label: "Agences", icon: <Building className="w-5 h-5" />, href: "/admin/agences", color: "bg-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Link
          key={index}
          href={action.href}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all duration-300 group"
        >
          <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
            {action.icon}
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-200">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}

// Chart Component
function ActivationsChart({ data }: { data: DailyActivation[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Activations par jour</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Total: {total} activations cette semaine</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-slate-600 dark:text-slate-300">Pèlerins</span>
        </div>
      </div>

      <div className="h-48 flex items-end gap-3">
        {data.map((item, index) => {
          const isHovered = hoveredIndex === index;
          const height = item.count > 0 ? Math.max((item.count / maxCount) * 100, 8) : 8;
          
          return (
            <div 
              key={index} 
              className="flex-1 flex flex-col items-center relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {isHovered && item.count > 0 && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded-lg shadow-lg whitespace-nowrap z-10">
                  {item.count} activation{item.count > 1 ? 's' : ''}
                </div>
              )}
              
              <div className="w-full flex flex-col items-center justify-end h-40">
                <div
                  className={`w-full max-w-[40px] rounded-t-lg transition-all duration-300 cursor-pointer ${
                    item.count > 0 
                      ? 'bg-emerald-500' 
                      : 'bg-slate-200 dark:bg-slate-700'
                  } ${isHovered && item.count > 0 ? 'opacity-80' : ''}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="text-xs mt-2 text-slate-500 dark:text-slate-400">{item.day}</div>
              <div className={`text-xs font-semibold ${item.count > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {item.count || '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: RecentActivity }) {
  const statusConfig = {
    success: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
    warning: { bg: 'bg-amber-100 dark:bg-amber-500/10', icon: <Clock className="w-4 h-4 text-amber-500" /> },
    info: { bg: 'bg-blue-100 dark:bg-blue-500/10', icon: <Package className="w-4 h-4 text-blue-500" /> }
  };

  const config = statusConfig[activity.status];

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-slate-800 dark:text-white">{activity.name}</p>
          <ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{activity.details}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {activity.time}
          </span>
          {activity.agency && (
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
              {activity.agency}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Recent Activity Component
function RecentActivityList({ activities }: { activities: RecentActivity[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Activité récente</h3>
        <Link href="/admin/trouvailles" className="text-sm text-emerald-500 hover:text-emerald-600 font-medium flex items-center gap-1">
          Voir tout <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aucune activité récente</p>
          </div>
        ) : (
          activities.slice(0, 5).map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
}

// Main Dashboard Page
export default function DashboardPage() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalQR: 0,
    qrActivatedHajj: 0,
    qrActivatedVoyageur: 0,
    totalPelerins: 0,
    totalVoyageurs: 0,
    expiringSoon: 0,
    pendingOrders: 0,
    totalAgencies: 0,
  });
  const [dailyActivations, setDailyActivations] = useState<DailyActivation[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkNewMessages = async () => {
      try {
        const res = await fetch('/api/messages/unread-count');
        const data = await res.json();
        setUnreadMessages(data.count || 0);
      } catch (error) {
        console.error('Error checking messages:', error);
      }
    };

    checkNewMessages();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/admin/dashboard');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || stats);
        setDailyActivations(data.dailyActivations || generateDefaultActivations());
        setRecentActivities(data.recentActivities || []);
      } else {
        setDailyActivations(generateDefaultActivations());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDailyActivations(generateDefaultActivations());
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultActivations = (): DailyActivation[] => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = new Date();
    return days.map((day, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      return { 
        day, 
        count: 0,
        fullDate: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      };
    });
  };

  // Multicolored KPI Cards
  const kpiCards = [
    { 
      title: 'Total QR Codes', 
      value: stats.totalQR, 
      subtitle: `${stats.qrActivatedHajj} Hajj actifs`,
      icon: <QrCode className="w-6 h-6 text-white" />,
      colorVariant: 'green' as const
    },
    { 
      title: 'QR Voyageurs', 
      value: stats.qrActivatedVoyageur, 
      subtitle: 'Codes activés',
      icon: <Package className="w-6 h-6 text-white" />,
      colorVariant: 'blue' as const
    },
    { 
      title: 'Utilisateurs', 
      value: stats.totalPelerins + stats.totalVoyageurs, 
      subtitle: `${stats.totalPelerins} Hajj + ${stats.totalVoyageurs} Voyageurs`,
      icon: <Users className="w-6 h-6 text-white" />,
      colorVariant: 'purple' as const
    },
    { 
      title: 'Commandes', 
      value: stats.pendingOrders, 
      subtitle: 'En attente',
      icon: <ShoppingCart className="w-6 h-6 text-white" />,
      colorVariant: 'orange' as const
    },
    { 
      title: 'Agences', 
      value: stats.totalAgencies, 
      subtitle: 'Partenaires',
      icon: <Building className="w-6 h-6 text-white" />,
      colorVariant: 'cyan' as const
    },
    { 
      title: 'Expiration', 
      value: stats.expiringSoon, 
      subtitle: 'À renouveler',
      icon: <Clock className="w-6 h-6 text-white" />,
      colorVariant: 'red' as const
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tableau de bord</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Vue d'ensemble de votre activité QRTrans</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions />
      </div>

      {/* Multicolored KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-2xl p-6 h-40 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {kpiCards.map((card, index) => (
            <div key={index} className={`stagger-${index + 1}`}>
              <KPICard {...card} />
            </div>
          ))}
        </div>
      )}

      {/* Chart and Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse h-80"></div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse h-80"></div>
          </>
        ) : (
          <>
            <ActivationsChart data={dailyActivations} />
            <RecentActivityList activities={recentActivities} />
          </>
        )}
      </div>
    </div>
  );
}
