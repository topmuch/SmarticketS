'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Truck, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import FadeIn from './FadeIn';

export default function SpacesSection() {
  return (
    <section
      id="spaces"
      className="bg-white py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section title */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A2540] mb-5 tracking-tight leading-tight">
            Votre espace, votre métier
          </h2>
        </FadeIn>

        {/* Two cards side by side */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Chauffeur card */}
          <FadeIn delay={0.08}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group h-full bg-white border-2 border-[#10B981]/30 rounded-xl p-8 lg:p-10 shadow-[0_4px_24px_rgba(10,37,64,0.04)] hover:shadow-[0_8px_32px_rgba(16,185,129,0.12)] transition-shadow duration-300"
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-[#10B981]/10 rounded-xl flex items-center justify-center mb-6">
                <Truck className="w-7 h-7 text-[#10B981]" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-[#0A2540] mb-3">
                Chauffeurs certifiés
              </h3>

              {/* Description */}
              <p className="text-sm text-[#475569] leading-relaxed mb-8">
                Interface Lite 3 écrans. Mode offline. Notifications wa.me.
                Historique personnel.
              </p>

              {/* CTA */}
              <Link href="/inscrire">
                <Button className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm rounded-lg px-6 py-3.5 shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all hover:scale-[1.02] gap-2">
                  Commencer maintenant
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </FadeIn>

          {/* Agence card */}
          <FadeIn delay={0.16}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group h-full bg-white border-2 border-[#FF6B35]/30 rounded-xl p-8 lg:p-10 shadow-[0_4px_24px_rgba(10,37,64,0.04)] hover:shadow-[0_8px_32px_rgba(255,107,53,0.12)] transition-shadow duration-300"
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7 text-[#FF6B35]" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-[#0A2540] mb-3">
                Agences partenaires
              </h3>

              {/* Description */}
              <p className="text-sm text-[#475569] leading-relaxed mb-8">
                Génération de lots QR. Assignation chauffeurs. Analytics. Export
                comptable.
              </p>

              {/* CTA */}
              <Link href="/devenir-partenaire">
                <Button className="w-full bg-[#FF6B35] hover:bg-[#e65a28] text-white font-semibold text-sm rounded-lg px-6 py-3.5 shadow-[0_4px_12px_rgba(255,107,53,0.25)] hover:shadow-[0_4px_16px_rgba(255,107,53,0.35)] transition-all hover:scale-[1.02] gap-2">
                  Devenir partenaire
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
