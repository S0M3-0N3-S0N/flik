import React from "react";
import { Button } from "@/components/ui/button";
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from "lucide-react";
import { motion } from "framer-motion";

export default function TransformPanel({ onTransform }) {
  const actions = [
    { id: 'rotate-left', icon: RotateCcw, label: 'Rotate -90°', desc: 'Counter-clockwise' },
    { id: 'rotate-right', icon: RotateCw, label: 'Rotate 90°', desc: 'Clockwise' },
    { id: 'flip-horizontal', icon: FlipHorizontal, label: 'Flip Horizontal', desc: 'Mirror X-axis' },
    { id: 'flip-vertical', icon: FlipVertical, label: 'Flip Vertical', desc: 'Mirror Y-axis' },
  ];

  return (
    <div className="py-6 px-4 grid grid-cols-2 gap-3">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onTransform(action.id)}
          className="group relative p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all text-left flex flex-col gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 group-hover:bg-[#FF6B35]/20 text-[#FF6B35] flex items-center justify-center transition-colors">
            <action.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-white group-hover:text-[#FF6B35] transition-colors">{action.label}</p>
            <p className="text-[10px] text-white/40 mt-1">{action.desc}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}