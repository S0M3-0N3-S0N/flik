import React, { useState } from "react";
import { Share2, Twitter, Download, Link as LinkIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function SharePanel({ isOpen, onClose, currentImage, creationId }) {
  const [shareMode, setShareMode] = useState("image"); // "image" or "link"
  const [isSharing, setIsSharing] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    twitter: true,
    tiktok: false,
    instagram: false
  });

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const handleShare = async () => {
    if (!selectedPlatforms.twitter && !selectedPlatforms.tiktok && !selectedPlatforms.instagram) {
      toast.error("Select at least one platform");
      return;
    }

    setIsSharing(true);
    try {
      if (shareMode === "image") {
        // For image sharing, use native share API or download
        const canvas = document.querySelector("canvas");
        if (!canvas) {
          toast.error("No image to share");
          setIsSharing(false);
          return;
        }

        canvas.toBlob(async (blob) => {
          const file = new File([blob], "creation.png", { type: "image/png" });
          
          // Share via Web Share API if available
          if (navigator.share) {
            try {
              await navigator.share({
                title: "Check out my creation",
                text: "I made this with FLIK",
                files: [file]
              });
              toast.success("Shared successfully!");
            } catch (err) {
              if (err.name !== "AbortError") {
                downloadImage(blob);
              }
            }
          } else {
            // Fallback: download and show instructions
            downloadImage(blob);
            showPlatformLinks();
          }
          setIsSharing(false);
        });
      } else {
        // Share creation link
        const shareUrl = `${window.location.origin}/creation/${creationId}`;
        showPlatformLinks(shareUrl);
        setIsSharing(false);
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to share");
      setIsSharing(false);
    }
  };

  const downloadImage = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flik-creation.png";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Image downloaded! Now share it on your preferred platform.");
  };

  const showPlatformLinks = (shareUrl = null) => {
    const baseText = "Check out what I created with FLIK - AI Creative Suite";
    
    if (selectedPlatforms.twitter) {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(baseText)}${shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ""}`;
      window.open(twitterUrl, "_blank", "width=550,height=420");
    }
    
    if (selectedPlatforms.tiktok) {
      toast.info("TikTok doesn't support direct URL sharing. Please upload the image manually on TikTok.");
    }
    
    if (selectedPlatforms.instagram) {
      toast.info("Instagram doesn't support direct URL sharing. Please upload the image manually on Instagram.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-20 right-4 w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 space-y-4 z-40">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#FF6B35]" />
          Share Creation
        </h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Share Mode Toggle */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setShareMode("image")}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all ${
            shareMode === "image"
              ? "bg-[#FF6B35] text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Download className="w-3.5 h-3.5 inline mr-1" />
          Image
        </button>
        <button
          onClick={() => setShareMode("link")}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all ${
            shareMode === "link"
              ? "bg-[#FF6B35] text-white"
              : "text-white/60 hover:text-white"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
          Link
        </button>
      </div>

      {/* Platform Selection */}
      <div className="space-y-2">
        <p className="text-xs text-white/60 font-medium">Select platforms:</p>
        
        {[
          { id: "twitter", label: "Twitter", icon: Twitter },
          { id: "tiktok", label: "TikTok", icon: "🎵" },
          { id: "instagram", label: "Instagram", icon: "📸" }
        ].map(platform => (
          <button
            key={platform.id}
            onClick={() => togglePlatform(platform.id)}
            className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 ${
              selectedPlatforms[platform.id]
                ? "bg-white/10 border-[#FF6B35]/50 text-white"
                : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
            }`}
          >
            <div className="w-5 h-5 rounded border-2 border-current flex items-center justify-center">
              {selectedPlatforms[platform.id] && (
                <div className="w-2 h-2 bg-current rounded-full" />
              )}
            </div>
            <span className="text-sm flex-1 text-left">
              {typeof platform.icon === "string" ? platform.icon : <platform.icon className="w-4 h-4 inline" />}
              {" " + platform.label}
            </span>
          </button>
        ))}
      </div>

      {/* Share Button */}
      <Button
        onClick={handleShare}
        disabled={isSharing}
        className="w-full h-10 bg-gradient-to-r from-[#FF6B35] to-[#FFB800] hover:opacity-90 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
      >
        {isSharing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sharing...
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            Share Now
          </>
        )}
      </Button>
    </div>
  );
}