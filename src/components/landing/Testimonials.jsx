import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    name: "Alex Chen",
    role: "Digital Artist",
    content: "Flik has completely transformed my workflow. The AI generation is miles ahead of anything else I've used.",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
  },
  {
    name: "Sarah Miller",
    role: "Creative Director",
    content: "The ability to mix styles and fine-tune outputs gave us the control we needed for our latest campaign.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
  },
  {
    name: "Marcus Johnson",
    role: "Indie Game Dev",
    content: "I generated all the assets for my game prototype in a weekend. Incredible speed and quality.",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop"
  },
  {
    name: "Elena Rodriguez",
    role: "Photographer",
    content: "The Photo Studio features are a lifesaver. Object removal and lighting fixes that used to take hours now take seconds.",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop"
  },
  {
    name: "David Kim",
    role: "UX Designer",
    content: "Finally, an AI tool that cares about UI/UX. The interface is just as beautiful as the images it creates.",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop"
  },
  {
    name: "Jessica Wu",
    role: "Marketing Lead",
    content: "We've cut our asset production costs by 80% while increasing variety. Flik is a game changer.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
  }
];

export default function Testimonials() {
  return (
    <section className="py-32 px-6 bg-[#0A0A0A] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Loved by <span className="gradient-text">Creators</span>
          </h2>
          <p className="text-xl text-white/50">
            Join thousands of artists, designers, and visionaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-[#141414] border border-white/5 hover:border-white/10 transition-colors relative group"
            >
              <div className="absolute top-8 right-8 text-white/5 group-hover:text-white/10 transition-colors">
                <Quote className="w-8 h-8" />
              </div>
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />
                ))}
              </div>

              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                "{review.content}"
              </p>

              <div className="flex items-center gap-4">
                <img 
                  src={review.avatar} 
                  alt={review.name} 
                  className="w-12 h-12 rounded-full border border-white/10"
                />
                <div>
                  <h4 className="font-bold text-white">{review.name}</h4>
                  <p className="text-sm text-white/40">{review.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}