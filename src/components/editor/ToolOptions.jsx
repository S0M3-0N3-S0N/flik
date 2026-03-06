import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Film, Sun, Droplets, Camera, Zap, Sparkles, Leaf, Circle, Paintbrush, Droplet, Star, PenLine, BookOpen, Flower2, Cpu, Wind, Moon, Flame, Waves, CloudSnow, Eye, Sunset, Palette, Contrast, Tv, Smile } from "lucide-react";

export const COLOR_GRADE_OPTIONS = [
  { id: "cinematic", label: "Cinematic", icon: Film, prompt: "Apply a cinematic color grade: deep shadows, rich contrast, teal and orange tones, film-like quality" },
  { id: "golden_hour", label: "Golden Hour", icon: Sun, prompt: "Apply a golden hour color grade: warm golden yellows, soft orange highlights, glowing sun-kissed tones" },
  { id: "moody_blue", label: "Moody Blue", icon: Droplets, prompt: "Apply a moody blue color grade: cool blue tones, desaturated shadows, stormy atmospheric look" },
  { id: "vintage", label: "Vintage", icon: Camera, prompt: "Apply a vintage film color grade: faded colors, warm yellows, slight vignette, nostalgic film grain look" },
  { id: "neon_noir", label: "Neon Noir", icon: Zap, prompt: "Apply a neon noir color grade: dark moody shadows, vibrant neon pinks and purples, cyberpunk city night aesthetic" },
  { id: "pastel_dream", label: "Pastel Dream", icon: Sparkles, prompt: "Apply a pastel dream color grade: soft muted pastels, airy light tones, dreamy pink and lavender hues" },
  { id: "forest_green", label: "Forest Green", icon: Leaf, prompt: "Apply a forest green color grade: lush deep greens, earthy browns, natural organic tones" },
  { id: "black_white", label: "B&W Film", icon: Circle, prompt: "Apply a classic black and white film color grade: rich contrast, deep blacks, bright whites, dramatic noir style" },
  { id: "sunset_glow", label: "Sunset Glow", icon: Flame, prompt: "Apply a sunset glow color grade: fiery reds, burnt oranges, deep purples on the horizon, warm dramatic sky tones" },
  { id: "arctic_ice", label: "Arctic Ice", icon: CloudSnow, prompt: "Apply an arctic ice color grade: icy cool blues, crisp whites, glacial tones, clean and cold atmosphere" },
  { id: "faded_film", label: "Faded Film", icon: Camera, prompt: "Apply a faded film color grade: washed out muted tones, lifted blacks, soft grain, analog film aesthetic" },
  { id: "deep_space", label: "Deep Space", icon: Moon, prompt: "Apply a deep space color grade: dark navy blacks, purple midtones, starry cool highlights, cosmic atmosphere" },
  { id: "tropical", label: "Tropical", icon: Waves, prompt: "Apply a tropical color grade: vibrant teals and turquoises, lush greens, warm highlights, paradise vacation vibes" },
  { id: "desert_sand", label: "Desert Sand", icon: Sunset, prompt: "Apply a desert sand color grade: warm sandy yellows, dusty oranges, dry earthy tones, arid landscape feel" },
  { id: "matte_fade", label: "Matte Fade", icon: Contrast, prompt: "Apply a matte fade color grade: crushed blacks, flat contrast, desaturated mid-tones, modern editorial look" },
  { id: "candy_pop", label: "Candy Pop", icon: Palette, prompt: "Apply a candy pop color grade: hyper-saturated pinks, yellows and blues, playful vivid tones, fun and energetic" },
];

