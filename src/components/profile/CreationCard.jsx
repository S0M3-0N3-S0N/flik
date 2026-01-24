import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Edit, Eye, EyeOff, ImageOff, Play, Sparkles, Trash2 } from "lucide-react";
import { highlightTextSafe } from "./sanitizeHTML";

export default function CreationCard({
  item,
  index,
  searchQuery,
  isSelected,
  imageErrors,
  selectedItems,
  onToggleSelect,
  onSelectItem,
  onEdit,
  onPublish,
  onDownload,
  onDelete,
  onKeyDown,
  togglePublishMutation,
  updateMutation,
  navigate,
  createPageUrl,
}) {
  return (
    <motion.div
      layoutId={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.02 }}
      className={`group relative aspect-[3/4] rounded-3xl overflow-hidden bg-gradient-to-br from-[#141414] to-[#0a0a0a] border transition-all duration-500 hover:shadow-2xl cursor-pointer ${
        isSelected
          ? "border-[#FF6B35] ring-2 ring-[#FF6B35]/40 shadow-[#FF6B35]/30 shadow-lg scale-[0.97]"
          : "border-white/5 hover:border-[#FF6B35]/40 hover:shadow-[#FF6B35]/10"
      }`}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onToggleSelect(item.id);
        } else {
          onSelectItem(item);
        }
      }}
      onKeyDown={(e) => onKeyDown(e, item)}
      tabIndex={0}
      role="button"
      aria-label={`View ${item.title || "creation"}`}
      aria-selected={isSelected}
    >
      <div className="absolute inset-0 p-1">
        <div className="w-full h-full rounded-[20px] overflow-hidden">
          {item.thumbnail_url || item.url ? (
            <>
              {!imageErrors[item.id] ? (
                <img
                  src={item.thumbnail_url || item.url}
                  alt={`${item.title || "Untitled creation"} - ${
                    item.type === "video" ? "Video" : "Image"
                  } created on ${new Date(item.created_date).toLocaleDateString()}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-75"
                  onError={() =>
                    imageErrors({ ...imageErrors, [item.id]: true })
                  }
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
                  <ImageOff className="w-16 h-16 text-white/20" />
                </div>
              )}
              {item.type === "video" && !imageErrors[item.id] && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                    <Play className="w-8 h-8 text-white ml-1" fill="white" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
              <ImageOff className="w-16 h-16 text-white/10" />
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-between p-5">
        {/* Top Actions */}
        <div className="flex justify-end gap-2 translate-y-[-15px] group-hover:translate-y-0 transition-all duration-500 delay-75">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
            className={`h-10 w-10 rounded-2xl flex items-center justify-center backdrop-blur-2xl border-2 transition-all duration-300 ${
              isSelected
                ? "bg-[#FF6B35] border-[#FF6B35] text-white scale-110 rotate-12"
                : "bg-black/50 border-white/30 text-white hover:bg-[#FF6B35]/20 hover:border-[#FF6B35]/50 hover:scale-110"
            }`}
            aria-label={isSelected ? "Deselect" : "Select"}
          >
            {isSelected ? <Check className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-white/50" />}
          </button>
        </div>

        {/* Bottom Info */}
        <div className="translate-y-[25px] group-hover:translate-y-0 transition-all duration-500 delay-100 space-y-2.5 sm:space-y-3">
          <div>
            <h3
              className="font-bold text-white text-sm sm:text-base lg:text-lg line-clamp-2 mb-1 drop-shadow-lg"
              dangerouslySetInnerHTML={{
                __html: highlightTextSafe(item.title || "Untitled", searchQuery),
              }}
            />
            {item.prompt && (
              <p
                className="text-xs text-white/60 line-clamp-1"
                dangerouslySetInnerHTML={{
                  __html: highlightTextSafe(item.prompt, searchQuery),
                }}
              />
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPublish(item.id, !item.published_to_discover);
              }}
              disabled={togglePublishMutation.isPending}
              className={`border-0 h-8 sm:h-9 text-[10px] sm:text-xs backdrop-blur-2xl font-medium px-1 sm:px-2 ${
                item.published_to_discover
                  ? "bg-green-500/30 hover:bg-green-500/40"
                  : "bg-white/20 hover:bg-white/30"
              } text-white disabled:opacity-50`}
              title={
                item.published_to_discover
                  ? "Unpublish from Discover"
                  : "Publish to Discover"
              }
            >
              {item.published_to_discover ? (
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
              <span className="hidden sm:inline ml-1">Public</span>
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="bg-white/20 hover:bg-white/30 text-white border-0 h-8 sm:h-9 text-[10px] sm:text-xs backdrop-blur-2xl font-medium px-1 sm:px-2"
              title="Edit in Photo Studio"
            >
              <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline ml-1">Edit</span>
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(createPageUrl("Generate") + "?prompt=" + encodeURIComponent(item.prompt || ""));
              }}
              className="bg-[#FF6B35]/20 hover:bg-[#FF6B35]/30 text-white border-0 h-8 sm:h-9 text-[10px] sm:text-xs backdrop-blur-2xl font-medium px-1 sm:px-2"
              title="Imagine similar image"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline ml-1">Imagine</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}