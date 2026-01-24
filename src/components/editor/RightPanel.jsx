import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SpotRemoval from "@/components/editor/SpotRemoval";
import AdjustmentsPanel from "@/components/editor/AdjustmentsPanel";
import FiltersPanel from "@/components/editor/FiltersPanel";
import TransformPanel from "@/components/editor/TransformPanel";
import CropPanel from "@/components/editor/CropPanel";
import ToolPanel from "@/components/editor/ToolPanel";

export default function RightPanel({
  activeTab,
  onTabChange,
  currentImage,
  adjustments,
  onAdjustmentChange,
  selectedFilter,
  onFilterSelect,
  brushStrokes,
  onBrushStrokesChange,
  onToolSelect,
  onTransform,
  isCropping,
  onStartCrop,
  onCancelCrop,
  onApplyCrop,
  isProcessing,
  magicBrushPrompt,
  onMagicBrushPromptChange,
  magicBrushImages,
  onMagicBrushImagesChange,
  onMagicBrush,
  isMagicBrushProcessing,
}) {
  return (
    <AnimatePresence>
      {activeTab && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute right-0 top-14 h-[calc(100%-3.5rem)] w-96 bg-[#1a1a1a]/95 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <h3 className="text-sm font-semibold text-white capitalize">
              {activeTab === "ai" && "AI Tools"}
              {activeTab === "adjust" && "Adjustments"}
              {activeTab === "filters" && "Filters"}
              {activeTab === "transform" && "Transform"}
              {activeTab === "crop" && "Crop & Resize"}
              {activeTab === "remove" && "Magic Brush"}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTabChange(null)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {activeTab === "ai" && (
              <ToolPanel
                onToolSelect={onToolSelect}
                isProcessing={isProcessing}
              />
            )}

            {activeTab === "adjust" && (
              <AdjustmentsPanel
                adjustments={adjustments}
                onChange={onAdjustmentChange}
              />
            )}

            {activeTab === "filters" && (
              <FiltersPanel
                selectedFilter={selectedFilter}
                onFilterSelect={onFilterSelect}
                currentImage={currentImage}
              />
            )}

            {activeTab === "transform" && (
              <TransformPanel onTransform={onTransform} />
            )}

            {activeTab === "crop" && (
              <CropPanel
                onApplyCrop={onApplyCrop}
                onCancel={onCancelCrop}
              />
            )}

            {activeTab === "remove" && (
              <SpotRemoval
                brushStrokes={brushStrokes}
                onBrushStrokesChange={onBrushStrokesChange}
                magicBrushPrompt={magicBrushPrompt}
                onMagicBrushPromptChange={onMagicBrushPromptChange}
                magicBrushImages={magicBrushImages}
                onMagicBrushImagesChange={onMagicBrushImagesChange}
                onExecute={onMagicBrush}
                isProcessing={isMagicBrushProcessing}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}