export const STYLE_OPTIONS = [
  { id: "oil_painting", label: "Oil Painting", icon: Paintbrush, prompt: "Transform this image into a detailed oil painting with visible brush strokes, rich textures, and painterly quality" },
  { id: "watercolor", label: "Watercolor", icon: Droplet, prompt: "Transform this image into a soft watercolor painting with flowing colors, transparent washes, and delicate edges" },
  { id: "anime", label: "Anime", icon: Star, prompt: "Transform this image into anime art style with bold outlines, vibrant colors, and Japanese animation aesthetic" },
  { id: "pencil_sketch", label: "Pencil Sketch", icon: PenLine, prompt: "Transform this image into a detailed pencil sketch with fine lines, shading, and hand-drawn texture" },
  { id: "comic_book", label: "Comic Book", icon: BookOpen, prompt: "Transform this image into a bold comic book art style with strong outlines, flat colors, and graphic novel aesthetic" },
  { id: "impressionist", label: "Impressionist", icon: Flower2, prompt: "Transform this image in the style of impressionist painters like Monet: loose brush strokes, light and color emphasis" },
  { id: "cyberpunk", label: "Cyberpunk", icon: Cpu, prompt: "Transform this image into a cyberpunk digital art style with neon colors, futuristic tech elements, and dystopian aesthetic" },
  { id: "studio_ghibli", label: "Ghibli", icon: Wind, prompt: "Transform this image in the style of Studio Ghibli: soft warm colors, hand-painted look, magical whimsical atmosphere" },
  { id: "bratz", label: "Bratz Doll", icon: Sparkles, prompt: "Transform this image into Bratz doll art style: big eyes with heavy makeup, glossy lips, fashion-forward outfit, bold and stylized doll aesthetic" },
  { id: "barbie", label: "Barbie", icon: Star, prompt: "Transform this image into Barbie doll style: pink glamorous aesthetic, perfect proportions, bright colors, dreamy plastic-toy look" },
  { id: "south_park", label: "South Park", icon: Tv, prompt: "Transform this image into South Park cartoon style: simple flat cut-paper look, basic geometric shapes, crude animation style matching the show" },
  { id: "family_guy", label: "Family Guy", icon: Smile, prompt: "Transform this image into Family Guy cartoon style: thick black outlines, simple round faces, flat colors, Seth MacFarlane animation aesthetic" },

  { id: "rick_morty", label: "Rick & Morty", icon: Cpu, prompt: "Transform this image into Rick and Morty cartoon style: simple line art, limited color palette, squiggly outlines, sci-fi adult animated aesthetic" },
  { id: "disney", label: "Disney", icon: Flower2, prompt: "Transform this image into classic Disney animation style: expressive large eyes, smooth curves, vibrant colors, warm and magical feel" },
  { id: "pixar", label: "Pixar 3D", icon: Film, prompt: "Transform this image into Pixar 3D CGI style: glossy realistic textures, expressive characters, warm studio lighting, polished animated movie look" },
  { id: "manga", label: "Manga", icon: PenLine, prompt: "Transform this image into Japanese manga art style: black and white, dramatic shading, expressive eyes, ink hatching, classic manga panel aesthetic" },
  { id: "lego", label: "LEGO", icon: Circle, prompt: "Transform this image into LEGO style: blocky plastic figures, bright primary colors, stud details, toy-like construction aesthetic" },
  { id: "claymation", label: "Claymation", icon: Droplet, prompt: "Transform this image into claymation stop-motion style: clay texture, handmade imperfections, moldable characters like Wallace and Gromit" },
];

export default function ToolOptions({ tool, onSelect, onBack }) {
  const options = tool.id === "recolor" ? COLOR_GRADE_OPTIONS : STYLE_OPTIONS;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="py-4 px-4"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-[#FF6B35]"></span>
        {tool.label} Options
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => onSelect({ ...tool, prompt: option.prompt, label: `${tool.label}: ${option.label}` })}
            className="group relative p-3 rounded-2xl text-left transition-all duration-300 border bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-[#FF6B35]/30 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-[#FF6B35]/5"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FF6B35]/10 group-hover:bg-[#FF6B35]/20 text-[#FF6B35] transition-colors mb-1">
              <option.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-white group-hover:text-[#FF6B35] transition-colors truncate">
              {option.label}
            </p>
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-[#FF6B35]/20 pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}