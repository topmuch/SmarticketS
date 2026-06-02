"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Maximize2, Minimize2, Bus, Clock } from "lucide-react";
import { BRAND } from "@/lib/constants";

/* ─── Types ─── */
type DepartureStatus = "on-time" | "boarding" | "delayed" | "departed";

interface Departure {
  line: string;
  dest: string;
  time: string;
  platform: string;
  status: DepartureStatus;
}

interface DemoSignageFullProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const STATUS_CONFIG: Record<DepartureStatus, { label: string; badgeClass: string; rowClass: string }> = {
  "on-time": {
    label: "A l'heure",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rowClass: "bg-white hover:bg-gray-50",
  },
  boarding: {
    label: "Embarquement",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    rowClass: "bg-blue-50 border-l-4 border-blue-500",
  },
  delayed: {
    label: "Retard +15min",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    rowClass: "text-red-700 bg-white",
  },
  departed: {
    label: "Parti",
    badgeClass: "bg-gray-100 text-gray-500 border-gray-200",
    rowClass: "opacity-50 bg-gray-50",
  },
};

const INITIAL_DEPARTURES: Departure[] = [
  { line: "L10", dest: "Mbour - Terminal", time: "12:15", platform: "Quai 3", status: "on-time" },
  { line: "L24", dest: "Thies - Centre", time: "12:20", platform: "Quai 1", status: "boarding" },
  { line: "L05", dest: "Saint-Louis", time: "12:25", platform: "Quai 5", status: "delayed" },
  { line: "L08", dest: "Kaolack", time: "12:10", platform: "Quai 2", status: "departed" },
  { line: "L12", dest: "Ziguinchor", time: "13:00", platform: "Quai 4", status: "on-time" },
  { line: "L15", dest: "Touba", time: "13:30", platform: "Quai 6", status: "on-time" },
];

const TICKER_TEXT =
  "INFO VOYAGEURS : RETARDS DE 15 MIN SUR LA LIGNE DAKAR-MBOUR CAUSE TRAVAUX A LA SORTIE DE LA VILLE — MERCI DE VOTRE COMPREHENSION — BIENVENUE A BORD DES LIGNES SMARTTICKETQR — PROCHAIN DEPART THIES DANS 8 MIN — SUIVEZ VOS COLIS EN TEMPS REEL VIA QR CODE";

function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DemoSignageFull({
  isFullscreen = false,
  onToggleFullscreen,
}: DemoSignageFullProps) {
  const [time, setTime] = useState<Date>(new Date());
  const [departures, setDepartures] = useState<Departure[]>(INITIAL_DEPARTURES);
  const [mounted, setMounted] = useState(false);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const clockId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clockId);
  }, []);

  const runSimulation = useCallback(() => {
    setDepartures((prev) => {
      const idx = prev.findIndex((d) => d.status === "boarding");
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: "departed" as const };
      const nextIdx = updated.findIndex(
        (d) => d.status === "on-time" || d.status === "delayed"
      );
      if (nextIdx !== -1) {
        updated[nextIdx] = { ...updated[nextIdx], status: "boarding" as const };
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    simulationRef.current = setInterval(runSimulation, 30_000);
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, [runSimulation]);

  if (!mounted) return null;

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const frenchDate = formatFrenchDate(time);

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl max-w-5xl mx-auto ${
        isFullscreen ? "fixed inset-0 z-[100] !max-w-none !rounded-none" : ""
      }`}
    >
      {/* Fullscreen toggle */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className={
            isFullscreen
              ? "absolute top-4 right-4 z-[110] bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg transition-colors"
              : "absolute top-4 right-4 z-10 bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors backdrop-blur-sm"
          }
          aria-label={isFullscreen ? "Reduire" : "Agrandir"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-4 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-900 text-sm tracking-tight flex-shrink-0">
            ST
          </div>
          <span className="font-semibold text-base sm:text-lg hidden sm:inline">
            {BRAND.name}
          </span>
        </div>
        <div className="text-center flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide uppercase">
            Gare Routiere Peters
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">Dakar, Senegal</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-2 justify-end">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xl sm:text-2xl md:text-3xl font-bold tracking-widest">
              {hours}:{minutes}:{seconds}
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm capitalize mt-0.5">
            {frenchDate}
          </p>
        </div>
      </header>

      {/* Ticker */}
      <div className="bg-amber-500 text-slate-900 py-2 overflow-hidden flex-shrink-0">
        <div className="whitespace-nowrap text-sm font-medium animate-[marquee_30s_linear_infinite]" style={{ animation: "marquee 30s linear infinite" }}>
          <span className="inline-block" style={{ transform: "translateX(100%)" }}>
            {TICKER_TEXT}
          </span>
        </div>
      </div>

      {/* Departure Table */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-5 bg-slate-800 text-white px-4 sm:px-8 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider">
          <span>Heure</span>
          <span>Ligne</span>
          <span>Destination</span>
          <span className="text-center">Quai</span>
          <span className="text-right">Statut</span>
        </div>
        <div className="divide-y divide-gray-100">
          {departures.map((dep) => {
            const config = STATUS_CONFIG[dep.status];
            return (
              <div
                key={dep.line}
                className={`grid grid-cols-5 items-center px-4 sm:px-8 py-3 sm:py-4 text-sm sm:text-base transition-all duration-300 ${config.rowClass}`}
              >
                <span className="font-mono font-bold text-lg sm:text-xl">{dep.time}</span>
                <span className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-800">{dep.line}</span>
                </span>
                <span className="font-medium text-slate-700 truncate">{dep.dest}</span>
                <span className="text-center font-semibold text-slate-600">{dep.platform}</span>
                <span className="text-right">
                  <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${config.badgeClass}`}>
                    {config.label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer QR */}
      <footer className="bg-slate-900 text-white px-4 sm:px-8 py-4 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-medium">
            Scannez pour suivre votre trajet ou colis
          </p>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Tracabilite securisee 24/7 • Application {BRAND.name}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          {/* Simple QR placeholder instead of SVG to avoid hydration issues */}
          <div className="bg-white rounded-lg p-2">
            <div className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] bg-slate-100 grid grid-cols-7 grid-rows-7 gap-px p-1">
              {Array.from({ length: 49 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-[1px] ${Math.random() > 0.45 ? "bg-slate-900" : "bg-white"}`}
                />
              ))}
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold tracking-widest text-amber-400 uppercase">
            Tracking Live
          </span>
        </div>
      </footer>
    </div>
  );
}
