"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Maximize2, Minimize2, QrCode, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";

// ─── Types ───

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

// ─── Demo fallback data (used ONLY when live API is unreachable) ───

const DEMO_STATION_ID = process.env.NEXT_PUBLIC_DEMO_STATION_ID || "";

const DEMO_MESSAGES: string[] = [
  "\u2139\ufe0f INFO VOYAGEURS : Retard estimé de 15 min sur la ligne Dakar-Ziguinchor en raison des travaux routiers.",
  "\ud83d\udce1 Retrait de colis : Pensez à avoir votre code PIN à 4 chiffres pour un retrait rapide.",
  "\ud83d\udce6 Service Colis : Expédiez vos colis vers toutes les destinations du Sénégal. Demandez au guichet.",
  "\ud83d\udcf1 Billet WhatsApp : Récupérez votre billet directement sur votre téléphone par WhatsApp.",
  "\u2705 SmartTicketQR : La solution digitale pour le transport moderne au Sénégal.",
];

const DEFAULT_TICKER: string[] = [
  `Bienvenue chez ${BRAND.name} — Votre voyage en toute sérénité`,
  `Retrouvez vos billets et suivez vos colis sur ${BRAND.baseUrl}`,
  "Pour toute assistance, adressez-vous au guichet",
];

// ─── Status color mapping ───

const STATUS_COLOR_MAP: Record<string, string> = {
  SCHEDULED: "#22c55e",
  BOARDING: "#f59e0b",
  DEPARTED: "#6b7280",
  DELAYED: "#ef4444",
  CANCELLED: "#ef4444",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  SCHEDULED: "A l'heure",
  BOARDING: "Embarquement",
  DEPARTED: "Parti",
  DELAYED: "Retard",
  CANCELLED: "Annulé",
};

// ─── Component ───

