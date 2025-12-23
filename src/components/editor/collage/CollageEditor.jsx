import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Image as ImageIcon, 
  Type, 
  Download, 
  X, 
  Plus, 
  Save, 
  Smile, 
  ArrowUp, 
  ArrowDown, 
  Monitor,
  Layout
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CollageLayer from './CollageLayer';
import html2canvas from 'html2canvas';
import { base44 } from "@/api/base44Client";

export default function CollageEditor({ batchImages, onClose }) {
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [activeTab, setActiveTab] = useState('images');
  const [isSaving, setIsSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const canvasRef = useRef(null);
  
  // Stickers
  const stickers = ["🔥", "✨", "❤️", "🎨", "🌟", "💡", "🎉", "👏", "🌈", "⚡", "🍀", "🌺"];

  const addLayer = (type, content) => {
    const newLayer = {
      id: Date.now().toString(),
      type,
      content,
      x: 100 + layers.length * 20,
      y: 100 + layers.length * 20,
      width: type === 'text' ? 300 : 200,
      height: type === 'text' ? 100 : 200,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex: layers.length + 1,
      color: type === 'text' ? '#ffffff' : null,
      fontFamily: 'sans-serif'
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const updateLayer = (id, updates) => {
    setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const removeLayer = (id) => {
    setLayers(layers.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const duplicateLayer = (id) => {
    const layerToDup = layers.find(l => l.id === id);
    if (layerToDup) {
      const newLayer = {
        ...layerToDup,
        id: Date.now().toString(),
        x: layerToDup.x + 20,
        y: layerToDup.y + 20,
        zIndex: layers.length + 1
      };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newLayer.id);
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current || layers.length === 0) return;
    setIsSaving(true);
    setSelectedLayerId(null); // Deselect to hide handles

    try {
      // Wait for UI to update (hide handles)
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        scale: 2, // High quality
        backgroundColor: backgroundColor
      });

      canvas.toBlob(async (blob) => {
        const file = new File([blob], `collage_${Date.now()}.png`, { type: 'image/png' });
        
        // Upload to storage
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        
        // Save to DB
        await base44.entities.Creation.create({
          title: 'My Collage',
          type: 'image',
          url: uploadResult.file_url,
          thumbnail_url: uploadResult.file_url,
          prompt: 'Manual Collage',
          metadata: { type: 'collage', layerCount: layers.length }
        });

        alert("Collage saved successfully!");
        onClose(); // Optional: close or stay
      }, 'image/png');

    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to save collage.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="flex h-[80vh] bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* Sidebar */}
      <div className="w-80 bg-[#141414] border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Layout className="w-4 h-4 text-[#FF6B35]" />
            Collage Maker
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 bg-transparent border-b border-white/10 rounded-none h-12 p-0">
            <TabsTrigger value="images" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-white/5 h-full">
              <ImageIcon className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="text" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-white/5 h-full">
              <Type className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="stickers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-white/5 h-full">
              <Smile className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="layers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B35] data-[state=active]:bg-white/5 h-full">
              <Layers className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="images" className="mt-0 space-y-4">
              <p className="text-xs text-white/50 mb-2">Drag or click to add from batch</p>
              <div className="grid grid-cols-2 gap-2">
                {batchImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => addLayer('image', img.preview || img.url)}
                    className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-[#FF6B35] transition-all group relative"
                  >
                    <img src={img.preview || img.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                  </button>
                ))}
                {batchImages.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-white/30 text-sm">
                    No images in batch. Upload some first!
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-0 space-y-4">
              <Button onClick={() => addLayer('text', 'Double Click to Edit')} className="w-full btn-gradient text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Text Box
              </Button>
              {selectedLayer?.type === 'text' && (
                 <div className="space-y-4 mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                   <div className="space-y-2">
                     <label className="text-xs text-white/50">Content</label>
                     <Input 
                       value={selectedLayer.content} 
                       onChange={(e) => updateLayer(selectedLayer.id, { content: e.target.value })}
                       className="bg-black/20"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs text-white/50">Color</label>
                     <input 
                       type="color" 
                       value={selectedLayer.color}
                       onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                       className="w-full h-8 rounded cursor-pointer"
                     />
                   </div>
                 </div>
              )}
            </TabsContent>

            <TabsContent value="stickers" className="mt-0">
              <div className="grid grid-cols-4 gap-2">
                {stickers.map((sticker, idx) => (
                  <button
                    key={idx}
                    onClick={() => addLayer('sticker', sticker)}
                    className="aspect-square flex items-center justify-center text-2xl bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="layers" className="mt-0 space-y-2">
              {layers.slice().reverse().map((layer) => (
                <div 
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`p-2 rounded-lg flex items-center justify-between border ${
                    selectedLayerId === layer.id ? 'bg-[#FF6B35]/20 border-[#FF6B35]' : 'bg-white/5 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {layer.type === 'image' && <ImageIcon className="w-3 h-3 flex-shrink-0" />}
                    {layer.type === 'text' && <Type className="w-3 h-3 flex-shrink-0" />}
                    {layer.type === 'sticker' && <Smile className="w-3 h-3 flex-shrink-0" />}
                    <span className="text-xs truncate text-white/80">
                      {layer.type === 'image' ? 'Image Layer' : layer.content}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { zIndex: layer.zIndex + 1 }); }}
                      className="p-1 hover:bg-white/10 rounded" title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3 text-white/50" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { zIndex: layer.zIndex - 1 }); }}
                      className="p-1 hover:bg-white/10 rounded" title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3 text-white/50" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                      className="p-1 hover:bg-white/10 rounded hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {layers.length === 0 && <p className="text-center text-xs text-white/30 py-4">No layers yet</p>}
            </TabsContent>
          </div>

          {selectedLayer && (
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Layer Properties</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Opacity</span>
                    <span>{Math.round(selectedLayer.opacity * 100)}%</span>
                  </div>
                  <Slider 
                    value={[selectedLayer.opacity]} 
                    min={0} max={1} step={0.01}
                    onValueChange={([val]) => updateLayer(selectedLayer.id, { opacity: val })}
                  />
                </div>
              </div>
            </div>
          )}
        </Tabs>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col bg-[#0A0A0A] relative overflow-hidden">
        {/* Toolbar */}
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-[#141414]">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
               <span className="text-xs text-white/50">Canvas Color:</span>
               <input 
                 type="color" 
                 value={backgroundColor}
                 onChange={(e) => setBackgroundColor(e.target.value)}
                 className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
               />
             </div>
             <div className="w-px h-4 bg-white/10" />
             <div className="text-xs text-white/50">
               {layers.length} Layers
             </div>
          </div>
          
          <Button 
            onClick={handleExport}
            disabled={isSaving || layers.length === 0}
            className="btn-gradient text-white h-8 text-xs"
          >
            {isSaving ? "Saving..." : "Save Collage"}
            <Save className="w-3 h-3 ml-2" />
          </Button>
        </div>

        {/* Canvas Scrollable Container */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
          <div 
            ref={canvasRef}
            className="relative bg-black shadow-2xl transition-all duration-300"
            style={{ 
              width: canvasSize.width, 
              height: canvasSize.height,
              backgroundColor: backgroundColor,
              backgroundImage: backgroundColor === 'transparent' ? 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)' : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
            onClick={() => setSelectedLayerId(null)}
          >
            {layers.map(layer => (
              <CollageLayer 
                key={layer.id} 
                layer={layer} 
                isSelected={selectedLayerId === layer.id}
                onSelect={setSelectedLayerId}
                onChange={updateLayer}
                onRemove={removeLayer}
                onDuplicate={duplicateLayer}
              />
            ))}
            
            {layers.length === 0 && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center opacity-20">
                   <Layout className="w-16 h-16 text-white mx-auto mb-2" />
                   <p className="text-white text-lg">Add layers to start creating</p>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}