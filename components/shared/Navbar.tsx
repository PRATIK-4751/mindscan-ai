"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const links = [
  { label: "Home",      code: "01", href: "/" },
  { label: "Screening", code: "02", href: "/screening" },
  { label: "Results",   code: "03", href: "/results" },
];

export default function Navbar() {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname                = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          /* Pure glass — starts completely transparent, gains tint on scroll */
          background: scrolled
            ? "rgba(4, 2, 1, 0.72)"
            : "rgba(0, 0, 0, 0.08)",
          backdropFilter:         `blur(${scrolled ? 22 : 8}px) saturate(160%)`,
          WebkitBackdropFilter:   `blur(${scrolled ? 22 : 8}px) saturate(160%)`,
          borderBottom:           scrolled
            ? "1px solid rgba(245,166,35,0.18)"
            : "1px solid rgba(255,255,255,0.05)",
          boxShadow: scrolled
            ? "0 4px 32px rgba(0,0,0,0.5)"
            : "none",
          transition: "background 0.5s ease, backdrop-filter 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease",
        }}
      >
        {/* Amber top hairline — always visible */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #F5A623 25%, #C0392B 60%, transparent 100%)",
            opacity: scrolled ? 0.9 : 0.4,
            transition: "opacity 0.5s ease",
          }}
        />

        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3.5">

          {/* ── BRAND ── */}
          <Link href="/" className="group flex items-center gap-3 select-none">
            {/* Eye icon frame */}
            <div
              className="relative flex items-center justify-center w-8 h-8 shrink-0 overflow-hidden"
              style={{ border: "1px solid rgba(245,166,35,0.4)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
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

            {/* Word mark — always cream, never adapts to theme */}
            <div className="flex flex-col leading-none">
              <span
                className="font-display tracking-[0.42em]"
                style={{
                  fontFamily: "var(--font-display), sans-serif",
                  fontSize:   "1.25rem",
                  color:      "#E8DCC8",          /* hardcoded — always cream */
                  textShadow: scrolled ? "none" : "0 0 20px rgba(232,220,200,0.3)",
                  transition: "text-shadow 0.4s ease",
                }}
              >
                MINDSCAN
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize:   "0.48rem",
                  letterSpacing: "0.28em",
                  color:      "#F5A623",
                  opacity:    0.55,
                }}
              >
                PERCEPTION ENGINE v1.0
              </span>
            </div>
          </Link>

          {/* ── DESKTOP NAV ── */}
          <nav className="hidden md:flex items-center">
            {links.map((link, i) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative flex items-center gap-1.5 px-4 py-2 mx-0.5 transition-all duration-200"
                  style={{
                    background:   active ? "rgba(192,57,43,0.12)" : "transparent",
                    border:       active
                      ? "1px solid rgba(192,57,43,0.45)"
                      : "1px solid transparent",
                  }}
                >
                  <span
                    style={{
                      fontFamily:    "var(--font-mono), monospace",
                      fontSize:      "0.56rem",
                      letterSpacing: "0.1em",
                      color:         active ? "#C0392B" : "rgba(139,134,128,0.55)",
                      transition:    "color 0.2s",
                    }}
                  >
                    {link.code}
                  </span>
                  <span
                    className="group-hover:text-[#F5A623] transition-colors duration-200"
                    style={{
                      fontFamily:    "var(--font-mono), monospace",
                      fontSize:      "0.65rem",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color:         active ? "#E8DCC8" : "#8B8680",
                    }}
                  >
                    {link.label}
                  </span>

                  {/* Active underline dot */}
                  {active && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: "#C0392B" }}
                    />
                  )}
                </Link>
              );
            })}

            {/* Separator */}
            <div
              className="mx-3 h-5 w-px"
              style={{ background: "rgba(232,220,200,0.15)" }}
            />

            <ThemeToggle />
          </nav>

          {/* ── MOBILE HAMBURGER ── */}
          <button
            onClick={() => setOpen((p) => !p)}
            aria-label="Toggle menu"
            className="md:hidden flex flex-col items-center justify-center w-9 h-9 gap-[5px] transition-all duration-200"
            style={{
              border:     "1px solid rgba(232,220,200,0.2)",
              background: "rgba(0,0,0,0.3)",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-px transition-all duration-300 origin-center"
                style={{
                  background: "#E8DCC8",
                  width:       i === 1 ? (open ? "0px" : "14px") : "20px",
                  opacity:     i === 1 && open ? 0 : 1,
                  transform:
                    open
                      ? i === 0
                        ? "translateY(6px) rotate(45deg)"
                        : i === 2
                        ? "translateY(-6px) rotate(-45deg)"
                        : "none"
                      : "none",
                }}
              />
            ))}
          </button>
        </div>

        {/* ── MOBILE DRAWER ── */}
        <div
          className="md:hidden overflow-hidden"
          style={{
            maxHeight:  open ? "280px" : "0px",
            transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            background: "rgba(4, 2, 1, 0.94)",
            backdropFilter: "blur(20px)",
            borderTop:  open ? "1px solid rgba(245,166,35,0.12)" : "none",
          }}
        >
          <div className="px-6 py-5 flex flex-col gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-3 py-3 transition-all duration-200"
                  style={{
                    borderLeft: active
                      ? "2px solid #C0392B"
                      : "2px solid transparent",
                    background: active ? "rgba(192,57,43,0.08)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize:   "0.55rem",
                      color:      "#C0392B",
                    }}
                  >
                    {link.code}
                  </span>
                  <span
                    style={{
                      fontFamily:    "var(--font-mono), monospace",
                      fontSize:      "0.7rem",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color:         active ? "#E8DCC8" : "#8B8680",
                    }}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}

            <div
              className="mt-3 pt-3 flex items-center gap-3"
              style={{ borderTop: "1px solid rgba(232,220,200,0.08)" }}
            >
              <span
                style={{
                  fontFamily:    "var(--font-mono), monospace",
                  fontSize:      "0.6rem",
                  letterSpacing: "0.2em",
                  color:         "#8B8680",
                  textTransform: "uppercase",
                }}
              >
                Theme
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
