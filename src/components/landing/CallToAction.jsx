import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CallToAction() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FF6B35]/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="rounded-[3rem] p-12 md:p-24 text-center border border-white/10 bg-[#141414]/50 backdrop-blur-xl relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B35]/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F72C25]/20 blur-[100px] rounded-full pointer-events-none" />
          
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Ready to start your <br />
            <span className="gradient-text">creative journey?</span>
          </h2>
          
          <p className="text-xl text-white/50 mb-10 max-w-2xl mx-auto">
            Join thousands of creators using Flik to bring their ideas to life. 
            No credit card required to start imagining.
          </p>
          
          <Link to={createPageUrl("Generate")}>
            <Button className="h-14 px-10 rounded-full btn-gradient text-white text-lg font-bold shadow-2xl shadow-[#FF6B35]/30 hover:shadow-[#FF6B35]/50 hover:scale-105 transition-all duration-300">
              Launch Flik Studio
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}