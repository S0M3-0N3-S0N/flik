import React, { useState, useRef } from "react";
import { Eye, EyeOff, Trash2, GripVertical, Image, Paintbrush, SlidersHorizontal, Layers, Star, Filter, ChevronDown, ChevronUp } from "lucide-react";

const LAYER_ICONS = {
  image: Image,
  sticker: Star,
  paint: Paintbrush,
  adjustments: SlidersHorizontal,
  filter: Filter,
};

const LAYER_COLORS = {
  image: "#FF6B35",
  sticker: "#FFB800",
  paint: "#F72C25",
  adjustments: "#4ECDC4",
  filter: "#9B59B6",
};

const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"];

export default function LayersPanel({ layers, onLayersChange, onLayerSelect, selectedLayerId }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const layerRefs = useRef([]);
  const containerRef = useRef(null);

  // Touch drag support
  const handleTouchDragStart = (e, index) => {
    setDragIndex(index);
  };

  const handleTouchDragMove = (e) => {
    if (dragIndex === null) return;
    e.preventDefault();
    const touch = e.touches[0];
    const elements = layerRefs.current;
    for (let i = 0; i < elements.length; i++) {
      if (!elements[i]) continue;
      const rect = elements[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        setDragOverIndex(i);
        break;
      }
    }
  };

  const handleTouchDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reordered = Array.from(layers);
      const [removed] = reordered.splice(dragIndex, 1);
      reordered.splice(dragOverIndex, 0, removed);
      onLayersChange(reordered);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Mouse drag support
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = Array.from(layers);
    const [removed] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, removed);
    onLayersChange(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const toggleVisibility = (id) => {
    onLayersChange(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const deleteLayer = (id) => {
    onLayersChange(layers.filter(l => l.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateLayer = (id, updates) => {
    onLayersChange(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/30">
        <Layers className="w-10 h-10 mb-3" />
        <p className="text-sm">No layers yet</p>
        <p className="text-xs mt-1">Upload an image to start</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Layers</h3>
        <span className="text-xs text-white/30">{layers.length} layer{layers.length !== 1 ? "s" : ""}</span>
      </div>

      {layers.map((layer, index) => {
        const Icon = LAYER_ICONS[layer.type] || Image;
        const color = LAYER_COLORS[layer.type] || "#FF6B35";
        const isSelected = selectedLayerId === layer.id;
        const isBase = layer.type === "image";
        const isExpanded = expandedId === layer.id;
        const isDraggingThis = dragIndex === index;
        const isDragOver = dragOverIndex === index && dragIndex !== index;

        return (
          <div
            key={layer.id}
            ref={el => layerRefs.current[index] = el}
            draggable={!isBase}
            onDragStart={!isBase ? (e) => handleDragStart(e, index) : undefined}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`rounded-xl border transition-all duration-100 ${
              isSelected ? "border-[#FF6B35]/50 bg-[#FF6B35]/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
            } ${isDraggingThis ? "opacity-40 scale-[0.98]" : ""} ${isDragOver ? "border-[#FFB800]/60 bg-[#FFB800]/5" : ""}`}
          >
            {/* Main row */}
            <div
              className="flex items-center gap-2 p-2.5 cursor-pointer"
              onClick={() => { onLayerSelect(layer.id); }}
            >
              {/* Drag handle */}
              {!isBase ? (
                <div className="text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing flex-shrink-0">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-3.5 flex-shrink-0" />
              )}

              {/* Icon / Thumbnail */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: `${color}20` }}
              >
                {layer.type === "sticker" && layer.url ? (
                  <img src={layer.url} alt="" className="w-6 h-6 object-contain" />
                ) : layer.type === "image" && layer.thumbnail ? (
                  <img src={layer.thumbnail} alt="" className="w-8 h-8 object-cover rounded-lg" />
                ) : (
                  <Icon className="w-4 h-4" style={{ color }} />
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${layer.visible ? "text-white" : "text-white/30 line-through"}`}>
                  {layer.name}
                </p>
                <p className="text-[10px] text-white/30 capitalize">{layer.type}</p>
              </div>

              {/* Expand toggle (for sticker/paint layers - phase 2 controls) */}
              {(layer.type === "sticker" || layer.type === "paint") && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(layer.id); }}
                  className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-white transition-colors flex-shrink-0"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}

              {/* Visibility */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }}
                className="w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-white transition-colors flex-shrink-0"
              >
                {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              {/* Delete */}
              {!isBase && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                  className="w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Phase 2: Per-layer controls (opacity + blend mode) */}
            {(isExpanded || (isSelected && !isBase)) && (
              <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-2">
                {/* Opacity */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12 flex-shrink-0">Opacity</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((layer.opacity ?? 1) * 100)}
                    onChange={(e) => updateLayer(layer.id, { opacity: parseInt(e.target.value) / 100 })}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 h-1 accent-[#FF6B35]"
                  />
                  <span className="text-[10px] text-white/40 w-7 text-right flex-shrink-0">
                    {Math.round((layer.opacity ?? 1) * 100)}%
                  </span>
                </div>

                {/* Blend mode (sticker/paint only) */}
                {(layer.type === "sticker" || layer.type === "paint") && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-12 flex-shrink-0">Blend</span>
                    <select
                      value={layer.blendMode || "normal"}
                      onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-white/80 px-2 py-1 outline-none cursor-pointer"
                    >
                      {BLEND_MODES.map(m => (
                        <option key={m} value={m} className="bg-[#1a1a1a] text-white capitalize">{m}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-white/20 text-center pt-2">
        Drag to reorder · Click to select
      </p>
    </div>
  );
}