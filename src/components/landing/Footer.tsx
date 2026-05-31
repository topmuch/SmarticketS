'use client'

import Link from 'next/link'
import { Linkedin, Facebook, Instagram } from 'lucide-react'

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

interface FooterColumn {
  title: string
  links: FooterLink[]
}

const WA_URL =
  'https://wa.me/221784858226?text=Bonjour%20SmarticketS%2C%20je%20souhaite%20en%20savoir%20plus'

const columns: FooterColumn[] = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '/fonctionnalites' },
      { label: 'Sécurité', href: '/securite' },
      { label: 'Chauffeur', href: '/inscrire' },
      { label: 'Agence', href: '/agence/connexion' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Documentation', href: '/documentation' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Blog', href: '/blog' },
      { label: 'Support', href: '/support' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Partenariats', href: '/devenir-partenaire' },
      { label: 'CGU', href: '/cgu' },
      { label: 'Confidentialité', href: '/confidentialite' },
    ],
  },
]

const socialLinks = [
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
]

function FooterLinkItem({ link }: { link: FooterLink }) {
  const shared =
    'text-white/60 hover:text-white transition-colors text-sm'

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={shared}
      >
        {link.label}
      </a>
    )
  }

  return (
    <Link href={link.href} className={shared}>
      {link.label}
    </Link>
  )
}

export default function Footer() {
  return (
    <footer id="footer" className="bg-[#0A2540] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                  <rect x="14" y="2" width="8" height="8" rx="1" />
                  <rect x="8" y="14" width="8" height="8" rx="1" />
                </svg>
              </div>
              <span className="text-xl font-bold">SmarticketS</span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-xs">
              Plateforme de traçabilité et sécurité logistique pour le transport
              inter-villes au Sénégal.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Columns 2-4: Links */}
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-white/90 mb-4">
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            &copy; 2026 SmarticketS. Tous droits réservés.
          </p>
          <p className="text-white/40 text-sm">
            Made with <span className="text-red-400">&hearts;</span> au
            Sénégal
          </p>
        </div>
      </div>
    </footer>
  )
}
