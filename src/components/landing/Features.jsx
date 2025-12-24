import React from "react";
import { motion } from "framer-motion";
import { Wand2, Image as ImageIcon, Layers, Zap, Share2, Download } from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI Generation",
    description: "Turn simple text prompts into stunning, high-resolution artwork using state-of-the-art AI models.",
    color: "text-[#FF6B35]"
  },
  {
    icon: ImageIcon,
    title: "Smart Editor",
    description: "Powerful photo editing tools with AI-enhanced capabilities like spot removal and auto-adjustment.",
    color: "text-[#F72C25]"
  },
  {
    icon: Layers,
    title: "Style Mixing",
    description: "Combine multiple artistic styles to create unique, blended aesthetics for your creations.",
    color: "text-[#FFB800]"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience near-instant generation and processing speeds optimized for your workflow.",
    color: "text-blue-400"
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share your creations directly to social media or with the community in one click.",
    color: "text-purple-400"
  },
  {
    icon: Download,
    title: "High Quality Export",
    description: "Download your masterpieces in high resolution, ready for print or digital display.",
    color: "text-green-400"
  }
];

export default function Features() {
  return (
    <section className="py-32 px-6 relative">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Everything you need to <span className="gradient-text">create</span>
          </h2>
          <p className="text-white/40 max-w-2xl mx-auto text-lg">
            A complete suite of AI-powered tools designed to help you visualize, edit, and share your creative vision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-8 rounded-3xl glass-card border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.02]"
            >
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-white/40 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}