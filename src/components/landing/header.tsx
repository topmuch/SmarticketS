"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Menu, X, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onLoginClick: () => void;
  onDemoClick: () => void;
}

const navLinks = [
  { label: "Accueil", href: "#accueil" },
  { label: "Fonctionnalites", href: "#fonctionnalites" },
  { label: "Demo en Direct", href: "#demo" },
  { label: "Comment ca marche", href: "#comment-ca-marche" },
  { label: "Contact", href: "#contact" },
];

export function Header({ onLoginClick, onDemoClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg shadow-black/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a
            href="#accueil"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("#accueil");
            }}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] flex items-center justify-center shadow-lg shadow-[#1e3a8a]/25 group-hover:scale-105 transition-transform">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#1e3a8a]">Smart</span>
              <span className="text-[#f59e0b]">Ticket</span>
              <span className="text-[#1e3a8a]">QR</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-[#1e3a8a] rounded-lg hover:bg-[#1e3a8a]/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onLoginClick}
              className="border-[#1e3a8a]/20 text-[#1e3a8a] hover:bg-[#1e3a8a]/5 hover:text-[#1e3a8a]"
            >
              Connexion Admin
            </Button>
            <Button
              onClick={onDemoClick}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-lg shadow-[#f59e0b]/25 hover:shadow-[#f59e0b]/40 transition-all"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Voir la Demo
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white border-t border-gray-100 shadow-xl"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-600 hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/5 rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLoginClick();
                  }}
                  className="w-full border-[#1e3a8a]/20 text-[#1e3a8a]"
                >
                  Connexion Admin
                </Button>
                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onDemoClick();
                  }}
                  className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white"
                >
                  Voir la Demo
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
