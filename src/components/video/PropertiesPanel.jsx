import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Copy, Eye, EyeOff } from "lucide-react";

export default function PropertiesPanel({ selectedClip }) {
  if (!selectedClip) {
    return (
      <div className="h-full flex items-center justify-center text-white/30 text-sm p-8 text-center">
        Select a clip on the timeline to edit properties
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-medium text-white mb-1 truncate">{selectedClip.title}</h3>
        <p className="text-xs text-white/40 capitalize">{selectedClip.type} Clip</p>
      </div>
      
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Transform */}
        <div className="space-y-3">
          <label className="text-xs text-white/60 font-medium uppercase">Transform</label>
          <div className="space-y-4">
             <div className="space-y-2">
               <div className="flex justify-between text-xs text-white/50">
                 <span>Scale</span>
                 <span>100%</span>
               </div>
               <Slider defaultValue={[100]} max={200} step={1} />
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-xs text-white/50">
                 <span>Opacity</span>
                 <span>100%</span>
               </div>
               <Slider defaultValue={[100]} max={100} step={1} />
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-xs text-white/50">
                 <span>Rotation</span>
                 <span>0°</span>
               </div>
               <Slider defaultValue={[0]} min={-180} max={180} step={1} />
             </div>
          </div>
        </div>

        {/* Speed - Video Only */}
        {selectedClip.type === 'video' && (
          <div className="space-y-3">
            <label className="text-xs text-white/60 font-medium uppercase">Speed</label>
            <div className="space-y-2">
               <div className="flex justify-between text-xs text-white/50">
                 <span>Rate</span>
                 <span>1.0x</span>
               </div>
               <Slider defaultValue={[1]} min={0.1} max={5} step={0.1} />
            </div>
          </div>
        )}
        
        {/* Template Placeholder Settings */}
        <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-3">
           <label className="text-xs text-[#FF6B35] font-medium uppercase">Template Settings</label>
           <p className="text-[10px] text-white/40">
             Mark this clip as a placeholder for user templates.
           </p>
           <div className="flex items-center gap-2">
             <input 
               type="checkbox" 
               id="isPlaceholder" 
               checked={selectedClip.isPlaceholder || false}
               onChange={(e) => {
                   // This is a direct mutation which is bad in React but for speed in this demo snippet:
                   // In real app, lift this state up via an onChange handler prop
                   selectedClip.isPlaceholder = e.target.checked;
               }}
               className="rounded bg-white/10 border-white/20" 
             />
             <label htmlFor="isPlaceholder" className="text-sm text-white">Make Placeholder</label>
           </div>
           <div className="space-y-1">
             <label className="text-xs text-white/50">Label</label>
             <input 
               type="text" 
               defaultValue={selectedClip.label || ""}
               onChange={(e) => selectedClip.label = e.target.value}
               placeholder="e.g. Intro Clip" 
               className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white" 
             />
           </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/5 flex gap-2">
        <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
          <Copy className="w-4 h-4 mr-2" /> Duplicate
        </Button>
        <Button variant="outline" className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300">
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </Button>
      </div>
    </div>
  );
}