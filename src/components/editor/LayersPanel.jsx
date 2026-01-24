import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, Trash2, Image as ImageIcon, Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

export default function LayersPanel({ 
  layers, 
  selectedLayerId, 
  onSelectLayer, 
  onToggleVisibility,
  onDeleteLayer,
  onToggleLock,
  onReorderLayer,
  onAddImageLayer,
  onUpdateLayerOpacity
}) {
  return (
    <div className="py-6 px-4 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#FF6B35]"></span>
            Layers
          </h3>
          <span className="text-xs text-white/30">{layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
        </div>
        
        <label className="block cursor-pointer group">
          <div className="relative overflow-hidden border border-dashed border-white/20 rounded-2xl p-6 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5 transition-all">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FF6B35]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6 text-[#FF6B35]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-[#FF6B35] transition-colors">Add Image Layer</p>
                <p className="text-xs text-white/40 mt-1">Upload or drop an image</p>
              </div>
            </div>
          </div>
          <input type="file" accept="image/*" onChange={onAddImageLayer} className="hidden" />
        </label>
      </div>

      {layers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Layer Stack</h4>
          {[...layers].reverse().map((layer, reversedIdx) => {
            const actualIdx = layers.length - 1 - reversedIdx;
            const isSelected = layer.id === selectedLayerId;
            
            return (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative rounded-xl border transition-all ${
                  isSelected 
                    ? 'bg-[#FF6B35]/10 border-[#FF6B35]/50 shadow-lg' 
                    : 'bg-white/[0.03] border-white/5 hover:border-white/20'
                }`}
              >
                <div 
                  onClick={() => onSelectLayer(layer.id)}
                  className="p-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {layer.thumbnail && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                        <img 
                          src={layer.thumbnail} 
                          alt={layer.name}
                          className="w-full h-full object-cover"
                          style={{ opacity: layer.opacity / 100 }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{layer.name}</p>
                        {layer.locked && <Lock className="w-3 h-3 text-white/40" />}
                      </div>
                      <p className="text-xs text-white/40">Opacity: {layer.opacity}%</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(layer.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {layer.visible ? (
                          <Eye className="w-4 h-4 text-white/60" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-white/30" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock(layer.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {layer.locked ? (
                          <Lock className="w-4 h-4 text-white/60" />
                        ) : (
                          <Unlock className="w-4 h-4 text-white/30" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLayer(layer.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">Layer Opacity</label>
                        <Slider
                          value={[layer.opacity]}
                          onValueChange={(value) => onUpdateLayerOpacity(layer.id, value[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="[&_.relative]:bg-white/10 [&_.absolute]:bg-[#FF6B35]"
                        />
                      </div>

                      <div className="flex gap-1 mt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderLayer(layer.id, 'up');
                          }}
                          disabled={actualIdx === layers.length - 1}
                          className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Up
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderLayer(layer.id, 'down');
                          }}
                          disabled={actualIdx === 0}
                          className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Down
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {layers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-white/40">No layers yet</p>
          <p className="text-xs text-white/30 mt-1">Add an image to get started</p>
        </div>
      )}
    </div>
  );
}