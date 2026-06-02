"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Bell, QrCode } from "lucide-react";
import Image from "next/image";

const securityFeatures = [
  {
    icon: Lock,
    title: "Code PIN unique",
    description: "Un code a 4 chiffres genere automatiquement pour chaque colis.",
  },
  {
    icon: Bell,
    title: "Notification instantanee",
    description: "Le destinataire recoit une alerte WhatsApp des l'arrivee du colis.",
  },
  {
    icon: ShieldCheck,
    title: "Retrait securise",
    description: "Le colis ne peut etre remis qu'au destinataire muni du bon code PIN.",
  },
  {
    icon: QrCode,
    title: "Tracabilite totale",
    description: "Suivez votre colis en temps reel : expedition, transit, arrivee.",
  },
];

export function ColisSection() {
  return (
    <section className="py-20 sm:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Background decoration */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#1e3a8a]/5 to-[#f59e0b]/5 rotate-3" />

              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-gray-300/30 border border-gray-100">
                <Image
                  src="/colis-illustration.png"
                  alt="Illustration colis avec QR code"
                  width={500}
                  height={500}
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg shadow-gray-200/50 px-4 py-3 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">100% Securise</p>
                    <p className="text-[10px] text-gray-500">Code PIN obligatoire</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg shadow-gray-200/50 px-4 py-3 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Notif WhatsApp</p>
                    <p className="text-[10px] text-gray-500">En temps reel</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#f59e0b]/10 text-[#d97706] text-sm font-semibold mb-4">
              Service Colis
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Ne perdez plus{" "}
              <span className="text-[#1e3a8a]">aucun colis</span>
            </h2>
            <p className="mt-4 text-lg text-gray-500 leading-relaxed">
              Notre systeme genere un code PIN unique a 4 chiffres. Le
              destinataire ne peut retirer son colis qu&apos;avec ce code,
              garantissant une securite totale.
            </p>

            {/* Security Features Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {securityFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-[#f8fafc] border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#1e3a8a]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
