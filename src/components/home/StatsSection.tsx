'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import AnimatedCounter from './AnimatedCounter';

const stats = [
  { value: 15000, suffix: '+', label: 'Colis livrés', icon: '📦', color: 'from-[#FF6B35] to-[#e65a28]' },
  { value: 50, suffix: '+', label: 'Agences partenaires', icon: '🏢', color: 'from-[#0077B6] to-[#005f8a]' },
  { value: 200, suffix: '+', label: 'Chauffeurs actifs', icon: '🚚', color: 'from-[#25D366] to-[#1fb855]' },
  { value: 99, suffix: '%', label: 'Satisfaction client', icon: '⭐', color: 'from-[#D4AF37] to-[#b8941f]' },
];

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-16 lg:py-20 px-4 bg-white relative overflow-hidden">
      {/* Subtle gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/3 via-transparent to-[#25D366]/3 pointer-events-none" />

      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 transition-all duration-300"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-3xl mb-3">{stat.icon}</div>
              <div className={`text-3xl lg:text-4xl font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent mb-1`}>
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  className="bg-gradient-to-br bg-clip-text text-transparent"
                />
              </div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
