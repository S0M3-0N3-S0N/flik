import React from "react";
import { Upload, Plus, Music, Trash2, Wand2, Image, Sparkles, Zap, X, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function ResourcePanel({ 
  activeTab, 
  videoFile, 
  tracks, 
  onFileUpload, 
  onAudioUpload,
  onAddText, 
  editingText,
  setEditingText,
  onUpdateText, 
  onDeleteClip,
  videoEffects,
  setVideoEffects,
  onApplyEffect,
  selectedClip,
  onApplyTransition,
  onRemoveTransition,
  isProcessing,
  onAutoRemoveWatermark
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-80 bg-[#121212] border-r border-white/10 flex flex-col h-full overflow-y-auto shrink-0">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            {activeTab === 'media' && 'Project Media'}
            {activeTab === 'text' && 'Text & Titles'}
            {activeTab === 'audio' && 'Audio Library'}
            {activeTab === 'transitions' && 'Transitions'}
            {activeTab === 'effects' && 'Visual Effects'}
            {activeTab === 'remove' && 'Magic Tools'}
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {activeTab === 'media' && (
          <>
            <label className="block cursor-pointer group">
              <div className="border border-dashed border-white/20 rounded-xl p-8 hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-white/70 group-hover:text-[#FF6B35]" />
                </div>
                <p className="text-sm font-medium text-white mb-1">Import Media</p>
                <p className="text-xs text-white/40">Drag & drop or click to upload</p>
              </div>
              <input type="file" accept="video/*" onChange={onFileUpload} className="hidden" multiple />
            </label>

            {videoFile && (
              <div className="space-y-3">
                 <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Project Files</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="aspect-video bg-white/5 rounded-lg border border-white/10 overflow-hidden relative group">
                        <video src={videoFile.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Plus className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-[10px] text-white truncate">{videoFile.name}</p>
                        </div>
                    </div>
                    {/* Placeholder for more files */}
                    <div className="aspect-video bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-white/20 hover:text-white/40 hover:bg-white/10 transition-colors cursor-pointer border-dashed" onClick={() => document.querySelector('input[type=file]').click()}>
                        <Plus className="w-6 h-6" />
                    </div>
                 </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'text' && (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={onAddText} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center group transition-all">
                        <Type className="w-6 h-6 text-[#FF6B35] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-medium text-white">Default Text</p>
                    </button>
                    {/* Add more text presets here if needed */}
                </div>

                {editingText ? (
                  <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <Label className="text-white text-xs font-medium uppercase tracking-wider">Edit Text</Label>
                      <Button size="sm" variant="ghost" onClick={() => setEditingText(null)} className="h-6 w-6 p-0 text-white/40 hover:text-white">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                        <Input
                            value={editingText.text}
                            onChange={(e) => onUpdateText({ text: e.target.value })}
                            className="bg-black/20 border-white/10 text-white h-9"
                        />
                        
                        <div className="grid grid-cols-2 gap-2">
                             <Select
                                value={editingText.style.position}
                                onValueChange={(value) => onUpdateText({ style: { ...editingText.style, position: value } })}
                              >
                                <SelectTrigger className="bg-black/20 border-white/10 text-white h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="top">Top</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="bottom">Bottom</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <div className="flex items-center gap-2 border border-white/10 rounded-md px-2 bg-black/20">
                                <input
                                    type="color"
                                    value={editingText.style.color}
                                    onChange={(e) => onUpdateText({ style: { ...editingText.style, color: e.target.value } })}
                                    className="w-4 h-4 rounded-full border-none bg-transparent cursor-pointer"
                                />
                                <span className="text-xs text-white/60">{editingText.style.color}</span>
                              </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-white/60 mb-1.5">
                                <span>Size</span>
                                <span>{editingText.style.fontSize}px</span>
                            </div>
                            <Slider
                                value={[editingText.style.fontSize]}
                                onValueChange={(value) => onUpdateText({ style: { ...editingText.style, fontSize: value[0] } })}
                                min={20} max={120} step={4}
                            />
                        </div>
                    </div>
                  </div>
                ) : (
                    <p className="text-xs text-white/40 text-center py-4">Select a text clip to edit properties</p>
                )}
            </div>
        )}

        {activeTab === 'audio' && (
            <div className="space-y-6">
                <label className="block cursor-pointer">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/20 hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            <Upload className="w-4 h-4 text-white/70" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-white">Import Audio</p>
                            <p className="text-xs text-white/40">MP3, WAV</p>
                        </div>
                    </div>
                    <input type="file" accept="audio/*" onChange={onAudioUpload} className="hidden" />
                </label>

                <div className="space-y-2">
                     <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Audio Tracks</h3>
                     {tracks.find(t => t.type === 'audio')?.clips.map(clip => (
                        <div key={clip.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Music className="w-4 h-4 text-[#FF6B35]" />
                                <span className="text-sm text-white truncate">{clip.name}</span>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => onDeleteClip('audio', clip.id)} className="h-6 w-6 text-white/40 hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                     ))}
                     {(!tracks.find(t => t.type === 'audio')?.clips.length) && (
                         <p className="text-xs text-white/30 italic">No audio tracks added</p>
                     )}
                </div>
            </div>
        )}

        {activeTab === 'transitions' && (
            <div className="space-y-4">
                 {selectedClip && selectedClip.type === 'video' ? (
                     <>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'fade', name: 'Fade' },
                            { id: 'dissolve', name: 'Dissolve' },
                            { id: 'slide', name: 'Slide' },
                            { id: 'wipe', name: 'Wipe' },
                          ].map((trans) => (
                            <button
                              key={trans.id}
                              onClick={() => onApplyTransition(trans.id)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                selectedClip.transition === trans.id 
                                  ? 'bg-[#FF6B35]/20 border-[#FF6B35] text-white' 
                                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                               <div className="w-full h-12 bg-black/20 rounded mb-2 flex items-center justify-center">
                                   <Zap className={`w-4 h-4 ${selectedClip.transition === trans.id ? 'text-[#FF6B35]' : 'text-white/20'}`} />
                               </div>
                               <p className="text-xs font-medium">{trans.name}</p>
                            </button>
                          ))}
                        </div>
                        {selectedClip.transition && (
                            <Button variant="outline" size="sm" onClick={onRemoveTransition} className="w-full border-white/20 text-white hover:bg-white/10">
                                Remove Transition
                            </Button>
                        )}
                     </>
                 ) : (
                     <div className="text-center py-8">
                         <p className="text-sm text-white/50">Select a video clip on the timeline to apply transitions</p>
                     </div>
                 )}
            </div>
        )}

        {activeTab === 'effects' && (
             <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2">
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
                      onClick={() => onApplyEffect(effect.name)}
                      disabled={!videoFile}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center gap-2 border border-white/5 disabled:opacity-30"
                    >
                      <effect.icon className="w-4 h-4 text-[#FF6B35]" />
                      <p className="text-[10px] text-white/80">{effect.name}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                   {['brightness', 'contrast', 'saturation'].map(key => (
                       <div key={key}>
                         <div className="flex justify-between text-xs text-white/60 mb-1.5">
                             <span className="capitalize">{key}</span>
                             <span>{videoEffects[key]}%</span>
                         </div>
                         <Slider 
                            value={[videoEffects[key]]} 
                            onValueChange={(value) => setVideoEffects({ ...videoEffects, [key]: value[0] })} 
                            min={0} max={200} step={5} 
                         />
                       </div>
                   ))}
                </div>
             </div>
        )}

        {activeTab === 'remove' && (
             <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/10 border border-[#FF6B35]/20">
                      <div className="flex items-center gap-3 mb-3">
                          <Wand2 className="w-5 h-5 text-[#FF6B35]" />
                          <h3 className="text-sm font-bold text-white">Magic Eraser</h3>
                      </div>
                      <p className="text-xs text-white/70 mb-4 leading-relaxed">
                          Automatically detect and remove watermarks or unwanted objects from the current frame.
                      </p>
                      <Button
                        onClick={onAutoRemoveWatermark}
                        disabled={isProcessing || !videoFile}
                        className="w-full btn-gradient text-white shadow-lg shadow-orange-500/20"
                      >
                        {isProcessing ? 'Processing...' : 'Auto Clean Frame'}
                      </Button>
                  </div>
             </div>
        )}
      </div>
    </div>
  );
}