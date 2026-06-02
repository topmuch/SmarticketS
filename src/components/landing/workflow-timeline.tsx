"use client";

import { Shield, ClipboardList, Smartphone, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TimelineStep {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const steps: TimelineStep[] = [
  {
    icon: Shield,
    title: "Superadmin",
    description: "Genere les lots QR securises",
    color: "#1e3a8a",
  },
  {
    icon: ClipboardList,
    title: "Guichet",
    description: "Active & envoie WhatsApp",
    color: "#10B981",
  },
  {
    icon: Smartphone,
    title: "PWA Terrain",
    description: "Scanne & valide offline",
    color: "#f59e0b",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    description: "Agrege rapports & revenus",
    color: "#8B5CF6",
  },
];

export function WorkflowTimeline() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#f59e0b]/10 text-[#D97706] text-sm font-semibold mb-4">
            Parcours
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
            Comment ca <span className="text-[#1e3a8a]">marche ?</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Du QR code au rapport financier — chaque etape est tracee et
            securisee.
          </p>
        </div>

        {/* Desktop — horizontal timeline */}
        <div className="hidden md:block">
          <div className="relative max-w-5xl mx-auto">
            {/* Gradient line */}
            <div className="absolute top-[52px] left-[10%] right-[10%] h-1 bg-gray-200 rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #1e3a8a, #10B981, #f59e0b, #8B5CF6)",
                }}
              />
            </div>

            {/* Steps */}
            <div className="flex justify-between relative">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex flex-col items-center text-center w-[22%]">
                    <div
                      className="relative z-10 w-[104px] h-[104px] rounded-full flex items-center justify-center shadow-lg border-4 border-white"
                      style={{ backgroundColor: step.color }}
                    >
                      <Icon className="w-10 h-10 text-white" />
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white text-[#0F172A] text-xs font-bold flex items-center justify-center shadow-md border border-gray-100">
                        {index + 1}
                      </span>
                    </div>
                    <div className="mt-6">
                      <h3 className="text-lg font-bold text-[#0F172A]">{step.title}</h3>
                      <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile — vertical timeline */}
        <div className="md:hidden">
          <div className="relative max-w-md mx-auto">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200">
              <div
                className="h-full"
                style={{
                  background: "linear-gradient(to bottom, #1e3a8a, #10B981, #f59e0b, #8B5CF6)",
                }}
              />
            </div>
            <div className="space-y-8">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-4 items-start">
                    <div
                      className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-white"
                      style={{ backgroundColor: step.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="pt-1">
                      <h3 className="text-base font-bold text-[#0F172A]">{step.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
