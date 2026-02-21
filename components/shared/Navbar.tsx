"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const links = [
  { label: "Landing", href: "/" },
  { label: "Screening", href: "/screening" },
  { label: "Results", href: "/results" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-[0.35em] text-[var(--cream)]">
          MINDSCAN
        </Link>
        <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)] md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-[var(--cream)]">
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
        <button onClick={() => setOpen((prev) => !prev)} className="md:hidden">
          {open ? <X className="h-6 w-6 text-[var(--cream)]" /> : <Menu className="h-6 w-6 text-[var(--cream)]" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-black/80 px-6 py-6 md:hidden">
          <div className="flex flex-col gap-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="hover:text-[var(--cream)]">
                {link.label}
              </Link>
            ))}
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
