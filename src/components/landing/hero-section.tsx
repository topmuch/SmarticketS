"use client";

import { motion } from "framer-motion";
import { Rocket, ShieldCheck, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { BRAND } from "@/lib/constants";

interface HeroSectionProps {
  onDemoClick: () => void;
}

export function HeroSection({ onDemoClick }: HeroSectionProps) {
  return (
    <section
      id="accueil"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src="/hero-bus-station.png"
          alt="Gare routiere moderne"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a8a]/95 via-[#1e3a8a]/80 to-[#1e3a8a]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/90 via-transparent to-transparent" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#f59e0b]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 1 }}
          transition={{ duration: 2, delay: 0.8 }}
          className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-[#f59e0b]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Plateforme N1 au Senegal
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight"
          >
            Modernisez votre{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]">
              transport
            </span>{" "}
            avec SmartTicketQR
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-lg sm:text-xl text-white/80 leading-relaxed max-w-2xl"
          >
            La solution tout-en-un pour la billetterie, le suivi de colis et
            l&apos;affichage en temps reel. Integre avec WhatsApp pour vos
            passagers.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              onClick={onDemoClick}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-white text-base px-8 py-6 rounded-xl shadow-xl shadow-[#f59e0b]/30 hover:shadow-[#f59e0b]/50 transition-all group"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Essayer la Demo Gratuite
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a
              href={`https://wa.me/${BRAND.whatsappBusiness}?text=${encodeURIComponent("Bonjour, je souhaite parler a un expert SmartTicketQR.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-6 text-base rounded-xl border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm transition-all"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Parler a un Expert
            </a>
          </motion.div>

          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-12 flex items-center gap-3"
          >
            <div className="flex -space-x-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] flex items-center justify-center text-white text-xs font-bold"
                >
                  {["DS", "AT", "RK", "MB", "FS"][i]}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <span className="text-white/80 text-sm font-medium">
                Utilise par{" "}
                <span className="text-white font-bold">+50 transporteurs</span>{" "}
                au Senegal
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5"
        >
          <motion.div className="w-1.5 h-1.5 rounded-full bg-white/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
