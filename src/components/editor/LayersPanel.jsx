import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, Trash2, Image as ImageIcon, Lock, Unlock, ChevronUp, ChevronDown, Edit2, Check, X, Folder, FolderPlus, RotateCcw, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function LayersPanel({ 
  layers, 
  selectedLayerId,
  selectedLayerIds = [],
  layerGroups = [],
  onSelectLayer, 
  onToggleVisibility,
  onDeleteLayer,
  onToggleLock,
  onReorderLayer,
  onAddImageLayer,
  onUpdateLayerOpacity,
  onRenameLayer,
  onBulkToggleVisibility,
  onBulkToggleLock,
  onBulkUpdateOpacity,
  onBulkDeleteLayers,
  onCreateGroup,
  onDeleteGroup,
  onLayerUndo,
  onLayerRedo,
  canUndo,
  canRedo
}) {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [showGroupDialog, setShowGroupDialog] = useState(false);

  const handleStartEdit = (layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleSaveEdit = (layerId) => {
    if (editingName.trim()) {
      onRenameLayer(layerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingLayerId(null);
    setEditingName("");
  };

  const handleCreateGroup = () => {
    if (selectedLayerIds.length < 2) {
      toast.error('Select at least 2 layers to create a group');
      return;
    }
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    onCreateGroup(groupName.trim(), selectedLayerIds);
    setGroupName("");
    setShowGroupDialog(false);
  };

  const multiSelectActive = selectedLayerIds.length > 1;
  const selectedLayers = layers.filter(l => selectedLayerIds.includes(l.id));

  return (
    <div className="py-6 px-4 space-y-6">
      {/* Undo/Redo Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onLayerUndo}
          disabled={!canUndo}
          className="flex-1 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
          title="Undo layer action"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Undo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onLayerRedo}
          disabled={!canRedo}
          className="flex-1 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
          title="Redo layer action"
        >
          <RotateCw className="w-4 h-4 mr-1" />
          Redo
        </Button>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {multiSelectActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 p-4 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{selectedLayerIds.length} layers selected</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectLayer(null)}
                className="h-6 px-2 text-white/60 hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60">Bulk Opacity</label>
              <Slider
                value={[selectedLayers[0]?.opacity || 100]}
                onValueChange={(value) => onBulkUpdateOpacity(value[0])}
                min={0}
                max={100}
                step={1}
                className="[&_.relative]:bg-white/10 [&_.absolute]:bg-[#FF6B35]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onBulkToggleVisibility(true)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Eye className="w-3 h-3 mr-1" />
                Show All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onBulkToggleVisibility(false)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <EyeOff className="w-3 h-3 mr-1" />
                Hide All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onBulkToggleLock(true)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Lock className="w-3 h-3 mr-1" />
                Lock All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onBulkToggleLock(false)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Unlock className="w-3 h-3 mr-1" />
                Unlock All
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowGroupDialog(true)}
                className="flex-1 bg-[#FF6B35]/20 hover:bg-[#FF6B35]/30 text-white border border-[#FF6B35]/30"
              >
                <FolderPlus className="w-3 h-3 mr-1" />
                Group
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onBulkDeleteLayers}
                className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Creation Dialog */}
      <AnimatePresence>
        {showGroupDialog && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
          >
            <h4 className="text-sm font-medium text-white">Create Group</h4>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="bg-white/5 border-white/10 text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateGroup}
                className="flex-1 btn-gradient"
              >
                <Check className="w-3 h-3 mr-1" />
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowGroupDialog(false);
                  setGroupName("");
                }}
                className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups */}
      {layerGroups.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Groups</h4>
          {layerGroups.map(group => (
            <div
              key={group.id}
              className="p-3 rounded-xl bg-[#FFB800]/10 border border-[#FFB800]/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[#FFB800]" />
                  <span className="text-sm font-medium text-white">{group.name}</span>
                  <span className="text-xs text-white/40">({group.layerIds.length})</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteGroup(group.id)}
                  className="h-6 px-2 text-white/40 hover:text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Layer */}
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
                <p className="text-xs text-white/40 mt-1">Upload or drop images</p>
              </div>
            </div>
          </div>
          <input type="file" accept="image/*" multiple onChange={onAddImageLayer} className="hidden" />
        </label>
      </div>

      {/* Layer Stack */}
      {layers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Layer Stack</h4>
          {[...layers].reverse().map((layer, reversedIdx) => {
            const actualIdx = layers.length - 1 - reversedIdx;
            const isSelected = selectedLayerIds.includes(layer.id);
            const isEditing = editingLayerId === layer.id;
            
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
                  onClick={(e) => onSelectLayer(layer.id, e.ctrlKey || e.metaKey)}
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
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-7 text-sm bg-white/5 border-white/10 text-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(layer.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit(layer.id);
                            }}
                            className="p-1 rounded hover:bg-white/10"
                          >
                            <Check className="w-3 h-3 text-green-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            className="p-1 rounded hover:bg-white/10"
                          >
                            <X className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">{layer.name}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(layer);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-opacity"
                          >
                            <Edit2 className="w-3 h-3 text-white/40" />
                          </button>
                          {layer.locked && <Lock className="w-3 h-3 text-white/40" />}
                        </div>
                      )}
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

                  {isSelected && selectedLayerIds.length === 1 && (
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
          <p className="text-xs text-white/30 mt-1">Add images to get started</p>
        </div>
      )}
    </div>
  );
}