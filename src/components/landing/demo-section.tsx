"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { LiveSignageDemo } from "./live-signage-demo";

export function DemoSection() {
  const demoRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="demo"
      ref={demoRef}
      className="py-20 sm:py-28 bg-gradient-to-b from-[#f8fafc] to-white relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #1e3a8a 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#f59e0b]/10 text-[#d97706] text-sm font-semibold mb-4">
            Demo Immersive
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Voyez votre gare prendre vie{" "}
            <span className="inline-block animate-pulse">&#127909;</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Decouvrez notre ecran d&apos;affichage en temps reel. Horloge
            dynamique, departs en direct, ticker d&apos;information et QR code
            de suivi colis.
          </p>
        </motion.div>

        {/* Live Demo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
        >
          <LiveSignageDemo />
        </motion.div>
      </div>
    </section>
  );
}
