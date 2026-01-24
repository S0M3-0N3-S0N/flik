import React, { useState } from "react";
import { Share2, Twitter, Download, Link as LinkIcon, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function SharePanel({ isOpen, onClose, currentImage, creationId }) {
  const [shareMode, setShareMode] = useState("image");
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

  const getCanvasImage = () => {
    const canvas = document.querySelector("canvas[style*='filter: none']");
    return canvas || document.querySelector("canvas");
  };

  const shareToTwitter = async (imageUrl = null) => {
    const text = "Check out what I created with FLIK - AI Creative Suite! 🎨✨";
    let twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    if (imageUrl) {
      twitterUrl += `&url=${encodeURIComponent(imageUrl)}`;
    }
    
    window.open(twitterUrl, "_blank", "width=550,height=420");
    toast.success("Opening Twitter...");
  };

  const shareToTikTok = async () => {
    const canvas = getCanvasImage();
    if (!canvas) {
      toast.error("No image to share");
      return;
    }

    canvas.toBlob(async (blob) => {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "flik-creation-tiktok.mp4";
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success("Image downloaded! Open TikTok and upload it as a new post.");
      } catch (err) {
        toast.error("Failed to download image");
      }
    });
  };

  const shareToInstagram = async () => {
    const canvas = getCanvasImage();
    if (!canvas) {
      toast.error("No image to share");
      return;
    }

    canvas.toBlob(async (blob) => {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "flik-creation-instagram.png";
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success("Image downloaded! Open Instagram and share it from your camera roll.");
      } catch (err) {
        toast.error("Failed to download image");
      }
    });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (!selectedPlatforms.twitter && !selectedPlatforms.tiktok && !selectedPlatforms.instagram) {
      toast.error("Select at least one platform");
      return;
    }

    setIsSharing(true);
    try {
      if (shareMode === "link") {
        const shareUrl = `${window.location.origin}/creation/${creationId}`;
        
        if (selectedPlatforms.twitter) {
          await shareToTwitter(shareUrl);
        }
        if (selectedPlatforms.tiktok) {
          await copyToClipboard(shareUrl);
          toast.info("Link copied! Paste it in your TikTok bio or comments.");
        }
        if (selectedPlatforms.instagram) {
          await copyToClipboard(shareUrl);
          toast.info("Link copied! Paste it in your Instagram bio or comments.");
        }
      } else {
        // Share images
        if (selectedPlatforms.twitter) {
          const canvas = getCanvasImage();
          if (canvas) {
            canvas.toBlob(async (blob) => {
              const uploadResult = await base44.integrations.Core.UploadFile({ file: new File([blob], "flik.png", { type: "image/png" }) });
              await shareToTwitter(uploadResult.file_url);
            });
          }
        }
        
        if (selectedPlatforms.tiktok) {
          await shareToTikTok();
        }
        
        if (selectedPlatforms.instagram) {
          await shareToInstagram();
        }
      }
      
      onClose();
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to share. Try again.");
    } finally {
      setIsSharing(false);
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
          { id: "twitter", label: "Twitter/X", icon: Twitter },
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
                <Check className="w-3 h-3" />
              )}
            </div>
            <span className="text-sm flex-1 text-left">
              {typeof platform.icon === "string" ? platform.icon + " " : ""}{platform.label}
            </span>
          </button>
        ))}
      </div>

      {/* Share Button */}
      <Button
        onClick={handleShare}
        disabled={isSharing}
        className="w-full h-10 bg-gradient-to-r from-[#FF6B35] to-[#FFB800] hover:opacity-90 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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