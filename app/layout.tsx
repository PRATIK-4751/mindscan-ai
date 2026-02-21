import "./globals.css";
import type { Metadata } from "next";
import { Bebas_Neue, Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import Navbar from "../components/shared/Navbar";
import ConsentModal from "../components/shared/ConsentModal";

const bebas = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas" });
const space = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-space" });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "MindScan AI",
  description: "Multimodal AI Depression Screening — MindScan AI",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bebas.variable} ${space.variable} ${inter.variable} ${jetbrains.variable} bg-[var(--bg-primary)]`}>
        <div className="min-h-screen">
          <Navbar />
          {children}
          <ConsentModal />
        </div>
      </body>
    </html>
  );
}
