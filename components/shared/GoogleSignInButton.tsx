"use client";

import { useAuth } from "./AuthProvider";

export default function GoogleSignInButton() {
  const { signInGoogle } = useAuth();

  return (
    <button
      onClick={signInGoogle}
      className="group flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-300"
      style={{
        border:     "1px solid rgba(232,220,200,0.25)",
        background: "rgba(10,8,6,0.6)",
        backdropFilter: "blur(8px)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background     = "rgba(192,57,43,0.15)";
        (e.currentTarget as HTMLButtonElement).style.borderColor    = "rgba(192,57,43,0.5)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background     = "rgba(10,8,6,0.6)";
        (e.currentTarget as HTMLButtonElement).style.borderColor    = "rgba(232,220,200,0.25)";
      }}
    >
      {/* Google G icon */}
      <svg width="16" height="16" viewBox="0 0 48 48" className="shrink-0">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>

      <span
        style={{
          fontFamily:    "var(--font-mono), monospace",
          fontSize:      "0.65rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color:         "#E8DCC8",
        }}
      >
        Continue with Google
      </span>
    </button>
  );
}
