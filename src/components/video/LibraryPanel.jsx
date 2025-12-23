import React from 'react';
import { Upload, Plus, Video, Type, Music, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LibraryPanel({
  tracks,
  handleFileUpload,
  handleAudioUpload,
  handleAddTextClip,
  handleDeleteClip
}) {
  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] border-r border-white/10">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white">Library</h2>
      </div>

      <Tabs defaultValue="media" className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
            <TabsList className="grid grid-cols-2 bg-white/5 p-1 rounded-lg w-full">
            <TabsTrigger value="media" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-xs">Media</TabsTrigger>
            <TabsTrigger value="text" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-xs">Text</TabsTrigger>
            </TabsList>
        </div>

        <ScrollArea className="flex-1 p-4">
          <TabsContent value="media" className="mt-0 space-y-6">
            {/* Import Section */}
            <div>
              <label className="block cursor-pointer group">
                <div className="border border-dashed border-white/20 rounded-lg p-8 hover:bg-white/5 hover:border-[#FF6B35]/50 transition-all flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#FF6B35]/20 group-hover:text-[#FF6B35] transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">Import Media</p>
                    <p className="text-xs text-white/40">Drag & drop or click</p>
                  </div>
                </div>
                <input type="file" accept="video/*,image/*" onChange={handleFileUpload} className="hidden" multiple />
              </label>

              <div className="mt-4">
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5 hover:border-white/10 transition-colors">
                    <Music className="w-4 h-4 text-[#FFB800]" />
                    <div className="flex-1">
                        <p className="text-xs font-medium text-white">Import Audio</p>
                    </div>
                    <Plus className="w-4 h-4 text-white/40" />
                    <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                  </label>
              </div>
            </div>

            {/* Assets List */}
            <div>
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Project Assets</h3>
              <div className="grid grid-cols-2 gap-2">
                {tracks.find(t => t.type === 'video')?.clips.map((clip) => (
                  <div key={clip.id} className="group relative aspect-video bg-black/40 rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all">
                    <video src={clip.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                            size="icon" 
                            variant="destructive" 
                            className="h-8 w-8 rounded-full"
                            onClick={() => handleDeleteClip('video', clip.id)}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[10px] text-white truncate">{clip.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-0">
            <div className="grid gap-3">
                <Button 
                    onClick={handleAddTextClip} 
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#FF6B35]/50 text-white"
                >
                    <Type className="w-6 h-6 text-[#FF6B35]" />
                    <span>Add Default Text</span>
                </Button>
                {/* Future: Add text presets here */}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}