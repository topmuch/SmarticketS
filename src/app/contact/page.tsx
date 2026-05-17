'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Phone,
  MapPinned,
  CheckCircle,
  Clock,
  MessageCircle,
  ArrowRight,
  QrCode,
} from 'lucide-react';
import { motion } from 'framer-motion';

const WA_URL = 'https://wa.me/221784858226?text=Bonjour%20QRTrans%2C%20je%20souhaite%20en%20savoir%20plus';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          senderName: formData.name,
          senderEmail: formData.email,
          senderPhone: formData.phone || null,
          subject: formData.subject,
          content: formData.message,
        }),
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(10,37,64,0.08)] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF6B35] shadow-[0_4px_12px_rgba(255,107,53,0.25)]">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#0A2540] tracking-tight">
                QRTrans
              </span>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="text-[#475569] hover:text-[#0A2540] text-sm font-medium gap-2">
                <ArrowRight className="w-4 h-4 rotate-180" />
                Retour
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 bg-white border border-[#E2E8F0] rounded-full shadow-[0_4px_24px_rgba(10,37,64,0.06)]">
              <span className="text-sm font-medium text-[#475569] tracking-wide">
                🇸🇳 Nous sommes à votre écoute
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0A2540] mb-5 leading-[1.08] tracking-tight">
              Contactez-<span className="text-[#FF6B35]">nous</span>
            </h1>
            <p className="text-lg text-[#475569] max-w-xl mx-auto leading-relaxed">
              Une question sur nos solutions, un projet de partenariat ou besoin de support ? Notre équipe vous répond sous 24h.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: MapPinned,
                label: 'Adresse',
                value: 'Cité Alia Diène, Ouest Foire, Yoff',
                color: '#FF6B35',
                bg: 'bg-orange-50',
                border: 'border-orange-100',
              },
              {
                icon: Phone,
                label: 'Téléphone',
                value: '+221 78 485 82 26',
                href: 'tel:+221784858226',
                color: '#3B82F6',
                bg: 'bg-blue-50',
                border: 'border-blue-100',
              },
              {
                icon: Mail,
                label: 'Email',
                value: 'contact@qrtrans.com',
                href: 'mailto:contact@qrtrans.com',
                color: '#8a2be2',
                bg: 'bg-violet-50',
                border: 'border-violet-100',
              },
              {
                icon: MessageCircle,
                label: 'WhatsApp',
                value: 'Chat en direct',
                href: WA_URL,
                color: '#25D366',
                bg: 'bg-emerald-50',
                border: 'border-emerald-100',
              },
            ].map((item, i) => (
              <motion.a
                key={item.label}
                href={item.href || undefined}
                target={item.href?.startsWith('http') ? '_blank' : undefined}
                rel={item.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group"
              >
                <div className={`${item.bg} border ${item.border} rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-md transition-all duration-300 h-full`}>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <h3 className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                    {item.label}
                  </h3>
                  <p className="text-sm font-medium text-[#0A2540] leading-snug">
                    {item.value}
                  </p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Map */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Formulaire */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-[#0A2540] mb-2 tracking-tight">
                Envoyez-nous un message
              </h2>
              <p className="text-sm text-[#475569] mb-8">
                Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.
              </p>

              <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6 sm:p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-5">
                      <CheckCircle className="w-8 h-8 text-[#10B981]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">
                      Message envoyé !
                    </h3>
                    <p className="text-sm text-[#475569] mb-6 max-w-sm mx-auto">
                      Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.
                    </p>
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
                      }}
                      className="bg-[#FF6B35] hover:bg-[#e65a28] text-white font-semibold text-sm rounded-lg px-6 shadow-[0_4px_12px_rgba(255,107,53,0.25)]"
                    >
                      Envoyer un autre message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                          Nom complet <span className="text-[#FF6B35]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Votre nom"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-white border border-[#E2E8F0] text-[#0A2540] placeholder:text-[#475569]/50 focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                          Email <span className="text-[#FF6B35]">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="votre@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-white border border-[#E2E8F0] text-[#0A2540] placeholder:text-[#475569]/50 focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          placeholder="+221 7X XXX XX XX"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-white border border-[#E2E8F0] text-[#0A2540] placeholder:text-[#475569]/50 focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                          Sujet <span className="text-[#FF6B35]">*</span>
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-white border border-[#E2E8F0] text-[#0A2540] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 text-sm"
                          required
                        >
                          <option value="">Sélectionnez un sujet</option>
                          <option value="partenariat">Devenir partenaire</option>
                          <option value="support">Support technique</option>
                          <option value="info">Informations générales</option>
                          <option value="tarifs">Tarifs & abonnements</option>
                          <option value="autre">Autre</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                        Message <span className="text-[#FF6B35]">*</span>
                      </label>
                      <textarea
                        placeholder="Décrivez votre demande..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 rounded-lg bg-white border border-[#E2E8F0] text-[#0A2540] placeholder:text-[#475569]/50 focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 text-sm resize-none"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#FF6B35] hover:bg-[#e65a28] text-white py-3.5 font-semibold text-sm rounded-lg shadow-[0_4px_12px_rgba(255,107,53,0.25)] hover:shadow-[0_4px_16px_rgba(255,107,53,0.35)] transition-all hover:scale-[1.01] disabled:opacity-50"
                    >
                      {submitting ? 'Envoi en cours...' : 'Envoyer le message'}
                    </Button>

                    <p className="text-xs text-[#475569]/70 text-center">
                      En envoyant ce formulaire, vous acceptez notre{' '}
                      <Link href="/confidentialite" className="text-[#FF6B35] hover:underline">
                        politique de confidentialité
                      </Link>
                      .
                    </p>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Map + infos complémentaires */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-col gap-6"
            >
              {/* Google Map */}
              <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm flex-1 min-h-[300px]">
                <iframe
                  title="Localisation QRTrans - Yoff, Sénégal"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.2!2d-17.445!3d14.745!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xec172d5e5b0b0b1%3A0x0!2sOuest+Foire%2C+Yoff%2C+Dakar%2C+S%C3%A9n%C3%A9gal!5e0!3m2!1sfr!2ssn!4v1700000000000!5m2!1sfr!2ssn"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '300px' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full min-h-[300px]"
                />
              </div>

              {/* Horaires */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#0A2540] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0A2540]">Horaires d&apos;ouverture</h3>
                    <p className="text-xs text-[#475569]">Support disponible 7j/7</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">Lundi - Vendredi</span>
                    <span className="font-semibold text-[#0A2540]">08h00 - 18h00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">Samedi</span>
                    <span className="font-semibold text-[#0A2540]">09h00 - 14h00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">Dimanche &amp; fériés</span>
                    <span className="font-semibold text-[#10B981]">WhatsApp uniquement</span>
                  </div>
                </div>
              </div>

              {/* CTA WhatsApp */}
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl p-5 shadow-[0_4px_16px_rgba(37,211,102,0.3)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.4)] transition-all duration-300 hover:translate-y-[-2px]"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">Préférez le chat WhatsApp ?</h3>
                  <p className="text-white/80 text-sm">Réponse instantanée, 7j/7</p>
                </div>
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer simple */}
      <footer className="bg-[#0A2540] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">QRTrans</span>
            </div>
            <p className="text-white/50 text-sm">
              &copy; 2026 QRTrans. Tous droits réservés. Made with ❤️ au Sénégal
            </p>
            <div className="flex items-center gap-4">
              <Link href="/confidentialite" className="text-white/50 hover:text-white text-sm transition-colors">
                Confidentialité
              </Link>
              <Link href="/cgu" className="text-white/50 hover:text-white text-sm transition-colors">
                CGU
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
