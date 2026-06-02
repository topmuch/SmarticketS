"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Building2, Ticket, Activity, Database } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatItem {
  icon: LucideIcon;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

const stats: StatItem[] = [
  { icon: Building2, value: 50, suffix: "+", label: "Transporteurs Partenaires", color: "#1e3a8a" },
  { icon: Ticket, value: 10000, suffix: "+", label: "Tickets Emis / Jour", color: "#f59e0b" },
  { icon: Activity, value: 99.9, suffix: "%", label: "Uptime Garanti", color: "#10B981" },
  { icon: Database, value: 0, suffix: "", label: "Perte de Donnees Offline", color: "#8B5CF6" },
];

function AnimatedCounter({ target, suffix, run }: { target: number; suffix: string; run: boolean }) {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  const formatNumber = useCallback((n: number): string => {
    if (n >= 1000) return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
    return n.toString();
  }, []);

  useEffect(() => {
    if (!run || hasRun.current) return;
    hasRun.current = true;
    const duration = 2000;
    const startTime = Date.now();
    const isDecimal = target % 1 !== 0;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(target);
    };
    requestAnimationFrame(animate);
  }, [run, target]);

  return (
    <span className="text-4xl sm:text-5xl font-extrabold tabular-nums">
      {formatNumber(count)}{suffix}
    </span>
  );
}

export function StatsSection() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="tarifs" className="py-20 sm:py-28 bg-[#0F172A] relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#1e3a8a] opacity-[0.08]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#3b82f6] opacity-[0.05]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#1e3a8a]/20 text-[#3b82f6] text-sm font-semibold mb-4">
            En chiffres
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            La confiance de tout le secteur
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Des chiffres qui parlent d&apos;eux-memes — fiabilite, scale et
            performance au service du transport.
          </p>
        </div>

        {/* Stats grid */}
        <div ref={ref}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: stat.color }} />
                  </div>
                  <div className="text-white">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} run={inView} />
                  </div>
                  <p className="mt-2 text-sm text-white/60 font-medium">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
