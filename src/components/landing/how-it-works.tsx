"use client";

import { motion } from "framer-motion";
import { QrCode, ScanLine, Bus, PackageCheck } from "lucide-react";

const steps = [
  {
    icon: QrCode,
    number: "01",
    title: "Generation",
    description:
      "Le Superadmin genere les QR codes securises pour chaque trajet et lot de billets.",
    color: "#1e3a8a",
    bgColor: "#1e3a8a10",
  },
  {
    icon: ScanLine,
    number: "02",
    title: "Vente",
    description:
      "L'operateur scanne, active et envoie le ticket par WhatsApp au passager.",
    color: "#f59e0b",
    bgColor: "#f59e0b10",
  },
  {
    icon: Bus,
    number: "03",
    title: "Voyage",
    description:
      "Le passager montre son telephone, le controleur valide le billet en 1 seconde.",
    color: "#059669",
    bgColor: "#05966910",
  },
  {
    icon: PackageCheck,
    number: "04",
    title: "Livraison",
    description:
      "Le chauffeur scanne le colis, le destinataire recoit la notification de reception.",
    color: "#7c3aed",
    bgColor: "#7c3aed10",
  },
];

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="py-20 sm:py-28 bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#f59e0b]/10 text-[#d97706] text-sm font-semibold mb-4">
            Guide
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Comment ca{" "}
            <span className="text-[#f59e0b]">marche ?</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Du QR code a la livraison, decouvrez le parcours complet d&apos;un
            billet et d&apos;un colis SmartTicketQR.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical Line (Desktop) */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#1e3a8a] via-[#f59e0b] to-[#7c3aed]" />

          <div className="space-y-8 md:space-y-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLeft = index % 2 === 0;

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative md:flex items-center ${
                    isLeft ? "md:flex-row" : "md:flex-row-reverse"
                  } mb-12 md:mb-0`}
                >
                  {/* Content Card */}
                  <div
                    className={`w-full md:w-5/12 ${
                      isLeft ? "md:pr-12 md:text-right" : "md:pl-12"
                    }`}
                  >
                    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: step.color }}
                      >
                        Etape {step.number}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mt-1 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-gray-500 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Center Circle */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-14 h-14 rounded-full items-center justify-center shadow-xl z-10 border-4 border-white"
                    style={{ backgroundColor: step.color }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Empty Space (opposite side) */}
                  <div className="hidden md:block w-5/12" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
