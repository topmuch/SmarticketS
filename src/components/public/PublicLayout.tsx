'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Menu,
  X,
  Facebook,
  Twitter,
  Instagram,
  MapPin,
  Play,
} from "lucide-react";
import RGPDConsent from './RGPDConsent';

// Navigation Component
export function PublicNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080c1a]/95 backdrop-blur-md border-b border-[#1a2238]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-lg">
              <Image src="/logo-icon.png" alt="SmarticketS" fill className="object-cover" sizes="40px" />
            </div>
            <span className="text-xl font-bold text-[#ff2a6d]">SmarticketS</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="/#solutions" className="text-[#e0e6f0] hover:text-[#ff2a6d] transition-colors">Solutions</a>
            <a href="/#comment" className="text-[#e0e6f0] hover:text-[#ff2a6d] transition-colors">Comment ça marche</a>
            <a href="/#tarifs" className="text-[#e0e6f0] hover:text-[#ff2a6d] transition-colors">Tarifs</a>
            <Link href="/contact" className="text-[#e0e6f0] hover:text-[#ff2a6d] transition-colors">Contact</Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/demo">
              <Button variant="ghost" className="text-[#e0e6f0] hover:text-[#ff2a6d]">
                <Play className="w-4 h-4 mr-1" />
                Démo
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="text-[#e0e6f0] hover:text-[#b8860b]">
                Connexion
              </Button>
            </Link>
            <Link href="/devenir-partenaire">
              <Button className="bg-[#ff2a6d] hover:bg-[#e01e5a] text-white font-medium shadow-lg shadow-[#ff2a6d]/20">
                Devenir Partenaire
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-[#e0e6f0]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-[#1a2238]">
            <div className="flex flex-col gap-4">
              <a href="/#solutions" className="text-[#e0e6f0] hover:text-[#ff2a6d]" onClick={() => setIsOpen(false)}>Solutions</a>
              <a href="/#comment" className="text-[#e0e6f0] hover:text-[#ff2a6d]" onClick={() => setIsOpen(false)}>Comment ça marche</a>
              <a href="/#tarifs" className="text-[#e0e6f0] hover:text-[#ff2a6d]" onClick={() => setIsOpen(false)}>Tarifs</a>
              <Link href="/contact" className="text-[#e0e6f0] hover:text-[#ff2a6d]" onClick={() => setIsOpen(false)}>Contact</Link>
              <Link href="/demo" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-[#ff2a6d]">Voir la Démo</Button>
              </Link>
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-[#e0e6f0]">Connexion</Button>
              </Link>
              <Link href="/devenir-partenaire" onClick={() => setIsOpen(false)}>
                <Button className="w-full bg-[#ff2a6d] hover:bg-[#e01e5a] text-white">Devenir Partenaire</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Footer Component
export function PublicFooter() {
  return (
    <footer className="border-t border-[#1a2238] py-12 px-4 bg-[#080c1a]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                <Image src="/logo-icon.png" alt="SmarticketS" fill className="object-cover" sizes="40px" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#ff2a6d] to-[#d35400] bg-clip-text text-transparent">SmarticketS</span>
            </div>
            <p className="text-[#a0a8b8] text-sm">
              Protection intelligente des colis pour voyageurs et pèlerins.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Produit</h4>
            <ul className="space-y-2 text-[#a0a8b8] text-sm">
              <li><a href="/#solutions" className="hover:text-[#ff2a6d] transition-colors">Solutions</a></li>
              <li><a href="/#comment" className="hover:text-[#ff2a6d] transition-colors">Comment ça marche</a></li>
              <li><a href="/#tarifs" className="hover:text-[#ff2a6d] transition-colors">Tarifs</a></li>
              <li><Link href="/demo" className="hover:text-[#ff2a6d] transition-colors">Démo</Link></li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Entreprise</h4>
            <ul className="space-y-2 text-[#a0a8b8] text-sm">
              <li><Link href="/contact" className="hover:text-[#ff2a6d] transition-colors">Contact</Link></li>
              <li><Link href="/a-propos" className="hover:text-[#ff2a6d] transition-colors">À propos</Link></li>
              <li><Link href="/devenir-partenaire" className="hover:text-[#ff2a6d] transition-colors">Partenaires</Link></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Légal</h4>
            <ul className="space-y-2 text-[#a0a8b8] text-sm">
              <li><Link href="/mentions-legales" className="hover:text-[#ff2a6d] transition-colors">Mentions légales</Link></li>
              <li><Link href="/confidentialite" className="hover:text-[#ff2a6d] transition-colors">Politique de confidentialité</Link></li>
              <li><Link href="/cgu" className="hover:text-[#ff2a6d] transition-colors">CGU</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1a2238] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#a0a8b8] text-sm">
            © {new Date().getFullYear()} SmarticketS. Tous droits réservés.
          </p>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a href="#" className="text-[#a0a8b8] hover:text-[#ff2a6d] transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="text-[#a0a8b8] hover:text-[#ff2a6d] transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-[#a0a8b8] hover:text-[#ff2a6d] transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>

          {/* Map Link */}
          <a
            href="https://maps.google.com/?q=Poissy+France"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#a0a8b8] hover:text-[#ff2a6d] text-sm flex items-center gap-1 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Nous trouver
          </a>
        </div>
      </div>
    </footer>
  );
}

// Full Layout Component
interface PublicLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
  paddingTop?: string;
}

export default function PublicLayout({ 
  children, 
  showFooter = true,
  paddingTop = "pt-16"
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-[#080c1a] flex flex-col">
      <PublicNavigation />
      <main className={`flex-1 ${paddingTop}`}>
        {children}
      </main>
      {showFooter && <PublicFooter />}
      <RGPDConsent />
    </div>
  );
}
