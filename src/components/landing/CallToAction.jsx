import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../../utils";

export default function CallToAction() {
  return (
    <section id="cta" className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] to-[#141414]" />
      
      {/* Glow Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF6B35]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          Ready to Shape <br />
          <span className="gradient-text">Tomorrow's Visuals?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-xl text-white/60 mb-10 max-w-2xl mx-auto"
        >
          Join thousands of creators pushing the boundaries of digital art. 
          Start your creative journey today with Flik.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl("Generate"))}
            className="btn-gradient px-10 py-5 rounded-full text-xl font-bold inline-flex items-center gap-2 hover:scale-105 transition-transform shadow-2xl shadow-[#FF6B35]/20"
          >
            Get Started Now
            <ArrowRight className="w-6 h-6" />
          </button>
          
          <p className="mt-6 text-sm text-white/40">
            No credit card required. Free plan available.
          </p>
        </motion.div>
      </div>
    </section>
  );
}