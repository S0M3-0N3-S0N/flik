import React from 'react';
import { 
    Sliders, Zap, Sparkles, Wand2, Image, AlignLeft, AlignCenter, AlignRight,
    Type, Video, Volume2, MonitorPlay
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function InspectorPanel({
  selectedClip,
  handleUpdateClip,
  editingText,
  setEditingText,
  handleUpdateTextClip,
  videoEffects,
  setVideoEffects,
  handleApplyEffect,
  playbackSpeed,
  handleSpeedChange,
  aspectRatio,
  onAspectRatioChange
}) {

  // If no clip selected, show Project Settings
  if (!selectedClip) {
      return (
          <div className="h-full flex flex-col bg-[#0A0A0A] border-l border-white/10">
              <div className="p-4 border-b border-white/10">
                  <h2 className="text-sm font-semibold text-white">Project Settings</h2>
              </div>
              <ScrollArea className="flex-1 p-4">
                  <div className="space-y-6">
                      <div className="space-y-3">
                          <Label className="text-xs text-white/60">Aspect Ratio</Label>
                          <div className="grid grid-cols-3 gap-2">
                              {['16:9', '9:16', '1:1'].map(ratio => (
                                  <Button
                                      key={ratio}
                                      variant={aspectRatio === ratio ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => onAspectRatioChange && onAspectRatioChange(ratio)}
                                      className={aspectRatio === ratio ? "bg-[#FF6B35] hover:bg-[#E65A2C] text-white border-none" : "bg-white/5 border-white/10 text-white hover:bg-white/10"}
                                  >
                                      {ratio}
                                  </Button>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-3">
                          <Label className="text-xs text-white/60">Global Effects</Label>
                          <div className="space-y-4">
                            {Object.entries(videoEffects).map(([key, value]) => (
                                <div key={key}>
                                    <div className="flex justify-between mb-2">
                                        <Label className="text-white/80 text-xs capitalize">{key}</Label>
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
                      </div>
                  </div>
              </ScrollArea>
          </div>
      );
  }

  // Determine tabs based on clip type
  const isVideo = selectedClip.type === 'video';
  const isAudio = selectedClip.type === 'audio';
  const isText = selectedClip.type === 'text';

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] border-l border-white/10">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            {isVideo && <Video className="w-4 h-4 text-[#FF6B35]" />}
            {isAudio && <Volume2 className="w-4 h-4 text-[#FFB800]" />}
            {isText && <Type className="w-4 h-4 text-[#FF6B35]" />}
            Inspector
        </h2>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{selectedClip.type}</span>
      </div>

      <Tabs defaultValue="properties" className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
            <TabsList className="bg-white/5 p-1 rounded-lg w-full grid grid-cols-3">
                <TabsTrigger value="properties" className="text-xs">Props</TabsTrigger>
                {(isVideo || isText) && <TabsTrigger value="transform" className="text-xs">Motion</TabsTrigger>}
                {isVideo && <TabsTrigger value="effects" className="text-xs">FX</TabsTrigger>}
            </TabsList>
        </div>

        <ScrollArea className="flex-1 p-4">
            
            <TabsContent value="properties" className="mt-0 space-y-6">
                
                {/* Volume (Video/Audio) */}
                {(isVideo || isAudio) && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-white/60">Volume</Label>
                            <span className="text-xs text-white/40">{selectedClip.volume || 100}%</span>
                        </div>
                        <Slider 
                            value={[selectedClip.volume ?? 100]} 
                            onValueChange={(val) => handleUpdateClip(selectedClip.id, { volume: val[0] })} 
                            min={0} max={100} step={1} 
                        />
                    </div>
                )}

                {/* Text Editing */}
                {isText && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-white/60">Content</Label>
                            <Input
                                value={selectedClip.text}
                                onChange={(e) => handleUpdateTextClip({ text: e.target.value })}
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-xs text-white/60">Style</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-white/40">Size</span>
                                    <Input 
                                        type="number" 
                                        value={selectedClip.style?.fontSize || 48}
                                        onChange={(e) => handleUpdateTextClip({ style: { ...selectedClip.style, fontSize: parseInt(e.target.value) } })}
                                        className="bg-white/5 border-white/10 text-white h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-white/40">Color</span>
                                    <div className="flex items-center gap-2 h-8 bg-white/5 border border-white/10 rounded px-2">
                                        <input
                                            type="color"
                                            value={selectedClip.style?.color || '#ffffff'}
                                            onChange={(e) => handleUpdateTextClip({ style: { ...selectedClip.style, color: e.target.value } })}
                                            className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0"
                                        />
                                        <span className="text-xs text-white/60 uppercase">{selectedClip.style?.color}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-white/60">Position</Label>
                            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg">
                                {['top', 'center', 'bottom'].map(pos => (
                                    <button
                                        key={pos}
                                        onClick={() => handleUpdateTextClip({ style: { ...selectedClip.style, position: pos } })}
                                        className={`p-2 rounded flex justify-center ${selectedClip.style?.position === pos ? 'bg-[#FF6B35] text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                                    >
                                        <div className="h-1 w-4 bg-current rounded-full" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <Separator className="bg-white/10" />

                {/* Playback Speed (Global or Clip? Usually clip specific ideally, but currently global in props. Let's keep global for now or implement clip specific later) */}
                <div className="space-y-3">
                    <Label className="text-xs text-white/60">Playback Speed</Label>
                    <div className="grid grid-cols-4 gap-2">
                        {[0.5, 1, 1.5, 2].map((speed) => (
                            <button
                                key={speed}
                                onClick={() => handleSpeedChange(speed)}
                                className={`text-xs py-1.5 rounded-md border ${playbackSpeed === speed ? 'bg-white text-black border-white' : 'border-white/10 text-white/60 hover:text-white'}`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>
                </div>

            </TabsContent>

            <TabsContent value="transform" className="mt-0 space-y-6">
                <div className="space-y-3">
                    <Label className="text-xs text-white/60">Transition In</Label>
                    <Select 
                        value={selectedClip.transition || 'none'} 
                        onValueChange={(val) => handleUpdateClip(selectedClip.id, { transition: val })}
                    >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="fade">Fade</SelectItem>
                            <SelectItem value="wipe">Wipe</SelectItem>
                            <SelectItem value="slide">Slide</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between">
                        <Label className="text-xs text-white/60">Duration</Label>
                        <span className="text-xs text-white/40">{selectedClip.transitionDuration || 1}s</span>
                    </div>
                    <Slider 
                        value={[selectedClip.transitionDuration ?? 1]} 
                        onValueChange={(val) => handleUpdateClip(selectedClip.id, { transitionDuration: val[0] })} 
                        min={0.1} max={5} step={0.1} 
                    />
                </div>
            </TabsContent>

            <TabsContent value="effects" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { name: 'Blur', icon: Wand2 },
                        { name: 'B&W', icon: Image },
                        { name: 'Sepia', icon: Image },
                        { name: 'Vintage', icon: Sparkles },
                        { name: 'Glow', icon: Zap },
                        { name: 'Sharpen', icon: Sliders },
                    ].map((effect) => (
                        <button
                            key={effect.name}
                            onClick={() => handleApplyEffect(effect.name)}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all"
                        >
                            <effect.icon className="w-4 h-4 text-[#FF6B35]" />
                            <span className="text-[10px] text-white/80">{effect.name}</span>
                        </button>
                    ))}
                </div>
            </TabsContent>

        </ScrollArea>
    </div>
  );
}