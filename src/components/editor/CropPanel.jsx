import React from "react";
import { Button } from "@/components/ui/button";
import { Crop, Check, X } from "lucide-react";
import { motion } from "framer-motion";

export default function CropPanel({ onApplyCrop, onCancelCrop }) {
  return (
    <div className="py-6 px-4 space-y-6">
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
            <Crop className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">Freeform Crop</h4>
            <p className="text-xs text-white/40">Adjust image composition</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <Button 
          onClick={onApplyCrop} 
          className="w-full btn-gradient text-white h-12 rounded-xl shadow-lg shadow-[#FF6B35]/20"
        >
          <Check className="w-4 h-4 mr-2" />
          Apply Crop
        </Button>
        <Button 
          onClick={onCancelCrop} 
          variant="ghost" 
          className="w-full text-white/60 hover:text-white hover:bg-white/5 h-12 rounded-xl"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}