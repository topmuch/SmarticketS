'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { QrCode, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Accueil', href: '#top' },
  { label: 'Processus', href: '#process' },
  { label: 'Demo', href: '/demo' },
  { label: 'Contact', href: '/contact' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = useCallback((href: string) => {
    setIsOpen(false);
    if (href.startsWith('#') && href !== '#top') {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (href === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // External links (like /contact) navigate normally via <Link>
  }, []);

  const isOnHero = !scrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(10,37,64,0.08)] border-b border-[#E2E8F0]'
          : 'bg-gradient-to-b from-[#0A2540]/50 to-transparent backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo-full.png"
              alt="SmarticketS"
              width={374}
              height={135}
              className={`h-8 w-auto transition-all duration-300 ${isOnHero ? 'brightness-0 invert drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]' : ''}`}
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isPage = link.href.startsWith('/');
              const LinkTag = isPage ? Link : 'a';
              const props = isPage
                ? { href: link.href, onClick: () => setIsOpen(false) }
                : { href: link.href, onClick: (e: React.MouseEvent) => { e.preventDefault(); handleNavClick(link.href); } };

              return (
                <LinkTag
                  key={link.label}
                  {...props}
                  className={`text-sm font-medium transition-colors duration-200 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#215ae2] after:transition-all after:duration-300 hover:after:w-full ${
                    isOnHero
                      ? 'text-white/90 hover:text-white after:bg-white/60'
                      : 'text-[#475569] hover:text-[#0A2540]'
                  }`}
                >
                  {link.label}
                </LinkTag>
              );
            })}
          </div>

          {/* Desktop CTA button */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/devenir-partenaire">
              <Button className="bg-[#215ae2] hover:bg-[#1a4fc0] text-white font-medium text-sm rounded-lg px-5 shadow-[0_4px_12px_rgba(33,90,226,0.25)] hover:shadow-[0_4px_16px_rgba(33,90,226,0.35)] transition-all hover:scale-[1.02]">
                Devenir Partenaire
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-1 transition-colors duration-300 ${isOnHero ? 'text-white' : 'text-[#0A2540]'}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden py-4 border-t border-[#E2E8F0] bg-white/98 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => {
                  const isPage = link.href.startsWith('/');
                  if (isPage) {
                    return (
                      <Link
                        key={link.label}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="text-[#0A2540] hover:text-[#215ae2] font-medium py-2 text-lg"
                      >
                        {link.label}
                      </Link>
                    );
                  }
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-[#0A2540] hover:text-[#215ae2] font-medium py-2 text-lg"
                      onClick={() => handleNavClick(link.href)}
                    >
                      {link.label}
                    </a>
                  );
                })}
                <hr className="border-[#E2E8F0]" />
                <Link href="/devenir-partenaire" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-[#215ae2] hover:bg-[#1a4fc0] text-white font-medium rounded-lg">
                    Devenir Partenaire
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
