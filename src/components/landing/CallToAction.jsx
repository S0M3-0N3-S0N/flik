import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function CallToAction() {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-[3rem] p-12 md:p-24 overflow-hidden border border-white/10 bg-[#141414]">
          {/* Animated Background */}
          <div className="absolute inset-0">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF6B35]/20 blur-[120px] rounded-full mix-blend-screen" />
             <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FFB800]/10 blur-[120px] rounded-full mix-blend-screen" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#FF6B35] mb-8"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start for free today</span>
            </motion.div>

            <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
              Unleash your <br />
              <span className="gradient-text">inner artist.</span>
            </h2>
            
            <p className="text-xl text-white/50 mb-12 max-w-2xl mx-auto">
              Join the new wave of digital creation. No credit card required. 
              Get 50 free credits when you sign up today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Generate"))}
                className="h-14 px-10 rounded-full btn-gradient text-white text-lg font-bold shadow-xl shadow-[#FF6B35]/20 hover:scale-105 transition-all duration-300"
              >
                Start Creating Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                className="h-14 px-10 rounded-full border-white/10 text-white text-lg font-medium hover:bg-white/5"
              >
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}