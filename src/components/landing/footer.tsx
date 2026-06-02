"use client";

import { Bus, Mail, Phone, MapPin } from "lucide-react";
import { BRAND } from "@/lib/constants";

const footerLinks = {
  produit: [
    { label: "Billetterie", href: "#fonctionnalites" },
    { label: "Suivi de Colis", href: "#fonctionnalites" },
    { label: "Affichage Gare", href: "#demo" },
    { label: "PWA Hors-ligne", href: "#fonctionnalites" },
  ],
  support: [
    { label: "Centre d'aide", href: `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER || BRAND.whatsappBusiness}?text=${encodeURIComponent("Bonjour, j'ai besoin d'aide pour SmartTicketQR.")}` },
    { label: "Contactez-nous", href: "#contact" },
    { label: "FAQ", href: `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER || BRAND.whatsappBusiness}?text=${encodeURIComponent("Bonjour, j'ai une question sur SmartTicketQR.")}` },
  ],
  legal: [
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "Politique de confidentialité", href: "/confidentialite" },
    { label: "Conditions d'utilisation", href: "/conditions" },
    { label: "CGS", href: "/cgs" },
  ],
};

export function Footer() {
  const handleNavClick = (href: string) => {
    if (href.startsWith('https://') || href.startsWith('http://')) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (href.startsWith('/') || href.startsWith('#')) {
      if (href.startsWith('#') && href !== '#') {
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth' });
      }
      // Internal page links (/mentions-legales, etc.) — no-op on SPA,
      // future pages will be handled by the router
    }
  };

  return (
    <footer id="contact" className="bg-[#0a1420] text-white">
      {/* CTA Banner */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] p-8 sm:p-12 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#f59e0b]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Pret a moderniser votre transport ?
              </h3>
              <p className="text-white/80 max-w-xl mx-auto mb-6">
                Rejoignez les +50 transporteurs qui font confiance a
                SmartTicketQR. Demandez votre demonstration gratuite.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={`https://wa.me/${BRAND.whatsappBusiness}?text=${encodeURIComponent("Bonjour, je souhaite demander une demonstration de SmartTicketQR.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold rounded-xl shadow-lg shadow-[#f59e0b]/30 transition-all"
                >
                  Demander une Demo
                </a>
                <a
                  href={`https://wa.me/${BRAND.whatsappBusiness}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur-sm transition-all border border-white/20"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] flex items-center justify-center">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-white">Smart</span>
                <span className="text-[#f59e0b]">Ticket</span>
                <span className="text-white">QR</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
              La plateforme SaaS de reference pour la gestion du transport au
              Senegal. Billetterie QR, colis, affichage temps reel.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4 text-[#f59e0b]" />
                {BRAND.supportEmail}
              </a>
              <a
                href={`tel:+${BRAND.supportPhone}`}
                className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-[#f59e0b]" />
                +{BRAND.supportPhone.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4")}
              </a>
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
                Dakar, Senegal
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Produit
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.produit.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Support
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {BRAND.copyrightYear} {BRAND.name}. Tous droits reserves.
          </p>
          <p className="text-sm text-gray-500">
            Fait avec passion a Dakar, Senegal{" "}
            <span className="text-[#f59e0b]">&hearts;</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
