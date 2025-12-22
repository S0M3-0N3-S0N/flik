import React from "react";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Circle, Square } from "lucide-react";

const transitions = [
  { id: 'fade', name: 'Fade', icon: Circle, duration: 0.5 },
  { id: 'crossfade', name: 'Crossfade', icon: Zap, duration: 1 },
  { id: 'slide', name: 'Slide', icon: ArrowRight, duration: 0.8 },
  { id: 'wipe', name: 'Wipe', icon: Square, duration: 0.6 },
];

export default function TransitionsPanel({ onApplyTransition, selectedClip }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-white/60">
        Select a clip then apply a transition
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        {transitions.map((transition) => (
          <button
            key={transition.id}
            onClick={() => onApplyTransition(transition)}
            disabled={!selectedClip}
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <transition.icon className="w-6 h-6 mx-auto mb-2 text-[#FF6B35]" />
            <p className="text-sm text-white">{transition.name}</p>
            <p className="text-xs text-white/40 mt-1">{transition.duration}s</p>
          </button>
        ))}
      </div>
    </div>
  );
}