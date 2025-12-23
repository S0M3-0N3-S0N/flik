import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { motion } from "framer-motion";
import { Play, Clock, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Templates() {
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['video-templates'],
    queryFn: () => base44.entities.VideoTemplate.list('-created_date', 50),
  });

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Video Templates</h1>
            <p className="text-white/50">Start with a professionally designed template or create your own.</p>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl("VideoEditor"))}
            className="bg-gradient-to-r from-[#FF6B35] to-[#FFB800] text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {isLoading ? (
           <div className="text-white/40 text-center py-20">Loading templates...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-[#141414] border border-white/10 rounded-xl overflow-hidden hover:border-[#FF6B35]/50 transition-colors"
              >
                {/* Thumbnail / Preview Area */}
                <div className="aspect-[9/16] relative bg-black/50 overflow-hidden">
                  <img src={template.thumbnail_url} alt={template.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                        onClick={() => navigate(createPageUrl("VideoEditor") + `?templateId=${template.id}`)}
                        className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-6"
                    >
                        Use Template
                    </Button>
                  </div>

                  <div className="absolute bottom-2 left-2 flex gap-2">
                     <span className="bg-black/60 text-white/80 text-[10px] px-2 py-0.5 rounded-full flex items-center backdrop-blur-sm">
                        <Clock className="w-3 h-3 mr-1" />
                        {Math.round(template.duration || 0)}s
                     </span>
                     <span className="bg-black/60 text-white/80 text-[10px] px-2 py-0.5 rounded-full flex items-center backdrop-blur-sm">
                        <Layers className="w-3 h-3 mr-1" />
                        {template.slots?.length || 0} slots
                     </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-white font-medium truncate mb-1">{template.title}</h3>
                  <p className="text-white/40 text-xs line-clamp-2 h-8">{template.description}</p>
                </div>
              </motion.div>
            ))}
            
            {/* Create New Card */}
            <div 
                onClick={() => navigate(createPageUrl("VideoEditor"))}
                className="aspect-[9/16] border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all group text-white/40 hover:text-white"
            >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
                    <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium">Create Blank</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}