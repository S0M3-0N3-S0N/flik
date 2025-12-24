import React from "react";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import CallToAction from "@/components/landing/CallToAction";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-hidden">
      <Hero />
      <Features />
      <CallToAction />
      <Footer />
    </div>
  );
}