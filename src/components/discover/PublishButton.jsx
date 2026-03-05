import React, { useState } from "react";
import { Globe, EyeOff, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PublishButton({ creation, onToggled, className = "" }) {
  const [isLoading, setIsLoading] = useState(false);
  const isPublished = creation?.published_to_discover;

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!creation?.id) return;
    setIsLoading(true);
    try {
      await base44.entities.Creation.update(creation.id, {
        published_to_discover: !isPublished
      });
      toast.success(isPublished ? "Removed from Discover" : "Published to Discover!");
      if (onToggled) onToggled(!isPublished);
    } catch (err) {
      toast.error("Failed to update");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      title={isPublished ? "Remove from Discover" : "Publish to Discover"}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isPublished
          ? "bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FF6B35]/30"
          : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isPublished ? (
        <EyeOff className="w-3.5 h-3.5" />
      ) : (
        <Globe className="w-3.5 h-3.5" />
      )}
      <span>{isPublished ? "Published" : "Publish"}</span>
    </button>
  );
}