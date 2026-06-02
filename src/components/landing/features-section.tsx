"use client";

import { motion } from "framer-motion";
import {
  Ticket,
  Package,
  Smartphone,
  BarChart3,
  MessageSquare,
  WifiOff,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Ticket,
    title: "Billetterie QR & WhatsApp",
    description:
      "Vente rapide au guichet. Le passager recoit son billet directement sur WhatsApp. Plus besoin d'imprimante thermique !",
    color: "#1e3a8a",
    bgColor: "#1e3a8a10",
    subIcons: [MessageSquare],
  },
  {
    icon: Package,
    title: "Gestion de Colis Securisee",
    description:
      "Expediez et suivez les colis. Notification WhatsApp automatique pour l'expediteur et le destinataire. Code PIN de securite pour le retrait.",
    color: "#f59e0b",
    bgColor: "#f59e0b10",
    subIcons: [ShieldCheck, MessageSquare],
  },
  {
    icon: Smartphone,
    title: "PWA Controleur (Mode Hors-Ligne)",
    description:
      "Vos agents peuvent scanner et valider les billets meme sans internet. Synchronisation automatique des le retour du reseau.",
    color: "#059669",
    bgColor: "#05966910",
    subIcons: [WifiOff],
  },
  {
    icon: BarChart3,
    title: "Rapports & Superadmin",
    description:
      "Tableau de bord complet : ventes par operateur, revenus par destination, gestion multi-transporteurs.",
    color: "#7c3aed",
    bgColor: "#7c3aed10",
    subIcons: [Users],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-sm font-semibold mb-4">
            Fonctionnalites
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Les 4 piliers de{" "}
            <span className="text-[#1e3a8a]">SmartTicketQR</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Une solution complete qui couvre tous les aspects de la gestion
            transport : billetterie, colis, controle et rapports.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative p-6 sm:p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
              >
                {/* Background Glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at top right, ${feature.bgColor}, transparent 70%)` }}
                />

                <div className="relative">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg transition-transform duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: feature.bgColor,
                      boxShadow: `0 8px 25px ${feature.bgColor}`,
                    }}
                  >
                    <Icon className="w-7 h-7" style={{ color: feature.color }} />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Sub Icons */}
                  {feature.subIcons.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      {feature.subIcons.map((SubIcon, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: feature.bgColor,
                            color: feature.color,
                          }}
                        >
                          <SubIcon className="w-3.5 h-3.5" />
                          {i === 0 && feature.title.includes("WhatsApp")
                            ? "WhatsApp"
                            : i === 0 && feature.title.includes("Securisee")
                              ? "PIN 4 chiffres"
                              : i === 0 && feature.title.includes("Hors-Ligne")
                                ? "Offline"
                                : i === 0
                                  ? "Multi-tenant"
                                  : i === 1
                                    ? "Notif auto"
                                    : "Sync auto"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
