import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Image, Wand2, Sparkles, Camera, Globe, User, Layers, Paintbrush, Filter, Crop, RotateCw, Zap } from "lucide-react";

const slides = [
  {
    id: "welcome",
    emoji: null,
    icon: <Sparkles className="w-10 h-10 text-white" />,
    gradient: "from-[#FF6B35] via-[#F72C25] to-[#FFB800]",
    title: "Welcome to FLIK",
    subtitle: "Your AI-Powered Creative Studio",
    description: "FLIK is an all-in-one creative platform where you can edit photos with AI, generate stunning images from text, capture moments on camera, and discover a community of creators.",
    tips: ["🎨 Edit photos with powerful AI tools", "✨ Generate images from your imagination", "📸 Capture and share your creative work"],
  },
  {
    id: "editor",
    icon: <Image className="w-10 h-10 text-white" />,
    gradient: "from-[#FF6B35] to-[#F72C25]",
    title: "Photo Studio",
    subtitle: "Professional editing at your fingertips",
    description: "Upload any photo and transform it with a suite of powerful tools. Every change is non-destructive and can be undone.",
    tips: [
      "🤖 AI Tools — Apply one-click AI enhancements",
      "🎛️ Adjustments — Fine-tune brightness, contrast, saturation and more",
      "🎨 Filters — Instantly apply cinematic looks",
      "✂️ Crop & Transform — Rotate, flip, and resize",
      "✨ Magic Brush — Paint a mask and describe what to change",
      "🖌️ Paint — Draw directly on your image",
    ],
  },
  {
    id: "magic-brush",
    icon: <Wand2 className="w-10 h-10 text-white" />,
    gradient: "from-[#F72C25] to-[#FF6B35]",
    title: "Magic Brush",
    subtitle: "AI-powered inpainting tool",
    description: "The most powerful tool in Photo Studio. Paint over any area of your image, write a description of what you want there, and let AI do the magic.",
    tips: [
      "1️⃣ Switch to the Magic Brush tab (wand icon)",
      "2️⃣ Paint over the area you want to change",
      "3️⃣ Type what you want in the instructions box",
      "4️⃣ Optionally add reference images for style",
      "5️⃣ Tap Generate Changes and review the result",
    ],
  },
  {
    id: "generate",
    icon: <Wand2 className="w-10 h-10 text-white" />,
    gradient: "from-[#FFB800] to-[#FF6B35]",
    title: "Imagine AI",
    subtitle: "Turn words into stunning images",
    description: "Describe anything you can imagine and FLIK's AI will bring it to life. Choose from different styles, ratios, and send results straight to the Photo Studio to keep editing.",
    tips: [
      "💡 Be descriptive — more detail = better results",
      "🎭 Choose a style to set the visual mood",
      "📐 Pick the right aspect ratio for your use case",
      "📂 Send any result directly to Photo Studio",
    ],
  },
  {
    id: "flik-chat",
    icon: <Sparkles className="w-10 h-10 text-white" />,
    gradient: "from-[#FF6B35] via-[#FFB800] to-[#F72C25]",
    title: "FLIK AI Chat",
    subtitle: "Your creative AI assistant",
    description: "FLIK is always here to help. Ask it to apply edits to your current photo, get creative suggestions, or just have a conversation about your project.",
    tips: [
      "💬 Press the FLIK button (bottom bar on mobile, floating on desktop)",
      "⌨️ Use Ctrl+K (or Cmd+K) to open FLIK anywhere",
      "🎨 Ask FLIK to change a color, apply a filter, or adjust brightness",
      "💡 Ask for creative ideas or prompt suggestions",
    ],
  },
  {
    id: "discover",
    icon: <Globe className="w-10 h-10 text-white" />,
    gradient: "from-[#F72C25] to-[#FFB800]",
    title: "Discover",
    subtitle: "A feed of community creations",
    description: "Explore images created by other FLIK users, like and comment on your favorites, and publish your own creations for the world to see.",
    tips: [
      "❤️ Like creations to show appreciation",
      "💬 Leave comments on posts you love",
      "📤 Publish your creations from your Profile",
      "🔁 Send any discovered image to the Photo Studio to remix it",
    ],
  },
  {
    id: "profile",
    icon: <User className="w-10 h-10 text-white" />,
    gradient: "from-[#FF6B35] to-[#FFB800]",
    title: "Your Profile",
    subtitle: "Your creative portfolio",
    description: "All of your saved creations live here. Manage your gallery, edit your profile, control privacy settings, and publish your best work to Discover.",
    tips: [
      "🖼️ All saved images appear in your gallery",
      "📤 Tap any creation to publish it to Discover",
      "✉️ DM other creators directly",
      "⚙️ Control privacy & notification settings",
    ],
  },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function FlikWelcomeSlideshow({ open, onClose }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = (next) => {
    setDirection(next > current ? 1 : -1);
    setCurrent(next);
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] p-0 bg-[#0a0a0a] border border-white/10 overflow-hidden rounded-2xl gap-0 [&>button]:hidden">
        {/* Gradient Header */}
        <div className={`relative bg-gradient-to-br ${slide.gradient} p-8 flex flex-col items-center justify-center text-center min-h-[180px] transition-all duration-500`}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <motion.div
            key={slide.id + "-icon"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-xl"
          >
            {slide.icon}
          </motion.div>

          <motion.h2
            key={slide.id + "-title"}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-white"
          >
            {slide.title}
          </motion.h2>
          <motion.p
            key={slide.id + "-sub"}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-white/80 text-sm mt-1"
          >
            {slide.subtitle}
          </motion.p>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 min-h-[280px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col gap-4"
            >
              <p className="text-white/70 text-sm leading-relaxed">{slide.description}</p>

              <div className="space-y-2">
                {slide.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/5 text-sm text-white/80 leading-snug">
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 h-2 bg-[#FF6B35]"
                    : "w-2 h-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {current > 0 && (
              <Button
                variant="ghost"
                onClick={() => go(current - 1)}
                className="flex-1 text-white/60 hover:text-white hover:bg-white/5 border border-white/10 h-11"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {isLast ? (
              <Button
                onClick={onClose}
                className="flex-1 btn-gradient text-white h-11 font-semibold shadow-lg shadow-[#FF6B35]/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Let's Create!
              </Button>
            ) : (
              <Button
                onClick={() => go(current + 1)}
                className="flex-1 btn-gradient text-white h-11 font-semibold shadow-lg shadow-[#FF6B35]/20"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Skip */}
          {!isLast && (
            <button
              onClick={onClose}
              className="text-center text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Skip tour
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}