import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Eye, EyeOff, Trash2, GripVertical, Image, Paintbrush, SlidersHorizontal, Layers, Sticker } from "lucide-react";
import { motion } from "framer-motion";

const LAYER_ICONS = {
  image: Image,
  sticker: Sticker,
  paint: Paintbrush,
  adjustments: SlidersHorizontal,
  filter: Layers,
};

const LAYER_COLORS = {
  image: "#FF6B35",
  sticker: "#FFB800",
  paint: "#F72C25",
  adjustments: "#4ECDC4",
  filter: "#9B59B6",
};

export default function LayersPanel({ layers, onLayersChange, onLayerSelect, selectedLayerId }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(layers);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onLayersChange(reordered);
  };

  const toggleVisibility = (id) => {
    onLayersChange(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const deleteLayer = (id) => {
    onLayersChange(layers.filter(l => l.id !== id));
  };

  const updateOpacity = (id, opacity) => {
    onLayersChange(layers.map(l => l.id === id ? { ...l, opacity } : l));
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
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Layers</h3>
        <span className="text-xs text-white/30">{layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="layers">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
              {layers.map((layer, index) => {
                const Icon = LAYER_ICONS[layer.type] || Image;
                const color = LAYER_COLORS[layer.type] || "#FF6B35";
                const isSelected = selectedLayerId === layer.id;
                const isBase = layer.type === 'image';

                return (
                  <Draggable key={layer.id} draggableId={layer.id} index={index} isDragDisabled={isBase}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`rounded-xl border transition-all duration-150 ${
                          isSelected
                            ? "border-[#FF6B35]/50 bg-[#FF6B35]/10"
                            : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
                        } ${snapshot.isDragging ? "shadow-2xl scale-[1.02] opacity-90" : ""}`}
                      >
                        <div
                          className="flex items-center gap-2 p-2.5 cursor-pointer"
                          onClick={() => onLayerSelect(layer.id)}
                        >
                          {/* Drag Handle */}
                          {!isBase ? (
                            <div {...provided.dragHandleProps} className="text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing flex-shrink-0">
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-3.5 flex-shrink-0" />
                          )}

                          {/* Layer Icon / Thumbnail */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            {layer.type === 'sticker' && layer.url ? (
                              <img src={layer.url} alt="" className="w-6 h-6 object-contain" />
                            ) : layer.type === 'image' && layer.thumbnail ? (
                              <img src={layer.thumbnail} alt="" className="w-8 h-8 object-cover rounded-lg" />
                            ) : (
                              <Icon className="w-4 h-4" style={{ color }} />
                            )}
                          </div>

                          {/* Layer Name */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${layer.visible ? 'text-white' : 'text-white/30 line-through'}`}>
                              {layer.name}
                            </p>
                            <p className="text-[10px] text-white/30 capitalize">{layer.type}</p>
                          </div>

                          {/* Visibility Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }}
                            className="w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-white transition-colors flex-shrink-0"
                          >
                            {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete (not for base image) */}
                          {!isBase && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                              className="w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-red-400 transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Opacity Slider (shown when selected) */}
                        {isSelected && (
                          <div className="px-3 pb-2.5 flex items-center gap-2">
                            <span className="text-[10px] text-white/40 w-12 flex-shrink-0">Opacity</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={Math.round((layer.opacity ?? 1) * 100)}
                              onChange={(e) => updateOpacity(layer.id, parseInt(e.target.value) / 100)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 h-1 accent-[#FF6B35]"
                            />
                            <span className="text-[10px] text-white/40 w-7 text-right flex-shrink-0">
                              {Math.round((layer.opacity ?? 1) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <p className="text-[10px] text-white/20 text-center pt-2">
        Drag to reorder · Click to select
      </p>
    </div>
  );
}