import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../../utils";

export default function InteractiveDemo() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  return (
    <section className="py-20 px-6 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              From Sketch to <br />
              <span className="gradient-text">Masterpiece</span>
            </h2>
            <p className="text-xl text-white/50 mb-8 leading-relaxed">
              Our advanced ControlNet integration allows you to guide the AI with simple sketches. 
              Maintain perfect composition while generating photorealistic details.
            </p>
            
            <div className="space-y-6">
              {[
                { title: "Precise Control", desc: "Your composition, AI's rendering." },
                { title: "Instant Variations", desc: "Generate 100s of styles from one sketch." },
                { title: "Professional Quality", desc: "Up to 4k resolution output." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-1 bg-white/10 rounded-full mt-3 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white">{item.title}</h4>
                    <p className="text-white/40">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8">
              <Button 
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Generate"))}
                className="h-12 px-6 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/5 transition-all"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Try ControlNet
              </Button>
            </div>
          </div>

          <div 
            className="relative aspect-square rounded-3xl overflow-hidden cursor-ew-resize select-none border border-white/10 shadow-2xl shadow-[#FF6B35]/5"
            onMouseMove={(e) => isDragging && handleDrag(e)}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onClick={handleDrag}
          >
            {/* After Image (Background) */}
            <img 
              src="https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=2560&auto=format&fit=crop" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              alt="After"
            />

            {/* Before Image (Foreground with Clip) */}
            <div 
              className="absolute inset-0 w-full h-full bg-white pointer-events-none"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
               <img 
                src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2560&auto=format&fit=crop" 
                className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-150 brightness-110" // Simulating a sketch/rough input
                alt="Before"
              />
              <div className="absolute inset-0 bg-black/10 mix-blend-multiply" /> {/* Texture overlay */}
            </div>

            {/* Slider Handle */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-black">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-6 left-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-sm font-bold text-white pointer-events-none">
              Input
            </div>
            <div className="absolute top-6 right-6 px-4 py-2 bg-[#FF6B35]/80 backdrop-blur-md rounded-full text-sm font-bold text-white pointer-events-none">
              Output
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}