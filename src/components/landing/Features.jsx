import React from "react";
import { motion } from "framer-motion";
import { Wand2, Image, Sparkles, Layers, Sliders, Palette } from "lucide-react";

const features = [
  {
    id: 1,
    title: "Imagine AI",
    headline: "Dream It. Generate It.",
    description: "Transform text into incredible visuals with our intuitive AI. Endless styles, endless possibilities.",
    icon: Wand2,
    color: "from-purple-500 to-indigo-500",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "Photo Studio",
    headline: "Precision Editing.",
    description: "Refine every detail, remove imperfections, and apply advanced adjustments with powerful editing tools.",
    icon: Image,
    color: "from-blue-500 to-cyan-500",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "Creative Control",
    headline: "Your Vision. Your Style.",
    description: "Access a vast library of artistic styles, fine-tune parameters, and bring unique artistic visions to life.",
    icon: Palette,
    color: "from-pink-500 to-rose-500",
    image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop"
  },
  {
    id: 4,
    title: "Personal Gallery",
    headline: "Your Masterpieces.",
    description: "Organize your creations, revisit old projects, and find inspiration within your personalized gallery.",
    icon: Layers,
    color: "from-amber-500 to-orange-500",
    image: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2832&auto=format&fit=crop"
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold mb-6"
          >
            Everything you need to <br />
            <span className="gradient-text">create perfection.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg max-w-2xl mx-auto"
          >
            A complete suite of AI-powered tools designed for creators, designers, and dreamers.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-3xl bg-[#141414] border border-white/10 hover:border-white/20 transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500"
                   style={{ background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }} />
              
              <div className="relative p-8 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                </div>

                <div className="mb-8">
                  <h4 className="text-2xl font-bold text-white mb-3">{feature.headline}</h4>
                  <p className="text-white/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-auto relative rounded-xl overflow-hidden aspect-[16/9] group-hover:scale-[1.02] transition-transform duration-700">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent z-10" />
                  <img 
                    src={feature.image} 
                    alt={feature.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}