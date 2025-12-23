import React from 'react';
import { Upload, Plus, Trash2, Edit2, Music, Video, Type, Wand2, Image, Sparkles, Zap, Sliders } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PropertiesPanel({
  activeTab,
  setActiveTab,
  videoFile,
  tracks,
  handleFileUpload,
  handleAudioUpload,
  handleAddTextClip,
  selectedClip,
  handleDeleteClip,
  editingText,
  setEditingText,
  handleUpdateTextClip,
  videoEffects,
  setVideoEffects,
  handleApplyEffect,
  playbackSpeed,
  handleSpeedChange,
  volume,
  handleVolumeChange
}) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-6 bg-white/5 mx-2 my-4 p-1 rounded-xl h-auto">
        <TabsTrigger value="media" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]"><Video className="w-4 h-4" /></TabsTrigger>
        <TabsTrigger value="text" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]"><Type className="w-4 h-4" /></TabsTrigger>
        <TabsTrigger value="transitions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]"><Zap className="w-4 h-4" /></TabsTrigger>
        <TabsTrigger value="effects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]"><Sparkles className="w-4 h-4" /></TabsTrigger>
        <TabsTrigger value="speed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B35] data-[state=active]:to-[#FFB800]"><Sliders className="w-4 h-4" /></TabsTrigger>
      </TabsList>

      <div className="px-4 pb-4">
        <TabsContent value="media" className="mt-0">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Media Library</h3>
          
          <label className="block cursor-pointer mb-4">
            <div className="border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-white/40 transition-colors">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-[#FF6B35]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Upload Media</p>
                  <p className="text-xs text-white/50 mt-1">Videos & Photos</p>
                </div>
              </div>
            </div>
            <input type="file" accept="video/*,image/*" onChange={handleFileUpload} className="hidden" multiple />
          </label>

          <div className="space-y-2">
             <p className="text-xs text-white/40">Project Files</p>
             {tracks.find(t => t.type === 'video')?.clips.map((clip, idx) => (
               <div key={clip.id} className="p-2 rounded-lg bg-white/5 flex items-center gap-3 group">
                 <div className="w-10 h-10 bg-black rounded flex items-center justify-center overflow-hidden">
                    <video src={clip.url} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{clip.name}</p>
                    <p className="text-[10px] text-white/40">{Math.round(clip.duration)}s</p>
                 </div>
                 <Button 
                   size="icon" 
                   variant="ghost" 
                   className="h-6 w-6 opacity-0 group-hover:opacity-100 text-white hover:bg-white/20"
                   onClick={() => handleDeleteClip('video', clip.id)}
                 >
                   <Trash2 className="w-3 h-3" />
                 </Button>
               </div>
             ))}
          </div>
        </TabsContent>

        <TabsContent value="text" className="mt-0 space-y-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Text Overlays</h3>
          
          <Button onClick={handleAddTextClip} className="w-full btn-gradient text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Text
          </Button>

          {editingText ? (
            <div className="space-y-3 p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white text-sm">Edit Text</Label>
                <Button size="sm" variant="ghost" onClick={() => setEditingText(null)} className="h-6 w-6 p-0 text-white hover:bg-white/20">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div>
                <Label className="text-white/60 text-xs">Content</Label>
                <Input
                  value={editingText.text}
                  onChange={(e) => handleUpdateTextClip({ text: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-white/60 text-xs">Position</Label>
                <Select
                  value={editingText.style.position}
                  onValueChange={(value) => handleUpdateTextClip({ style: { ...editingText.style, position: value } })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white/60 text-xs">Size: {editingText.style.fontSize}px</Label>
                <Slider
                  value={[editingText.style.fontSize]}
                  onValueChange={(value) => handleUpdateTextClip({ style: { ...editingText.style, fontSize: value[0] } })}
                  min={20} max={120} step={4} className="mt-2"
                />
              </div>

              <div>
                <Label className="text-white/60 text-xs">Color</Label>
                <input
                  type="color"
                  value={editingText.style.color}
                  onChange={(e) => handleUpdateTextClip({ style: { ...editingText.style, color: e.target.value } })}
                  className="w-full h-10 rounded bg-white/5 border border-white/10 mt-1 cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40 text-center py-4">Select a text clip to edit</p>
          )}
        </TabsContent>

        <TabsContent value="effects" className="mt-0">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Filters & Effects</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { name: 'Blur', icon: Wand2 },
              { name: 'B&W', icon: Image },
              { name: 'Sepia', icon: Image },
              { name: 'Vintage', icon: Sparkles },
              { name: 'Glow', icon: Sparkles },
              { name: 'Sharpen', icon: Wand2 },
            ].map((effect) => (
              <button
                key={effect.name}
                onClick={() => handleApplyEffect(effect.name)}
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center text-white border border-white/5 hover:border-white/20"
              >
                <effect.icon className="w-5 h-5 mx-auto mb-2 text-[#FF6B35]" />
                <p className="text-xs text-white/80">{effect.name}</p>
              </button>
            ))}
          </div>
          <div className="space-y-4 pt-4 border-t border-white/10">
            {Object.entries(videoEffects).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between mb-2">
                  <Label className="text-white/60 text-xs capitalize">{key}</Label>
                  <span className="text-white/40 text-xs">{value}%</span>
                </div>
                <Slider 
                  value={[value]} 
                  onValueChange={(val) => setVideoEffects(prev => ({ ...prev, [key]: val[0] }))} 
                  min={0} max={200} step={5} 
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="speed" className="mt-0">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Playback & Audio</h3>
          <div className="space-y-6">
            <div>
              <Label className="text-white/60 text-xs mb-3 block">Playback Speed</Label>
              <div className="grid grid-cols-4 gap-2">
                {[0.5, 1, 1.5, 2].map((speed) => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSpeedChange(speed)}
                    className={playbackSpeed === speed ? "btn-gradient text-white" : "bg-white/10 border-white/20 text-white"}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
                <label className="block cursor-pointer mb-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                    <Music className="w-5 h-5 text-[#FF6B35]" />
                    <div className="flex-1 text-left">
                      <p className="text-sm text-white">Add Background Music</p>
                      <p className="text-xs text-white/50">MP3, WAV</p>
                    </div>
                    <Plus className="w-4 h-4 text-white/60" />
                  </div>
                  <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                </label>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}