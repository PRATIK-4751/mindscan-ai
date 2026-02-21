import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import SignalVault from "../components/landing/SignalVault";
import Footer from "../components/landing/Footer";

export default function HomePage() {
  return (
    <main className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Hero />
      <HowItWorks />
      <SignalVault />
      <Footer />
    </main>
  );
}
