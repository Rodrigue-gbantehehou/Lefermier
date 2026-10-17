"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Sun,
  Moon,
  ChevronDown,
  Building2,
  LogOut,
  Check,
  Users,
  Plus,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { CreateFarmModal } from "@/components/farms/create-farm-modal";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, activeFarm, farms, switchFarm, logout, role, refreshMe } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Modal Nouvelle Ferme
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const farmRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (farmRef.current && !farmRef.current.contains(event.target as Node)) {
        setFarmDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md sm:px-6">
      {/* Left section: Hamburger button & Farm Selector */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-muted hover:bg-surface-hover hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </button>

        {/* Farm Selector dropdown */}
        <div className="relative" ref={farmRef}>
          <button
            type="button"
            onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            <Building2 className="h-4 w-4 text-primary" />
            <span className="max-w-[140px] truncate sm:max-w-[200px]">
              {activeFarm?.name || "Sélectionner une ferme"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          </button>

          {/* Dropdown list */}
          {farmDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-border bg-surface p-1.5 shadow-xl z-50">
              <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <span>Mes Exploitations</span>
                <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-mono text-muted">
                  {farms.length}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {farms.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted">
                    Aucune autre exploitation
                  </div>
                ) : (
                  farms.map((farm) => {
                    const isSelected = activeFarm?.id === farm.id;
                    return (
                      <button
                        key={farm.id}
                        type="button"
                        onClick={() => {
                          switchFarm(farm.id);
                          setFarmDropdownOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-primary-soft text-primary font-bold"
                            : "text-foreground hover:bg-surface-hover"
                        )}
                      >
                        <div className="truncate">
                          <div className="truncate font-semibold">{farm.name}</div>
                          {farm.location && (
                            <div className="text-[10px] text-muted truncate">{farm.location}</div>
                          )}
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary ml-2" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bouton Créer une nouvelle ferme */}
              <div className="mt-1.5 pt-1.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setFarmDropdownOpen(false);
                    setCreateModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-primary hover:bg-primary-soft transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Créer une nouvelle ferme</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right section: Theme toggle & User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark/Light toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Basculer le mode sombre"
          className="rounded-xl border border-border bg-surface p-2 text-muted shadow-2xs transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-accent" />
          ) : (
            <Moon className="h-4 w-4 text-primary" />
          )}
        </button>

        {/* User profile dropdown */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-1.5 pr-2.5 transition-colors hover:bg-surface-hover"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <div className="hidden text-left sm:block">
              <div className="max-w-[120px] truncate text-xs font-semibold text-foreground">
                {user?.fullName || "Utilisateur"}
              </div>
            </div>
            <ChevronDown className="h-3 w-3 text-muted" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-surface p-2 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.fullName}
                </p>
                <p className="text-[11px] text-muted truncate">
                  {user?.email}
                </p>
                <div className="mt-1 text-[10px] font-semibold text-primary">
                  {role?.name || "Rôle standard"}
                </div>
              </div>

              <Link
                href="/settings/farm"
                onClick={() => setUserDropdownOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors mb-1"
              >
                <Settings className="h-4 w-4 text-primary" />
                Paramètres de la ferme
              </Link>

              <Link
                href="/settings/members"
                onClick={() => setUserDropdownOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors mb-1"
              >
                <Users className="h-4 w-4 text-primary" />
                Utilisateurs & Employés
              </Link>

              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CRÉATION DE FERME (MULTI-EXPLOITATION) */}
      <CreateFarmModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </header>
  );
}
