import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Grid3x3, X, Loader2, Save, Sparkles, ChevronDown, ChevronUp, Trash2, Image as ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MoodboardAnalysis from "./MoodboardAnalysis";

export default function MoodboardPanel({ onApplyMoodboard, onGalleryOpen }) {
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [styleProfile, setStyleProfile] = useState(null);
  const [moodboardName, setMoodboardName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [activeMoodboard, setActiveMoodboard] = useState(null);
  const [styleStrength, setStyleStrength] = useState(70);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: savedMoodboards = [], isLoading: isLoadingMoodboards } = useQuery({
    queryKey: ['moodboards', user?.email],
    queryFn: () => base44.entities.Moodboard.filter({ created_by: user.email }, '-created_date', 20),
    enabled: !!user?.email && showSaved,
    staleTime: 30000,
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsUploading(true);
    setStyleProfile(null);
    setActiveMoodboard(null);

    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const result = await base44.integrations.Core.UploadFile({ file });
        return { url: result.file_url, id: Date.now() + Math.random() };
      }));
      setImages(prev => [...prev, ...uploaded].slice(0, 30));
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryAdd = () => {
    if (onGalleryOpen) {
      onGalleryOpen((selections) => {
        const mapped = (Array.isArray(selections) ? selections : [selections])
          .filter(Boolean)
          .map(s => ({ url: s.url || s.thumbnail_url, id: Date.now() + Math.random() }));
        setImages(prev => [...prev, ...mapped].slice(0, 30));
        setStyleProfile(null);
        setActiveMoodboard(null);
      });
    }
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setIsAnalyzing(true);
    setStyleProfile(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional creative director and visual aesthetics expert. Analyze this collection of ${images.length} reference images together as a unified moodboard.

Your goal is to extract the shared visual aesthetic, style DNA, and creative direction from all images as a whole.

Provide a thorough analysis with:
1. color_palette: Array of 4-6 dominant colors (each with "name" (descriptive name like "dusty rose") and "hex" (hex code estimate))
2. lighting: A single descriptive string about the lighting style (e.g., "soft diffused golden-hour light with warm shadows")
3. textures: Array of 3-5 texture/surface descriptors (e.g., "rough linen", "matte skin", "grainy film")
4. mood: Array of 3-5 mood/feeling words (e.g., "melancholic", "romantic", "editorial")
5. keywords: Array of 8-12 specific style keywords for AI generation (e.g., "film grain", "muted tones", "editorial fashion")
6. style_summary: 1-2 sentences describing the overall aesthetic and creative direction
7. prompt_enhancement: A concise string of comma-separated style descriptors to append to any image generation prompt to match this aesthetic (this is the most important field)

Be specific, opinionated, and precise. This is used by creators to maintain visual consistency.`,
        file_urls: images.map(i => i.url),
        response_json_schema: {
          type: "object",
          properties: {
            color_palette: { type: "array", items: { type: "object", properties: { name: { type: "string" }, hex: { type: "string" } } } },
            lighting: { type: "string" },
            textures: { type: "array", items: { type: "string" } },
            mood: { type: "array", items: { type: "string" } },
            keywords: { type: "array", items: { type: "string" } },
            style_summary: { type: "string" },
            prompt_enhancement: { type: "string" }
          },
          required: ["color_palette", "lighting", "textures", "mood", "keywords", "style_summary", "prompt_enhancement"]
        }
      });
      setStyleProfile(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!styleProfile || images.length === 0) return;
    setIsSaving(true);
    try {
      const name = moodboardName.trim() || `Moodboard ${new Date().toLocaleDateString()}`;
      const saved = await base44.entities.Moodboard.create({
        name,
        image_urls: images.map(i => i.url),
        style_profile: styleProfile
      });
      setSavedSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['moodboards'] });
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = () => {
    if (!styleProfile) return;
    const strength = styleStrength / 100;
    onApplyMoodboard({ styleProfile, strength });
  };

  const loadSavedMoodboard = (mb) => {
    setImages((mb.image_urls || []).map((url, i) => ({ url, id: i })));
    setStyleProfile(mb.style_profile || null);
    setMoodboardName(mb.name || "");
    setActiveMoodboard(mb.id);
    setShowSaved(false);
  };

  const deleteSavedMoodboard = async (e, id) => {
    e.stopPropagation();
    await base44.entities.Moodboard.delete(id);
    queryClient.invalidateQueries({ queryKey: ['moodboards'] });
    if (activeMoodboard === id) setActiveMoodboard(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/50">
        Build a visual style moodboard from reference images. The AI analyzes your collection and extracts a style fingerprint that automatically enhances your generation prompts.
      </p>

      {/* Saved Moodboards Toggle */}
      <button
        onClick={() => setShowSaved(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-xs font-medium"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
          <span>My Saved Moodboards</span>
        </div>
        {showSaved ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {isLoadingMoodboards ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-[#FF6B35]" />
              </div>
            ) : savedMoodboards.length === 0 ? (
              <div className="text-center py-6 text-white/30 text-xs">No saved moodboards yet</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {savedMoodboards.map(mb => (
                  <button
                    key={mb.id}
                    onClick={() => loadSavedMoodboard(mb)}
                    className={`relative group text-left p-3 rounded-xl border transition-all ${
                      activeMoodboard === mb.id
                        ? 'bg-[#FF6B35]/10 border-[#FF6B35]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex gap-1.5 mb-2">
                      {(mb.image_urls || []).slice(0, 3).map((url, i) => (
                        <div key={i} className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                          <img src={url} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-medium text-white/80 truncate">{mb.name}</p>
                    <button
                      onClick={(e) => deleteSavedMoodboard(e, mb.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-black/60 text-red-400 hover:text-red-300 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Controls */}
      <div className="flex gap-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="flex-1 text-white border-white/20 hover:bg-white/10 bg-white/5 h-9 text-xs"
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
          Upload Images
        </Button>
        <Button
          onClick={handleGalleryAdd}
          variant="outline"
          className="flex-1 text-white border-white/20 hover:bg-white/10 bg-white/5 h-9 text-xs"
        >
          <Grid3x3 className="w-3.5 h-3.5 mr-2" />
          From Gallery
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
      </div>

      {/* Image Preview Grid */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">{images.length} image{images.length !== 1 ? 's' : ''} • Pinterest-style board</span>
              <button onClick={() => { setImages([]); setStyleProfile(null); }} className="text-xs text-white/30 hover:text-red-400 transition-colors">Clear all</button>
            </div>

            {/* Masonry-like grid */}
            <div className="columns-3 gap-2 space-y-2">
              {images.map((img) => (
                <div key={img.id} className="relative group break-inside-avoid mb-2 rounded-xl overflow-hidden">
                  <img src={img.url} className="w-full object-cover rounded-xl" />
                  <button
                    onClick={() => { setImages(prev => prev.filter(i => i.id !== img.id)); setStyleProfile(null); }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Analyze Button */}
            {!styleProfile && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || images.length === 0}
                className="w-full btn-gradient text-white rounded-xl h-11"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing Style...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Analyze Moodboard</>
                )}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Style Profile */}
      <AnimatePresence>
        {styleProfile && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <MoodboardAnalysis profile={styleProfile} />

            {/* Style Strength Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Style Strength</span>
                <span className="text-xs text-[#FF6B35] font-bold">{styleStrength}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={styleStrength}
                onChange={(e) => setStyleStrength(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF6B35] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/25">
                <span>Subtle</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Save + Apply */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={moodboardName}
                  onChange={(e) => setMoodboardName(e.target.value)}
                  placeholder="Name this moodboard..."
                  className="bg-black/20 border-white/10 text-white text-xs h-9 flex-1"
                />
                <Button
                  onClick={handleSave}
                  disabled={isSaving || savedSuccess}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 h-9 px-3 text-xs flex-shrink-0"
                >
                  {savedSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <Button
                onClick={handleApply}
                className="w-full btn-gradient text-white rounded-xl h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Apply Style to Generations
              </Button>

              <button
                onClick={handleAnalyze}
                className="text-xs text-white/30 hover:text-white/60 text-center transition-colors"
              >
                Re-analyze
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {images.length === 0 && !styleProfile && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
            <ImageIcon className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-xs text-white/30">Upload 3–30 reference images to<br/>build your style fingerprint</p>
        </div>
      )}
    </div>
  );
}