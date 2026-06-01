'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import AnimatedCounter from './AnimatedCounter';

const stats = [
  {
    value: 50,
    suffix: '+',
    label: 'Partenaires de transport',
    icon: '🏢',
    bg: 'bg-gradient-to-br from-blue-500 to-cyan-400',
    ring: 'ring-blue-200',
    glow: 'shadow-blue-500/25',
  },
  {
    value: 10,
    displayK: true,
    suffix: 'K+',
    label: 'Tickets émis',
    icon: '🎫',
    bg: 'bg-gradient-to-br from-[#FF6B35] to-[#FF1D8D]',
    ring: 'ring-orange-200',
    glow: 'shadow-orange-500/25',
  },
  {
    value: 5,
    displayK: true,
    suffix: 'K+',
    label: 'Colis tracés',
    icon: '📦',
    bg: 'bg-gradient-to-br from-emerald-500 to-teal-400',
    ring: 'ring-emerald-200',
    glow: 'shadow-emerald-500/25',
  },
  {
    value: 100,
    suffix: '%',
    label: 'Couverture Sénégal',
    icon: '🇸🇳',
    bg: 'bg-gradient-to-br from-violet-500 to-purple-400',
    ring: 'ring-violet-200',
    glow: 'shadow-violet-500/25',
  },
];

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-16 lg:py-20 px-4 bg-slate-50 relative overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`relative group text-center p-6 lg:p-8 rounded-2xl ${stat.bg} shadow-xl ${stat.glow} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ring-1 ${stat.ring}/50`}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Light overlay for depth */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <div className="text-3xl lg:text-4xl mb-3 drop-shadow-sm">{stat.icon}</div>
                <div className="text-3xl lg:text-[2.5rem] font-extrabold text-white mb-1.5 tracking-tight">
                  {stat.displayK ? (
                    <>
                      <AnimatedCounter
                        end={stat.value}
                        className="text-white"
                      />
                      <span className="text-white">K+</span>
                    </>
                  ) : (
                    <AnimatedCounter
                      end={stat.value}
                      suffix={stat.suffix}
                      className="text-white"
                    />
                  )}
                </div>
                <p className="text-sm lg:text-base text-white/85 font-medium">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
