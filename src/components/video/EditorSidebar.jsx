import React from "react";
import { Layers, Type, Wand2, Zap, Sparkles, Sliders, Music } from "lucide-react";

export default function EditorSidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "media", icon: Layers, label: "Media" },
    { id: "text", icon: Type, label: "Text" },
    { id: "audio", icon: Music, label: "Audio" },
    { id: "transitions", icon: Zap, label: "Transit." },
    { id: "effects", icon: Sparkles, label: "Effects" },
    { id: "remove", icon: Wand2, label: "Magic" },
  ];

  return (
    <div className="w-[72px] bg-[#0A0A0A] border-r border-white/10 flex flex-col items-center py-4 gap-2 z-20 shrink-0">
       {tabs.map((tab) => (
         <button
           key={tab.id}
           onClick={() => setActiveTab(tab.id)}
           className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${
             activeTab === tab.id 
               ? "bg-[#252525] text-[#FF6B35]" 
               : "text-white/40 hover:text-white hover:bg-white/5"
           }`}
         >
           <tab.icon className="w-5 h-5" />
           <span className="text-[9px] font-medium tracking-wide">{tab.label}</span>
         </button>
       ))}
    </div>
  );
}