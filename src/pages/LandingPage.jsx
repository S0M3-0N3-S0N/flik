import React from "react";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import InteractiveDemo from "@/components/landing/InteractiveDemo";
import Testimonials from "@/components/landing/Testimonials";
import CallToAction from "@/components/landing/CallToAction";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="bg-[#0A0A0A] overflow-hidden">
      <Hero />
      <Features />
      <InteractiveDemo />
      <Testimonials />
      <CallToAction />
      <Footer />
    </div>
  );
}