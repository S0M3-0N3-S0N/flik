import React from "react";
import { motion } from "framer-motion";
import { Wand2, Layers, Zap, Image as ImageIcon, Crop, Sliders, Smartphone, Share2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../../utils";

const FeatureCard = ({ title, description, icon: Icon, className, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className={`group relative p-8 rounded-3xl bg-[#141414] border border-white/5 overflow-hidden hover:border-white/10 transition-colors ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10 h-full flex flex-col">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
        <Icon className="w-6 h-6 text-[#FF6B35]" />
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-white/50 leading-relaxed flex-1">{description}</p>
    </div>
  </motion.div>
);

export default function Features() {
  return (
    <section id="features" className="py-32 px-6 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-24 md:text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-8">
            Everything you need. <br />
            <span className="text-white/40">Nothing you don't.</span>
          </h2>
          <p className="text-xl text-white/60">
            A complete suite of creative tools powered by state-of-the-art AI, 
            packaged in a beautiful, distraction-free interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
          {/* Bento Grid Layout */}
          
          {/* Large Card 1 */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            onClick={() => base44.auth.redirectToLogin(createPageUrl("Generate"))}
            className="md:col-span-2 row-span-2 rounded-3xl bg-[#141414] border border-white/5 overflow-hidden relative min-h-[500px] group cursor-pointer"
          >
            <div className="absolute inset-0">
               <img 
                src="https://images.unsplash.com/photo-1620641788427-b9f4dbf96bfd?q=80&w=2560&auto=format&fit=crop" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                alt="AI Art"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 p-10 max-w-xl">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B35] flex items-center justify-center mb-6">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-4 flex items-center gap-3">
                Imagine AI
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm bg-white/20 px-3 py-1 rounded-full">Try Now</span>
              </h3>
              <p className="text-lg text-white/70">
                Transform text into breathtaking images in seconds. Powered by the latest diffusion models, 
                Imagine AI understands nuance, style, and composition like a human artist.
              </p>
            </div>
          </motion.div>

          {/* Small Card 1 */}
          <FeatureCard 
            title="Smart Analysis"
            description="Upload reference images and let our AI analyze and enhance them while maintaining your unique style."
            icon={Zap}
            delay={0.1}
          />

          {/* Small Card 2 */}
          <FeatureCard 
            title="Style Mixing"
            description="Blend multiple artistic styles together to create something entirely new and unique."
            icon={Layers}
            delay={0.2}
          />

           {/* Large Card 2 */}
           <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            onClick={() => base44.auth.redirectToLogin(createPageUrl("Editor"))}
            className="md:col-span-2 row-span-1 rounded-3xl bg-[#141414] border border-white/5 overflow-hidden relative min-h-[300px] group flex items-center cursor-pointer"
           >
            <div className="absolute inset-0 bg-gradient-to-r from-[#141414] to-transparent z-10" />
            <img 
                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2670&auto=format&fit=crop" 
                className="absolute right-0 top-0 w-2/3 h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                alt="Studio"
            />
            <div className="relative z-20 p-10 max-w-lg">
               <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md">
                <Sliders className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-4 flex items-center gap-3">
                Pro Photo Studio
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm bg-white/20 px-3 py-1 rounded-full">Open Editor</span>
              </h3>
              <p className="text-lg text-white/70">
                A full-featured editor built right in. Adjust colors, remove objects, crop, and apply filters without leaving the app.
              </p>
            </div>
           </motion.div>

           {/* Small Card 3 */}
           <FeatureCard 
            title="Mobile Ready"
            description="Create on the go. Flik is fully optimized for touch devices and smaller screens."
            icon={Smartphone}
            delay={0.4}
          />

        </div>
      </div>
    </section>
  );
}