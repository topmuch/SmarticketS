"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bus, Wifi, WifiOff, ArrowLeft, X } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BoardMessage {
  content: string;
  priority: string;
}

interface DepartureRow {
  id: string;
  lineNumber: string;
  lineName: string;
  destination: string;
  platform: string;
  scheduledTime: string;
  status: string;
  delayMinutes: number;
  countdownMin: number;
}

interface BoardData {
  stationName: string;
  currentTime: string;
  messages: BoardMessage[];
  departures: DepartureRow[];
}

interface StationOption {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_MESSAGES = [
  `Bienvenue à ${BRAND.name} — Votre voyage en toute sérénité`,
  `Retrouvez vos billets et suivez vos colis sur ${BRAND.baseUrl}`,
  "Pour toute assistance, adressez-vous au guichet",
];

const STATUS_CONFIG: Record<
  string,
  { label: string; rowClass: string; badgeClass: string }
> = {
  BOARDING: {
    label: "EMBARQUEMENT",
    rowClass: "bg-blue-50 dark:bg-blue-950/30 animate-pulse",
    badgeClass: "bg-blue-500 text-white",
  },
  DEPARTED: {
    label: "PARTI",
    rowClass: "bg-gray-50 dark:bg-gray-900/50 text-gray-400",
    badgeClass: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  },
  DELAYED: {
    label: "RETARD",
    rowClass: "bg-red-50 dark:bg-red-950/30",
    badgeClass: "bg-red-500 text-white",
  },
  SCHEDULED: {
    label: "À L'HEURE",
    rowClass: "bg-white dark:bg-gray-900",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  CANCELLED: {
    label: "ANNULÉ",
    rowClass: "bg-red-100 dark:bg-red-950/40",
    badgeClass: "bg-red-600 text-white",
  },
};

/* ------------------------------------------------------------------ */
/*  Live Clock                                                         */
/* ------------------------------------------------------------------ */

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SignageBoard() {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [stationsLoaded, setStationsLoaded] = useState(false);

  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastFetchOk, setLastFetchOk] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Fetch stations on mount ---
  useEffect(() => {
    (async () => {
      try {
        const resp = await apiClient.fetch<{ data: StationOption[] }>("/api/stations");
        setStations(resp.data);
      } catch {
        /* ignore — stations selector won't show */
      } finally {
        setStationsLoaded(true);
      }
    })();
  }, []);

  // --- Fetch board data ---
  const fetchBoard = useCallback(async () => {
    if (!selectedStationId) return;
    setIsLoading(true);
    try {
      const data = await apiClient.fetch<BoardData>(
        `/api/signage/board/${selectedStationId}`
      );
      setBoardData(data);
      setLastFetchOk(true);
    } catch {
      setLastFetchOk(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStationId]);

  // --- Poll every 30s ---
  useEffect(() => {
    if (!selectedStationId) {
      setBoardData(null);
      return;
    }
    fetchBoard();
    pollRef.current = setInterval(fetchBoard, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedStationId, fetchBoard]);

  // --- Online / offline tracking ---
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const now = useLiveClock();

  const clockStr = now.toLocaleTimeString("fr-FR", { hour12: false });
  const dateStr = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tickerMessages = boardData?.messages?.length
    ? boardData.messages.map((m) => m.content)
    : DEFAULT_MESSAGES;
  const departures = boardData?.departures ?? [];
  const stationName = boardData?.stationName ?? "";

  const showKioskUI = !!selectedStationId && !!boardData;

  /* ---- Kiosk mode not yet active: show station selector ---- */
  if (!selectedStationId || !boardData) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sélectionnez une gare
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choisissez la gare dont vous souhaitez afficher le panneau
                  d&apos;affichage en temps réel.
                </p>
              </div>
              {selectedStationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStationId(null)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              )}
            </div>

            <div className="mt-4 max-w-md">
              {stationsLoaded ? (
                <Select
                  value={selectedStationId ?? ""}
                  onValueChange={setSelectedStationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une gare…" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </div>
          </CardContent>
        </Card>

        {selectedStationId && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Skeleton className="h-8 w-64" />
            <span className="ml-3 text-sm text-muted-foreground">
              Chargement du panneau…
            </span>
          </div>
        )}
      </div>
    );
  }

  /* ---- Kiosk mode: full-screen signage board ---- */
  return (
    <>
      {/* Kiosk style injection */}
      <style>{`
        .signage-kiosk {
          cursor: none !important;
          overflow: hidden !important;
        }
        .signage-kiosk * {
          cursor: none !important;
        }
        .signage-kiosk .kiosk-exit-btn {
          cursor: pointer !important;
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .ticker-animate {
          animation: ticker-scroll 30s linear infinite;
        }
        @keyframes pulse-row {
          0%, 100% { background-color: rgba(59, 130, 246, 0.08); }
          50% { background-color: rgba(59, 130, 246, 0.18); }
        }
        .pulse-row {
          animation: pulse-row 2s ease-in-out infinite;
        }
      `}</style>

      <div className="signage-kiosk fixed inset-0 z-50 bg-gray-100 dark:bg-gray-950 flex flex-col">
        {/* ---- HEADER (slate-900) ---- */}
        <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
          {/* Left: logo + station */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Smart<span className="text-emerald-400">Ticket</span>QR
              </h1>
              <p className="text-xs text-slate-300">{stationName}</p>
            </div>
          </div>

          {/* Right: clock + date + status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-mono font-bold tabular-nums tracking-wider">
                {clockStr}
              </p>
              <p className="text-xs text-slate-300 capitalize">{dateStr}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              {isOnline && lastFetchOk ? (
                <Wifi className="w-5 h-5 text-emerald-400" />
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-400" />
                  <span className="text-[10px] font-bold text-red-400 bg-red-900/50 px-1.5 py-0.5 rounded">
                    HORS LIGNE
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ---- TICKER / BANDEAU DÉFILANT (yellow) ---- */}
        <div className="bg-yellow-400 text-slate-900 overflow-hidden py-1.5 shrink-0">
          <div className="whitespace-nowrap ticker-animate">
            {tickerMessages.map((msg, i) => (
              <span key={i} className="inline-block mx-8 text-sm font-semibold">
                {msg}
                {i < tickerMessages.length - 1 && (
                  <span className="mx-4 text-yellow-600">●</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* ---- MAIN TABLE ---- */}
        <div className="flex-1 overflow-hidden p-4">
          <table className="w-full border-collapse rounded-xl overflow-hidden shadow-lg">
            {/* Header */}
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">
                  Heure
                </th>
                <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">
                  Ligne
                </th>
                <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">
                  Destination
                </th>
                <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">
                  Quai
                </th>
                <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white dark:bg-gray-900">
              {isLoading && !departures.length ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <Skeleton className="h-7 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : departures.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-gray-400 dark:text-gray-500"
                  >
                    <p className="text-lg">Aucun départ prévu</p>
                  </td>
                </tr>
              ) : (
                departures.map((dep) => {
                  const cfg = STATUS_CONFIG[dep.status] ?? STATUS_CONFIG.SCHEDULED;
                  return (
                    <tr
                      key={dep.id}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        dep.status === "BOARDING"
                          ? "pulse-row"
                          : cfg.rowClass
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="text-2xl font-mono font-bold text-slate-800 dark:text-white">
                          {dep.scheduledTime}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-slate-800 text-white font-bold text-sm">
                          {dep.lineNumber}
                        </span>
                        {dep.lineName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {dep.lineName}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-lg font-semibold text-slate-800 dark:text-white">
                          {dep.destination}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">
                          {dep.platform || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {dep.status === "DELAYED" ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-500 text-white">
                            RETARD +{dep.delayMinutes}min
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${cfg.badgeClass}`}
                          >
                            {cfg.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ---- FOOTER with QR ---- */}
        <div className="bg-white dark:bg-gray-900 mx-4 mb-4 rounded-xl p-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                SCANNEZ POUR SUIVRE VOTRE COLIS OU BILLET
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {BRAND.baseUrl.replace("https://", "")}/track/{selectedStationId}
              </p>
            </div>
          </div>
          <QRCodeSVG
            value={`${BRAND.baseUrl}/track/${selectedStationId}`}
            size={64}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
          />
        </div>

        {/* Kiosk exit button — always visible, tactile-friendly (48px), bottom-right */}
        <div className="absolute bottom-4 right-4 z-50">
          <button
            onClick={() => setSelectedStationId(null)}
            className="kiosk-exit-btn w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-95 touch-manipulation"
            aria-label="Quitter le mode plein écran"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}
