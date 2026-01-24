import React from "react";
import { Layers, Settings2, X, Sparkles, Wand2, Sun, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function BatchPanel({
  isOpen,
  onClose,
  batchImages,
  onUpload,
  onClearAll,
  onSyncEdits,
  onBatchProcess,
  isBatchProcessing,
  batchProgress,
  adjustments,
  selectedFilter,
  transform
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-20 right-4 w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 space-y-4 z-40 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#FF6B35]" />
          Batch ({batchImages.length})
        </h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <label className="block cursor-pointer group">
        <div className="relative overflow-hidden border border-dashed border-white/20 rounded-lg p-4 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5 transition-all">
          <div className="flex flex-col items-center gap-2 text-center relative z-10">
            <Layers className="w-5 h-5 text-[#FF6B35]" />
            <div>
              <p className="text-xs font-medium text-white">Import Images</p>
              <p className="text-[10px] text-white/40">Multiple files</p>
            </div>
          </div>
        </div>
        <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
      </label>

      {batchImages.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => {
              onSyncEdits();
              toast.success('Synced edits to all images!');
            }}
            className="w-full p-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium transition-all flex items-center gap-2"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Sync Edits
          </button>

          <div className="space-y-2">
            {[
              { label: "Auto Enhance", icon: Sparkles, prompt: "Enhance this image with better colors, improved clarity, professional quality" },
              { label: "Upscale 4x", icon: Wand2, prompt: "Upscale to higher resolution, enhance details" },
              { label: "Fix Lighting", icon: Sun, prompt: "Fix lighting and exposure, balance highlights and shadows" },
            ].map(tool => (
              <Button
                key={tool.label}
                onClick={() => onBatchProcess(tool)}
                disabled={isBatchProcessing}
                className="w-full h-9 bg-white/[0.03] hover:bg-[#FF6B35] border border-white/5 hover:border-[#FF6B35] text-white justify-start px-3 gap-2 group transition-all rounded-lg text-xs"
              >
                <tool.icon className="w-3.5 h-3.5 text-[#FF6B35] group-hover:text-white" />
                {isBatchProcessing ? `${batchProgress}%` : tool.label}
                {isBatchProcessing && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
              </Button>
            ))}
          </div>

          <button
            onClick={onClearAll}
            className="w-full p-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium transition-all flex items-center gap-2"
          >
            <X className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}