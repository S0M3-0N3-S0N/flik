import React from "react";
import Hero from "@/components/landing/Hero";
import LogoCloud from "@/components/landing/LogoCloud";
import Features from "@/components/landing/Features";
import InteractiveDemo from "@/components/landing/InteractiveDemo";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CallToAction from "@/components/landing/CallToAction";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="bg-[#0A0A0A] overflow-hidden">
      <Hero />
      <LogoCloud />
      <Features />
      <InteractiveDemo />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CallToAction />
      <Footer />
    </div>
  );
}