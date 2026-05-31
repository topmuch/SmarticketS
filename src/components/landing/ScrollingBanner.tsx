'use client';

import { motion } from 'framer-motion';

const keywords = [
  'Qrcode livraison',
  'Livraison notifiée',
  'Bagage protégé',
  'Client notifié',
  'Propriétaire notifié',
  'Code de livraison client',
  'Suivi en temps réel',
  'PIN sécurisé',
];

export default function ScrollingBanner() {
  return (
    <section className="relative overflow-hidden bg-[#0A2540] py-4" aria-label="Bandeau défilant">
      {/* Gradient edges for smooth fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0A2540] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0A2540] to-transparent z-10 pointer-events-none" />

      <div className="flex">
        {/* First row - left to right */}
        <motion.div
          className="flex shrink-0 items-center gap-8 pr-8"
          animate={{ x: ['0%', '-100%'] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 20,
              ease: 'linear',
            },
          }}
        >
          {[...keywords, ...keywords].map((keyword, i) => (
            <span
              key={`a-${i}`}
              className="inline-flex items-center gap-2 text-white/90 font-semibold text-sm sm:text-base whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-[#215ae2] shrink-0" />
              {keyword}
            </span>
          ))}
        </motion.div>

        {/* Second row - duplicate for seamless loop */}
        <motion.div
          className="flex shrink-0 items-center gap-8 pr-8"
          animate={{ x: ['0%', '-100%'] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 20,
              ease: 'linear',
            },
          }}
        >
          {[...keywords, ...keywords].map((keyword, i) => (
            <span
              key={`b-${i}`}
              className="inline-flex items-center gap-2 text-white/90 font-semibold text-sm sm:text-base whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
              {keyword}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
