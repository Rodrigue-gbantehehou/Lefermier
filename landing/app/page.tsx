import React from "react";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { StatsStrip } from "@/components/stats-strip";
import { SimpleFeatures } from "@/components/simple-features";
import { HowItWorks } from "@/components/how-it-works";
import { WhoIsItFor } from "@/components/who-is-it-for";
import { Pricing } from "@/components/pricing";
import { FAQ } from "@/components/faq";
import { ContactSection } from "@/components/contact-section";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-white">
      {/* Navigation */}
      <Navbar />

      {/* Main Content: Clean, Human, Accessible to All */}
      <main className="flex-1">
        {/* 1. Hero with Real African Farmer Photography & Warm Headline */}
        <Hero />

        {/* 2. Clear Everyday Points */}
        <StatsStrip />

        {/* 3. The 4 Simple Tasks with Real Egg Trays Photo */}
        <SimpleFeatures />

        {/* 4. Easy 3 Steps Daily Workflow */}
        <HowItWorks />

        {/* 5. Clear Profiles (Owners, Managers, Vets) */}
        <WhoIsItFor />

        {/* 6. Simple, Transparent Pricing in FCFA */}
        <Pricing />

        {/* 7. Practical Everyday FAQ */}
        <FAQ />

        {/* 8. Human Support & Contact */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
