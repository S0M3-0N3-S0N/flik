import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Share2, Copy, Check, ChevronLeft, ChevronRight, User, RefreshCw, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DiscoverModal({ creation, creations, onClose, currentUser }) {
  const [currentIndex, setCurrentIndex] = useState(
    creations?.findIndex(c => c.id === creation?.id) ?? 0
  );
  const [likes, setLikes] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const navigate = useNavigate();

  const current = creations?.[currentIndex] || creation;

  useEffect(() => {
    if (!current?.id) return;
    base44.entities.Like.filter({ creation_id: current.id }).then(data => {
      setLikes(data || []);
      setIsLiked((data || []).some(l => l.user_email === currentUser?.email));
    });
    setPromptExpanded(false);
  }, [current?.id, currentUser?.email]);

  useEffect(() => {
    if (!current?.created_by) return;
    // Fetch both UserProfile (for display name/bio) and User (for profile picture)
    Promise.all([
      base44.entities.UserProfile.filter({ email: current.created_by }),
      base44.entities.User.filter({ email: current.created_by })
    ]).then(([profiles, users]) => {
      const profile = profiles?.[0] || null;
      const user = users?.[0] || null;
      setCreatorProfile({
        ...(user || {}),
        ...(profile || {}),
        // UserProfile fields take priority, but use User's profile_picture if UserProfile doesn't have one
        profile_picture: profile?.profile_picture || user?.profile_picture || null,
        // full_name from UserProfile if set, otherwise from User
        display_name: profile?.full_name || user?.full_name || current.created_by?.split("@")[0],
      });
    });
  }, [current?.created_by]);

  const handleLike = async () => {
    if (!currentUser || isLiking) return;
    setIsLiking(true);
    try {
      if (isLiked) {
        const myLike = likes.find(l => l.user_email === currentUser.email);
        if (myLike) await base44.entities.Like.delete(myLike.id);
        setLikes(prev => prev.filter(l => l.user_email !== currentUser.email));
        setIsLiked(false);
      } else {
        await base44.entities.Like.create({ creation_id: current.id, user_email: currentUser.email });
        setLikes(prev => [...prev, { user_email: currentUser.email }]);
        setIsLiked(true);
      }
    } catch (err) {
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?discover=${current.id}`;
    let copied = false;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        copied = true;
      } catch {}
    }
    if (!copied) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        // fallback
        const el = document.createElement("textarea");
        el.value = url;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        try { document.execCommand("copy"); copied = true; } catch {}
        document.body.removeChild(el);
      }
    }
    if (copied) {
      base44.entities.Share.create({ creation_id: current.id, user_email: currentUser?.email, platform: "link_copy" });
      toast.success("Link copied!");
    } else {
      toast.error("Could not copy link");
    }
  };

  const handleCopyPrompt = async () => {
    if (!current?.prompt) return;
    try {
      await navigator.clipboard.writeText(current.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Prompt copied!");
    } catch {
      toast.error("Could not copy prompt");
    }
  };

  const handleRecreate = () => {
    if (!current?.prompt) return;
    onClose();
    navigate(createPageUrl("Generate") + `?prompt=${encodeURIComponent(current.prompt)}`);
  };

  const navigateCreation = (dir) => {
    setCurrentIndex(prev => {
      const next = prev + dir;
      if (next < 0 || next >= creations.length) return prev;
      return next;
    });
  };

  // Swipe handling
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      navigateCreation(dx < 0 ? 1 : -1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") navigateCreation(1);
      if (e.key === "ArrowLeft") navigateCreation(-1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [creations?.length]);

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex flex-col md:items-center md:justify-center md:p-4"
        onClick={onClose}
      >
        {/* ── DESKTOP LAYOUT ── */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="hidden md:flex relative w-full max-w-4xl bg-[#141414] border border-white/10 rounded-2xl overflow-hidden max-h-[92vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Image */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[92vh] relative">
            <img
              src={current.url}
              alt={current.title || "Creation"}
              className="max-w-full max-h-[92vh] object-contain"
            />
            {currentIndex > 0 && (
              <button onClick={() => navigateCreation(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentIndex < (creations?.length ?? 1) - 1 && (
              <button onClick={() => navigateCreation(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Side Panel */}
          <div className="w-80 flex flex-col border-l border-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                  {creatorProfile?.profile_picture ? (
                    <img src={creatorProfile.profile_picture} alt="Creator" className="w-full h-full object-cover" />
                  ) : (
                    current.created_by?.[0]?.toUpperCase() || <User className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{creatorProfile?.display_name || current.created_by?.split("@")[0] || "Creator"}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {current.prompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">⌘ Prompt</p>
                    <button onClick={handleCopyPrompt} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-all">
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-sm text-white/70 leading-relaxed">{current.prompt}</p>
                  </div>
                </div>
              )}
              {current.metadata?.model && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">ⓘ Information</p>
                  <div className="space-y-2 p-3 rounded-xl bg-white/5 border border-white/5">
                    {current.metadata?.model && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Model</span>
                        <span className="text-white font-medium">{current.metadata.model}</span>
                      </div>
                    )}
                    {current.metadata?.style?.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Style</span>
                        <span className="text-white font-medium">{current.metadata.style.join(", ")}</span>
                      </div>
                    )}
                    {current.metadata?.aspectRatio && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Ratio</span>
                        <span className="text-white font-medium">{current.metadata.aspectRatio}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                    isLiked ? "bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? "fill-[#FF6B35]" : ""}`} />
                  <span>{likes.length}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10 transition-all flex-1 justify-center"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
              <button
                onClick={handleRecreate}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #FF6B35 0%, #F72C25 50%, #FFB800 100%)" }}
              >
                <RefreshCw className="w-4 h-4" />
                Recreate
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── MOBILE LAYOUT ── */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="md:hidden flex flex-col w-full h-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Image area - top ~55% */}
          <div className="relative flex-shrink-0" style={{ height: '55vh' }}>
            <img
              src={current.url}
              alt={current.title || "Creation"}
              className="w-full h-full object-cover"
            />
            {/* Gradient fade at bottom */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

            {/* Top actions */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium border border-white/20"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full backdrop-blur-sm text-sm font-medium border transition-all ${
                    isLiked
                      ? "bg-[#FF6B35]/30 text-[#FF6B35] border-[#FF6B35]/50"
                      : "bg-black/60 text-white border-white/20"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? "fill-[#FF6B35]" : ""}`} />
                  <span>{likes.length}</span>
                </button>
              </div>
            </div>

            {/* Prev/Next arrows */}
            {currentIndex > 0 && (
              <button onClick={() => navigateCreation(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentIndex < (creations?.length ?? 1) - 1 && (
              <button onClick={() => navigateCreation(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white">
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom sheet */}
          <div className="flex-1 bg-[#111111] rounded-t-3xl -mt-4 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(45vh + 16px)' }}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Author row */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                  {creatorProfile?.profile_picture ? (
                    <img src={creatorProfile.profile_picture} alt="Creator" className="w-full h-full object-cover" />
                  ) : (
                    current.created_by?.[0]?.toUpperCase() || <User className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{creatorProfile?.display_name || current.created_by?.split("@")[0] || "Creator"}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Prompt */}
              {current.prompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="text-[#FF6B35]">⌘</span> Prompt
                    </p>
                    <button
                      onClick={handleCopyPrompt}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all border border-white/10"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <p className={`text-sm text-white/70 leading-relaxed ${!promptExpanded ? "line-clamp-3" : ""}`}>
                      {current.prompt}
                    </p>
                    {current.prompt.length > 120 && (
                      <button
                        onClick={() => setPromptExpanded(!promptExpanded)}
                        className="flex items-center gap-1 mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                      >
                        {promptExpanded ? "Show less" : "See all"}
                        <ChevronDown className={`w-3 h-3 transition-transform ${promptExpanded ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Info */}
              {(current.metadata?.model || current.metadata?.style?.length > 0 || current.metadata?.aspectRatio) && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="text-[#FF6B35]">ⓘ</span> Information
                  </p>
                  <div className="rounded-2xl bg-white/5 border border-white/5 divide-y divide-white/5">
                    {current.metadata?.model && (
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-sm text-white/50">Model</span>
                        <span className="text-sm text-white font-semibold">{current.metadata.model}</span>
                      </div>
                    )}
                    {current.metadata?.style?.length > 0 && (
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-sm text-white/50">Style</span>
                        <span className="text-sm text-white font-semibold">{current.metadata.style.join(", ")}</span>
                      </div>
                    )}
                    {current.metadata?.aspectRatio && (
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-sm text-white/50">Ratio</span>
                        <span className="text-sm text-white font-semibold">{current.metadata.aspectRatio}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Spacer for recreate button */}
              <div className="h-16" />
            </div>

            {/* Recreate button - sticky at bottom */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-[#111111] via-[#111111] to-transparent">
              <button
                onClick={handleRecreate}
                className="w-full py-4 rounded-2xl font-bold text-base text-black flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #FF6B35 0%, #F72C25 50%, #FFB800 100%)" }}
              >
                <RefreshCw className="w-5 h-5" />
                Recreate
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}