export function LiveSignageDemo() {
  const [time, setTime] = useState(() => new Date());
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerOffset, setTickerOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Board data from API or demo fallback
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [apiError, setApiError] = useState(false);

  // Real-time clock
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Try to fetch live board data from public API
  useEffect(() => {
    if (!DEMO_STATION_ID) return;

    let cancelled = false;
    const fetchBoard = async () => {
      try {
        const res = await fetch(`/api/signage/board/${DEMO_STATION_ID}?XTransformPort=3000`);
        if (!res.ok) throw new Error("Non-200 response");
        const data: BoardData = await res.json();
        if (!cancelled) {
          setBoardData(data);
          setIsLive(true);
        }
      } catch {
        if (!cancelled) {
          setApiError(true);
        }
      }
    };
    fetchBoard();
    return () => { cancelled = true; };
  }, []);

  // Ticker animation
  useEffect(() => {
    const tickerMessages = boardData?.messages?.length
      ? boardData.messages.map((m) => m.content)
      : DEFAULT_TICKER;

    const tickerInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerMessages.length);
      setTickerOffset(0);
    }, 5000);

    const offsetInterval = setInterval(() => {
      setTickerOffset((prev) => prev + 0.5);
    }, 30);

    return () => {
      clearInterval(tickerInterval);
      clearInterval(offsetInterval);
    };
  }, [boardData?.messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Determine data source
  const tickerMessages = boardData?.messages?.length
    ? boardData.messages.map((m) => m.content)
    : DEMO_MESSAGES;

  const departures: Array<{
    id: string | number;
    destination: string;
    departure: string;
    platform: string;
    status: string;
    color: string;
  }> = boardData?.departures?.length
    ? boardData.departures.map((dep) => ({
        id: dep.id,
        destination: dep.destination,
        departure: dep.scheduledTime,
        platform: dep.platform || "—",
        status: STATUS_LABEL_MAP[dep.status] || dep.status,
        color: STATUS_COLOR_MAP[dep.status] || "#22c55e",
      }))
    : [];

  // Demo departures (only shown when live data is unavailable)
  const demoDepartures = [
    { id: "d1", destination: "Dakar - Mbour", departure: "08:00", platform: "A1", status: "A l'heure", color: "#22c55e" },
    { id: "d2", destination: "Thiès - Saint-Louis", departure: "08:30", platform: "B2", status: "Embarquement", color: "#f59e0b" },
    { id: "d3", destination: "Dakar - Kaolack", departure: "09:00", platform: "A3", status: "A l'heure", color: "#22c55e" },
    { id: "d4", destination: "Dakar - Ziguinchor", departure: "09:15", platform: "C1", status: "Retard 15 min", color: "#ef4444" },
    { id: "d5", destination: "Thiès - Tambacounda", departure: "09:45", platform: "B1", status: "A l'heure", color: "#22c55e" },
    { id: "d6", destination: "Dakar - Louga", departure: "10:00", platform: "A2", status: "Embarquement", color: "#f59e0b" },
    { id: "d7", destination: "Dakar - Kolda", departure: "10:30", platform: "C2", status: "A l'heure", color: "#22c55e" },
    { id: "d8", destination: "Rufisque - Fatick", departure: "11:00", platform: "B3", status: "A l'heure", color: "#22c55e" },
  ];

  const displayDepartures = isLive ? departures : demoDepartures;
  const stationName = boardData?.stationName || "GARE ROUTIÈRE PETERS";

  return (
    <div className="relative">
      {!isFullscreen && (
        <div className="flex justify-center mb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsFullscreen(true)}
            className="border-[#1e3a8a]/20 text-[#1e3a8a] hover:bg-[#1e3a8a]/5 gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            Voir en Plein Écran
          </Button>
        </div>
      )}

      {/* TV Frame */}
      <div
        className={`relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30 ${
          isFullscreen ? "fixed inset-0 z-[100] rounded-none" : "mx-auto max-w-5xl"
        }`}
      >
        {/* TV Bezels */}
        <div className="absolute inset-0 border-[6px] border-gray-800 rounded-2xl z-10 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-700 z-10 pointer-events-none" />

        {isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full"
          >
            <Minimize2 className="w-5 h-5" />
          </Button>
        )}

        {/* Screen Content - Blue Background */}
        <div className="bg-gradient-to-b from-[#0c1929] to-[#1a2744] text-white">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0a1420] border-b border-[#1e3a5f]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center">
                <span className="text-[#f59e0b] font-bold text-sm">ST</span>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#f59e0b]">
                  {BRAND.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {stationName.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-sm sm:text-lg font-mono font-bold text-[#f59e0b]">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {formatTime(time)}
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 capitalize">
                {formatDate(time)}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-1 bg-[#0a1420]">
            {isLive ? (
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                EN DIRECT
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                APERÇU DÉMONSTRATION
              </div>
            )}
          </div>

          {/* Ticker */}
          <div className="bg-[#f59e0b] px-2 py-1.5 overflow-hidden">
            <div
              className="whitespace-nowrap text-xs sm:text-sm font-semibold text-[#1e3a8a] transition-transform"
              style={{ transform: `translateX(-${tickerOffset}%)` }}
            >
              {tickerMessages[tickerIndex]}
            </div>
          </div>

          {/* Departures Table */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-sm font-bold text-gray-300 uppercase tracking-wider">
                Départs du jour
              </h4>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                {isLive ? "En direct" : "Démo"}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-[#1e3a5f]/30">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_70px_50px_110px] sm:grid-cols-[1fr_90px_70px_140px] bg-[#0a1420] px-3 py-2 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>Destination</span>
                <span>Départ</span>
                <span className="hidden sm:block">Quai</span>
                <span>Statut</span>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-[#1e3a5f]/20 max-h-[200px] sm:max-h-[280px] overflow-y-auto custom-scrollbar-landing">
                {displayDepartures.map((line, index) => (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="grid grid-cols-[1fr_70px_50px_110px] sm:grid-cols-[1fr_90px_70px_140px] items-center px-3 py-2.5 text-xs sm:text-sm hover:bg-white/5 transition-colors"
                  >
                    <span className="font-medium text-white truncate">
                      {line.destination}
                    </span>
                    <span className="font-mono text-gray-300">{line.departure}</span>
                    <span className="hidden sm:block text-gray-400 font-mono bg-white/5 px-1.5 py-0.5 rounded text-center">
                      {line.platform}
                    </span>
                    <span
                      className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: line.color }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: line.color }}
                      />
                      {line.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="px-4 sm:px-6 pb-4 flex flex-col items-center">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <QrCode className="w-10 h-10 sm:w-12 sm:h-12 text-[#f59e0b]" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  Scannez pour suivre votre colis
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400">
                  Pointez votre caméra sur le QR code
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
