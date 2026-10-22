"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bird, Menu, X, ArrowRight } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-surface/95 backdrop-blur-md border-b border-border shadow-xs py-3"
          : "bg-transparent py-4 sm:py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
              <Bird className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Le<span className="text-primary">fermier</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted">
            <a href="#simple-features" className="hover:text-primary transition-colors">
              Ce que fait l'application
            </a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">
              Comment ça marche
            </a>
            <a href="#who-is-it-for" className="hover:text-primary transition-colors">
              Pour qui ?
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors">
              Tarifs
            </a>
            <a href="#faq" className="hover:text-primary transition-colors">
              Questions
            </a>
            <a href="#contact" className="hover:text-primary transition-colors">
              Contact
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href={`${appUrl}/login`}
              className="px-3 py-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors"
            >
              Connexion
            </a>
            <a
              href={`${appUrl}/register`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
            >
              <span>Créer un compte</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href={`${appUrl}/login`}
              className="px-2.5 py-1 text-xs font-semibold text-primary"
            >
              Connexion
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 rounded-xl border border-border bg-surface p-4 shadow-md space-y-3">
            <nav className="flex flex-col gap-2 text-sm font-medium text-foreground">
              <a
                href="#simple-features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded hover:bg-surface-hover"
              >
                Ce que fait l'application
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded hover:bg-surface-hover"
              >
                Comment ça marche
              </a>
              <a
                href="#who-is-it-for"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded hover:bg-surface-hover"
              >
                Pour qui ?
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded hover:bg-surface-hover"
              >
                Tarifs
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded hover:bg-surface-hover"
              >
                Questions
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 px-2 rounded hover:bg-surface-hover"
              >
                Contact
              </a>
            </nav>

            <div className="pt-2 border-t border-border">
              <a
                href={`${appUrl}/register`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-xs"
              >
                <span>Créer mon compte gratuit</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
