'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import FadeIn from './FadeIn';

const steps = [
  {
    number: '01',
    title: 'Scan & Activation',
    description:
      'Le chauffeur scanne le QR dormant, saisit itinéraire, expéditeur & destinataire.',
    image: '/images/process-scan-activation.png',
  },
  {
    number: '02',
    title: 'Notifications & PIN',
    description:
      'Messages wa.me envoyés. Code PIN à 6 chiffres généré et transmis au destinataire.',
    image: '/images/process-notifications-pin.png',
  },
  {
    number: '03',
    title: 'Transit & Suivi',
    description:
      'Traçabilité en temps réel. Dashboard agence mis à jour automatiquement.',
    image: '/images/process-transit-suivi.png',
  },
  {
    number: '04',
    title: 'Livraison Sécurisée',
    description:
      'Validation par PIN, preuve de remise, clôture du trajet. Archivage conforme.',
    image: '/images/process-livraison-securisee.png',
  },
];

export default function ProcessSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      id="process"
      className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
      style={{ background: '#0A2540' }}
    >
      <div className="max-w-6xl mx-auto" ref={sectionRef}>
        {/* Section title */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            Un processus logistique éprouvé,
            <br className="hidden sm:block" />
            de l&apos;activation à la livraison
          </h2>
        </FadeIn>

        {/* Desktop: 4 image cards in a row */}
        <div className="hidden lg:grid grid-cols-4 gap-6 lg:gap-8">
          {/* Connecting line */}
          <div className="absolute top-[20%] left-[18%] right-[18%] h-0.5 bg-white/10 rounded-full overflow-hidden hidden lg:block">
            <motion.div
              className="h-full bg-gradient-to-r from-[#215ae2] to-[#10B981] rounded-full"
              initial={{ width: '0%' }}
              animate={isInView ? { width: '100%' } : { width: '0%' }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
          </div>

          {steps.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.12}>
              <motion.div
                className="group relative"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{
                  duration: 0.5,
                  delay: 0.2 + i * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Step number badge */}
                <div className="relative z-10 w-10 h-10 bg-[#215ae2] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#215ae2]/30">
                  <span className="text-sm font-bold text-white">{step.number}</span>
                </div>

                {/* Image card */}
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] mb-5 shadow-xl shadow-black/20 group-hover:shadow-2xl group-hover:shadow-[#215ae2]/10 transition-all duration-500 group-hover:-translate-y-2">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540]/80 via-transparent to-transparent" />
                  {/* Title at bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {step.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-white/60 leading-relaxed text-center">
                  {step.description}
                </p>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        {/* Mobile: Vertical cards */}
        <div className="lg:hidden space-y-8">
          {/* Vertical line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-white/10 rounded-full overflow-hidden lg:hidden">
            <motion.div
              className="w-full bg-gradient-to-b from-[#215ae2] to-[#10B981] rounded-full"
              initial={{ height: '0%' }}
              animate={isInView ? { height: '100%' } : { height: '0%' }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
          </div>

          {steps.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.1}>
              <motion.div
                className="relative flex gap-5"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{
                  duration: 0.5,
                  delay: 0.2 + i * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Step number circle */}
                <div className="w-12 h-12 bg-[#215ae2] rounded-full flex items-center justify-center flex-shrink-0 relative z-10 shadow-lg shadow-[#215ae2]/30">
                  <span className="text-sm font-bold text-white">{step.number}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Mobile image */}
                  <div className="relative rounded-xl overflow-hidden aspect-[16/10] mb-4 shadow-lg shadow-black/20">
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className="object-cover"
                      sizes="80vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540]/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-base font-bold text-white">{step.title}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-white/60 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
