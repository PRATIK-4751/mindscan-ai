"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import GoogleSignInButton from "./GoogleSignInButton";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Home",      code: "01", href: "/" },
  { label: "Screening", code: "02", href: "/screening" },
  { label: "Results",   code: "03", href: "/results" },
];

export default function Navbar() {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname                = usePathname();
  const { user, signOut }       = useAuth();

  // Handle scroll state for glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [open]);

  return (
    <>
      {/* ── FLOATING HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none pt-6 px-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-start justify-between">
          
          {/* ── BRAND (Top Left Floating) ── */}
          <Link 
            href="/" 
            className="pointer-events-auto group flex items-center gap-4 select-none"
          >
            {/* Eye icon frame */}
            <div
              className="relative flex items-center justify-center w-[3.25rem] h-[3.25rem] shrink-0 overflow-hidden transition-all duration-500"
              style={{ 
                background: scrolled ? "rgba(10, 8, 6, 0.6)" : "transparent",
                backdropFilter: scrolled ? "blur(12px) saturate(180%)" : "none",
                border: scrolled ? "1px solid rgba(245,166,35,0.4)" : "1px solid rgba(245,166,35,0.15)",
                boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4)" : "none"
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20" className="opacity-90">
                <path
                  d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
                  stroke="#F5A623"
                  strokeWidth="1.5"
                />
                <circle cx="12" cy="12" r="3" stroke="#F5A623" strokeWidth="1.5" />
              </svg>
              {/* Animated scan line inside icon */}
              <div className="absolute inset-x-0 h-px animate-scan-line pointer-events-none"
                style={{ background: "rgba(245,166,35,0.7)", top: "50%" }} />
            </div>

            {/* Word mark */}
            <div className="hidden sm:flex flex-col leading-none justify-center">
              <span
                className="font-display tracking-[0.42em]"
                style={{
                  fontFamily: "var(--font-display), sans-serif",
                  fontSize:   "1.4rem",
                  color:      "#E8DCC8",          
                  textShadow: "0 4px 12px rgba(0,0,0,0.9)",
                }}
              >
                MINDSCAN
              </span>
              <span
                className="mt-1"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize:   "0.5rem",
                  letterSpacing: "0.32em",
                  color:      "#F5A623",
                  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                  opacity:    0.8,
                }}
              >
                PERCEPTION ENGINE v1.0
              </span>
            </div>
          </Link>

          {/* ── DESKTOP NAV (Top Right Floating Pill) ── */}
          <nav 
            className="pointer-events-auto hidden lg:flex items-center gap-1 p-1.5 transition-all duration-500"
            style={{
              background: scrolled ? "rgba(10, 8, 6, 0.6)" : "transparent",
              backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
              border: scrolled ? "1px solid rgba(232,220,200,0.12)" : "1px solid transparent",
              boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
              borderRadius: "100px", // Perfect pill
            }}
          >
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative flex items-center px-5 py-2.5 rounded-full transition-all duration-300"
                  style={{
                    background: active ? "rgba(232,220,200,0.08)" : "transparent",
                  }}
                >
                  <span
                    className="transition-colors duration-300"
                    style={{
                      fontFamily:    "var(--font-mono), monospace",
                      fontSize:      "0.65rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color:         active ? "#E8DCC8" : "rgba(232,220,200,0.45)",
                    }}
                  >
                    {link.label}
                  </span>
                  {/* Active glow */}
                  {active && (
                    <span 
                      className="absolute inset-0 rounded-full" 
                      style={{ boxShadow: "inset 0 0 12px rgba(232,220,200,0.05)" }}
                    />
                  )}
                </Link>
              );
            })}

            <div className="w-px h-6 mx-2" style={{ background: "rgba(232,220,200,0.15)" }} />

            {user ? (
              <button
                onClick={signOut}
                className="px-4 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[rgba(232,220,200,0.45)] hover:text-[#C0392B] transition-colors duration-200"
              >
                Sign Out
              </button>
            ) : (
              <div className="mr-1">
                <GoogleSignInButton />
              </div>
            )}

            <div className="w-px h-6 mx-2" style={{ background: "rgba(232,220,200,0.15)" }} />
            
            <div className="pr-2 pl-1">
              <ThemeToggle />
            </div>
          </nav>

          {/* ── MOBILE TOGGLE ── */}
          <button
            onClick={() => setOpen((p) => !p)}
            className="pointer-events-auto lg:hidden flex items-center justify-center w-12 h-12 transition-all duration-500 rounded-full"
            style={{
              background: scrolled ? "rgba(10, 8, 6, 0.6)" : "transparent",
              backdropFilter: scrolled ? "blur(12px) saturate(180%)" : "none",
              border: scrolled ? "1px solid rgba(232,220,200,0.15)" : "1px solid transparent",
              boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4)" : "none"
            }}
          >
            {open ? <X size={20} color="#E8DCC8" /> : <Menu size={20} color="#E8DCC8" />}
          </button>
        </div>
      </header>

      {/* ── MOBILE FULLSCREEN MENU ── */}
      <div 
        className={`fixed inset-0 z-40 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background: "rgba(4, 2, 1, 0.98)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
          {links.map((link, i) => {
             const active = pathname === link.href;
             return (
              <Link
                key={link.href}
                href={link.href}
                className="text-center group"
                style={{
                  transform: open ? 'translateY(0)' : 'translateY(30px)',
                  opacity: open ? 1 : 0,
                  transition: `transform 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 100 + 100}ms, opacity 0.6s ease ${i * 100 + 100}ms`
                }}
              >
                <span className="block font-mono text-[0.65rem] tracking-[0.4em] text-[#C0392B] mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
                  {link.code}
                </span>
                <span 
                  className="font-display text-5xl tracking-[0.25em] transition-colors duration-300"
                  style={{ 
                    color: active ? "#E8DCC8" : "rgba(232,220,200,0.3)",
                    textShadow: active ? "0 0 20px rgba(232,220,200,0.2)" : "none"
                  }}
                >
                  {link.label}
                </span>
              </Link>
             )
          })}

          <div 
            className="mt-12 flex flex-col items-center gap-8 w-full max-w-xs"
            style={{
              transform: open ? 'translateY(0)' : 'translateY(30px)',
              opacity: open ? 1 : 0,
              transition: `transform 0.6s cubic-bezier(0.22,1,0.36,1) 400ms, opacity 0.6s ease 400ms`
            }}
          >
            <div className="flex items-center gap-6 w-full justify-center">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#8B8680]">
                Interface Theme
              </span>
              <ThemeToggle />
            </div>

            <div className="w-full h-px bg-[rgba(232,220,200,0.1)]" />

            {user ? (
              <button
                onClick={signOut}
                className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[rgba(232,220,200,0.5)] hover:text-[#C0392B] transition-colors"
              >
                Sign Out ({user.email})
              </button>
            ) : (
              <GoogleSignInButton />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
