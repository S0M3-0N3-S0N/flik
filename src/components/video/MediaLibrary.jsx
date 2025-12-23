import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Upload, Plus, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MediaLibrary({ onAddClip }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: creations = [], refetch } = useQuery({
    queryKey: ['creations', user?.email],
    queryFn: () => user ? base44.entities.Creation.filter({ created_by: user.email }, '-created_date', 50) : [],
    enabled: !!user,
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const type = file.type.startsWith('video') ? 'video' : 'image';
      
      // Create a creation record so it appears in library
      await base44.entities.Creation.create({
        title: file.name,
        type: type,
        url: file_url,
        thumbnail_url: file_url, // For video we ideally want a thumb, but for now use url
        prompt: "Uploaded media"
      });
      
      await refetch();
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/5">
        <Button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20 border border-[#FF6B35]/20 border-dashed"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Import Media
        </Button>
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*,video/*" 
          onChange={handleUpload} 
          className="hidden" 
        />
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3">
          {creations.map((item) => (
            <div 
              key={item.id} 
              className="group relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/5 hover:border-[#FF6B35]/50 transition-colors cursor-pointer"
              onClick={() => onAddClip(item)}
            >
              {item.type === 'video' ? (
                <video src={item.url} className="w-full h-full object-cover" />
              ) : (
                <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              
              <div className="absolute bottom-1 right-1">
                {item.type === 'video' ? (
                   <Video className="w-3 h-3 text-white/70" />
                ) : (
                   <ImageIcon className="w-3 h-3 text-white/70" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}