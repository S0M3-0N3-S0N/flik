import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Video, Image as ImageIcon } from "lucide-react";
import MediaLibrary from "@/components/video/MediaLibrary";

export default function TemplateWizard({ template, isOpen, onCancel, onComplete }) {
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [filledSlots, setFilledSlots] = useState({}); // { slotId: mediaClip }
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const slots = template.slots || [];
  const currentSlot = slots[currentSlotIndex];

  const handleSelectMedia = (clip) => {
    // In a real app we'd validate type/duration here
    setFilledSlots({ ...filledSlots, [currentSlot.id]: clip });
    setShowMediaPicker(false);
    
    // Auto advance
    if (currentSlotIndex < slots.length - 1) {
      setCurrentSlotIndex(currentSlotIndex + 1);
    }
  };

  const handleFinish = () => {
    onComplete(filledSlots);
  };

  const isComplete = slots.every(slot => filledSlots[slot.id]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl h-[80vh] bg-[#1a1a1a] border-white/10 text-white flex flex-col p-0 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#141414]">
           <div>
             <DialogTitle className="text-xl">Create from Template</DialogTitle>
             <DialogDescription className="text-white/50">
               {template.title} • {slots.length} clips needed
             </DialogDescription>
           </div>
           <div className="text-sm text-white/50">
             Step {currentSlotIndex + 1} of {slots.length}
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Slot List / Progress */}
          <div className="w-64 border-r border-white/10 bg-[#141414] p-4 space-y-2 overflow-y-auto">
             {slots.map((slot, idx) => (
               <div 
                 key={slot.id}
                 onClick={() => setCurrentSlotIndex(idx)}
                 className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    currentSlotIndex === idx 
                      ? "bg-[#FF6B35]/10 border-[#FF6B35] text-white" 
                      : filledSlots[slot.id] 
                        ? "bg-white/5 border-white/10 text-white/60"
                        : "bg-transparent border-white/5 text-white/30"
                 }`}
               >
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium uppercase">{slot.label || `Clip ${idx + 1}`}</span>
                    {slot.type === 'video' ? <Video className="w-3 h-3"/> : <ImageIcon className="w-3 h-3"/>}
                 </div>
                 <div className="text-xs opacity-50 mb-2">{slot.duration}s</div>
                 
                 {filledSlots[slot.id] ? (
                    <div className="aspect-video bg-black rounded overflow-hidden relative">
                       <img src={filledSlots[slot.id].thumbnail_url || filledSlots[slot.id].url} className="w-full h-full object-cover" />
                    </div>
                 ) : (
                    <div className="aspect-video bg-black/20 rounded border border-dashed border-white/10 flex items-center justify-center">
                       <div className="w-2 h-2 rounded-full bg-white/20" />
                    </div>
                 )}
               </div>
             ))}
          </div>

          {/* Media Selection Area */}
          <div className="flex-1 flex flex-col bg-[#0A0A0A] relative">
             <div className="flex-1 p-6 overflow-hidden">
                <h3 className="text-lg font-medium mb-4">Select Media for "{currentSlot?.label}"</h3>
                <div className="h-full border border-white/10 rounded-xl overflow-hidden bg-[#141414]">
                   <MediaLibrary onAddClip={handleSelectMedia} />
                </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#141414] flex justify-end gap-3">
           <Button variant="ghost" onClick={onCancel} className="text-white hover:bg-white/10">Cancel</Button>
           <Button 
             onClick={handleFinish} 
             disabled={!isComplete}
             className="bg-gradient-to-r from-[#FF6B35] to-[#FFB800] text-white border-0"
           >
             Generate Video <ArrowRight className="w-4 h-4 ml-2" />
           </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}