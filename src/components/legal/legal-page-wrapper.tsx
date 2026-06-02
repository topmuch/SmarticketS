"use client";

import Link from "next/link";
import { Bus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";

interface LegalPageWrapperProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageWrapper({ title, lastUpdated, children }: LegalPageWrapperProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-[#1e3a8a] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">
              <span className="text-white">Smart</span>
              <span className="text-[#3b82f6]">Tickets</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour a l&apos;accueil
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Page Header */}
          <div className="mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{title}</h1>
            <p className="text-sm text-gray-500">
              Derniere mise a jour : {lastUpdated}
            </p>
            <div className="mt-4 h-1 w-16 bg-[#1e3a8a] rounded-full" />
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
            <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-[#1e3a8a] prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-800 prose-ul:space-y-1 prose-ol:space-y-1">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center">
                <Bus className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold">
                <span className="text-white">Smart</span>
                <span className="text-[#3b82f6]">Tickets</span>
              </span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {BRAND.copyrightYear} {BRAND.name} — Tous droits reserves
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
