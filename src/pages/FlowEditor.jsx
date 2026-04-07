import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant } from
"@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Trash2, Loader2, Image, Filter, SlidersHorizontal,
  Wand2, Type, Download, Sparkles, ArrowLeft, Upload, Grid3x3, CheckCircle2, X } from
"lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  ImageInputNode,
  FilterNode,
  AdjustmentsNode,
  MagicBrushNode,
  TextGeneratorNode,
  GenerateNode,
  OutputNode } from
"@/components/editor/flow/CustomNodes";
import GalleryPicker from "@/components/editor/GalleryPicker";

const nodeTypes = {
  imageInput: ImageInputNode,
  filter: FilterNode,
  adjustments: AdjustmentsNode,
  magicBrush: MagicBrushNode,
  textGenerator: TextGeneratorNode,
  generate: GenerateNode,
  output: OutputNode
};

const NODE_PALETTE = [
{ type: "imageInput", label: "Image Input", icon: Image, color: "#FF6B35" },
{ type: "filter", label: "Filter", icon: Filter, color: "#9B59B6" },
{ type: "adjustments", label: "Adjustments", icon: SlidersHorizontal, color: "#4ECDC4" },
{ type: "generate", label: "AI Transform", icon: Sparkles, color: "#FF6B35" },
{ type: "magicBrush", label: "Magic Brush", icon: Wand2, color: "#F72C25" },
{ type: "textGenerator", label: "Text Gen", icon: Type, color: "#FFB800" },
{ type: "output", label: "Output", icon: Download, color: "#4ECDC4" }];


function makeInitialNodes(imageUrl) {
  return [
  {
    id: "input-1",
    type: "imageInput",
    position: { x: 100, y: 200 },
    data: { imageUrl, status: "idle" }
  },
  {
    id: "output-1",
    type: "output",
    position: { x: 650, y: 200 },
    data: { status: "idle", resultUrl: null }
  }];

}

function topoSort(nodes, edges) {
  const adj = {};
  const indegree = {};
  nodes.forEach((n) => {adj[n.id] = [];indegree[n.id] = 0;});
  edges.forEach((e) => {
    if (adj[e.source]) {
      adj[e.source].push(e.target);
      indegree[e.target] = (indegree[e.target] || 0) + 1;
    }
  });
  const queue = nodes.filter((n) => (indegree[n.id] || 0) === 0).map((n) => n.id);
  const order = [];
  while (queue.length) {
    const cur = queue.shift();
    order.push(cur);
    (adj[cur] || []).forEach((next) => {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    });
  }
  return order;
}

let nodeIdCounter = 200;

export default function FlowEditorPage() {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const fileInputRef = useRef(null);

  const imageUrl = currentImage?.preview || currentImage?.url || null;

  const [nodes, setNodes, onNodesChange] = useNodesState(makeInitialNodes(null));
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const updateNodeData = useCallback((id, patch) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  React.useEffect(() => {
    setNodes((nds) => nds.map((n) =>
    n.type === "imageInput" ? { ...n, data: { ...n.data, imageUrls: imageUrl ? [imageUrl] : [] } } : n
    ));
  }, [imageUrl]);

  const onConnect = useCallback((params) => {
    if (params.source === params.target) return;
    const duplicate = edges.some((e) => e.source === params.source && e.target === params.target);
    if (duplicate) return;
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: "#FF6B35", strokeWidth: 2 }
    }, eds));
  }, [edges, setEdges]);

  const addNode = useCallback((type) => {
    const id = `${type}-${++nodeIdCounter}`;
    const defaultData = {
      status: "idle",
      onChange: (patch) => updateNodeData(id, patch)
    };
    if (type === "imageInput") defaultData.imageUrls = imageUrl ? [imageUrl] : [];
    if (type === "adjustments") {defaultData.brightness = 0;defaultData.contrast = 0;defaultData.saturation = 0;}
    if (type === "filter") defaultData.filter = "None";
    if (type === "generate") defaultData.tool = "Enhance";

    const viewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };
    const centerX = (reactFlowWrapper.current?.clientWidth / 2 - viewport.x) / viewport.zoom;
    const centerY = (reactFlowWrapper.current?.clientHeight / 2 - viewport.y) / viewport.zoom;

    setNodes((nds) => [...nds, {
      id, type,
      position: { x: centerX - 100, y: centerY - 80 },
      data: defaultData
    }]);
  }, [imageUrl, reactFlowInstance, setNodes, updateNodeData]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected || n.type === "imageInput" || n.type === "output"));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  const runFlow = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunError(null);
    setSavedResult(null);

    const order = topoSort(nodes, edges);
    const outputs = {};

    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: "idle", previewUrl: undefined } })));

    for (const nodeId of order) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const inEdge = edges.find((e) => e.target === nodeId);
      const inputUrl = inEdge ? outputs[inEdge.source] : null;

      updateNodeData(nodeId, { status: "running" });
      await new Promise((r) => setTimeout(r, 60));

      try {
        if (node.type === "imageInput") {
          const urls = node.data.imageUrls?.length ? node.data.imageUrls : node.data.imageUrl ? [node.data.imageUrl] : [];
          outputs[nodeId] = urls.length === 1 ? urls[0] : urls;
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "filter") {
          outputs[nodeId] = inputUrl;
          updateNodeData(nodeId, { status: "done", previewUrl: inputUrl });

        } else if (node.type === "adjustments") {
          outputs[nodeId] = inputUrl;
          updateNodeData(nodeId, { status: "done", previewUrl: inputUrl });

        } else if (node.type === "generate") {
          if (!inputUrl) throw new Error("No input image");
          const tool = node.data.tool || "Enhance";
          const prompts = {
            Enhance: "Professionally enhance this image: improve sharpness, lighting, colors, and overall quality.",
            Cinematic: "Apply a cinematic film look: dramatic lighting, deep colors, anamorphic lens flare, movie still aesthetic.",
            Cartoon: "Transform into vibrant cartoon/illustration style with bold outlines and saturated colors.",
            "Neon Glow": "Add glowing neon light effects, cyberpunk aesthetic, dark background with vivid neon accents.",
            "Oil Painting": "Transform into a masterful oil painting with visible brushstrokes and rich textures.",
            Anime: "Convert to anime/manga art style with clean lines and vibrant colors.",
            Sketch: "Convert to detailed pencil sketch with fine line art and shading.",
            HDR: "Apply HDR processing: rich details in highlights and shadows, vivid colors."
          };
          const result = await base44.integrations.Core.GenerateImage({
            prompt: `${prompts[tool] || prompts.Enhance} Apply to the reference image.`,
            existing_image_urls: [inputUrl]
          });
          outputs[nodeId] = result.url;
          updateNodeData(nodeId, { status: "done", previewUrl: result.url });

        } else if (node.type === "magicBrush") {
          if (!inputUrl) throw new Error("No input image");
          const prompt = node.data.prompt?.trim();
          if (!prompt) throw new Error("Please enter a prompt");
          const result = await base44.integrations.Core.GenerateImage({
            prompt: `${prompt}. Apply to the reference image while preserving overall composition.`,
            existing_image_urls: [inputUrl]
          });
          outputs[nodeId] = result.url;
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "textGenerator") {
          if (!inputUrl) throw new Error("No input image");
          const text = node.data.text?.trim() || "FLIK";
          const style = node.data.style?.trim() || "bold white text";
          const result = await base44.integrations.Core.GenerateImage({
            prompt: `Add the text "${text}" in ${style} style to this image. Keep the original image as the background.`,
            existing_image_urls: [inputUrl]
          });
          outputs[nodeId] = result.url;
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "output") {
          const finalUrl = inputUrl;
          outputs[nodeId] = finalUrl;
          updateNodeData(nodeId, {
            status: "done",
            resultUrl: finalUrl,
            onApply: finalUrl ? () => handleSaveResult(finalUrl) : undefined
          });
        }
      } catch (err) {
        updateNodeData(nodeId, { status: "error", error: err.message });
        setRunError(`"${node.type}" failed: ${err.message}`);
        setIsRunning(false);
        return;
      }
    }

    setIsRunning(false);
  }, [nodes, edges, isRunning, updateNodeData]);

  const handleSaveResult = useCallback(async (url) => {
    try {
      await base44.entities.Creation.create({
        title: `Flow Result (${new Date().toLocaleString()})`,
        type: 'image', url, thumbnail_url: url
      });
      setSavedResult(url);
    } catch (e) {
      console.error("Failed to save", e);
    }
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCurrentImage({ url: ev.target.result, preview: ev.target.result, name: file.name });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGallerySelect = useCallback((image) => {
    const img = Array.isArray(image) ? image[0] : image;
    if (img) {
      setCurrentImage({ url: img.url || img.thumbnail_url, preview: img.url || img.thumbnail_url, name: 'gallery_image.png' });
    }
    setIsGalleryOpen(false);
  }, []);

  const resetFlow = useCallback(() => {
    setNodes(makeInitialNodes(imageUrl));
    setEdges([]);
    setRunError(null);
    setSavedResult(null);
  }, [imageUrl, setNodes, setEdges]);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0A0A0A] overflow-hidden">
      <style>{`
        .react-flow__attribution { display: none; }
        .react-flow__controls button { background: #1a1a1a !important; border-color: rgba(255,255,255,0.1) !important; color: white !important; }
        .react-flow__controls button:hover { background: #2a2a2a !important; }
        .react-flow__minimap { background: #111 !important; border: 1px solid rgba(255,255,255,0.05) !important; border-radius: 8px !important; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0f0f0f] flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(createPageUrl("Editor"))}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all text-sm">
            
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Photo Studio</span>
          </button>
          <div className="flex items-center gap-2">
            

            
            <span className="text-white font-semibold text-sm">Flow Editor</span>
            <span className="text-white/30 text-xs hidden md:inline">Build AI pipelines</span>
          </div>
        </div>

        {/* Image Source Controls */}
        


























        
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {NODE_PALETTE.map(({ type, label, icon: Icon, color }) =>
          <button
            key={type}
            onClick={() => addNode(type)}
            title={`Add ${label}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all flex-shrink-0">
            
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-[11px] text-white/60 hidden sm:inline">{label}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <button
            onClick={resetFlow}
            title="Reset flow"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/5 transition-all text-xs">
            
            Reset
          </button>
          <button
            onClick={deleteSelected}
            title="Delete selected"
            className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-all">
            
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={runFlow}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
            
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Running..." : "Run Flow"}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {runError &&
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center justify-between flex-shrink-0">
          
            <span>{runError}</span>
            <button onClick={() => setRunError(null)} className="ml-2 hover:text-red-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        }
      </AnimatePresence>

      {/* Save Success Banner */}
      <AnimatePresence>
        {savedResult &&
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="px-4 py-2 bg-green-500/10 border-b border-green-500/20 text-green-400 text-xs flex items-center justify-between flex-shrink-0">
          
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Result saved to gallery!</span>
            </div>
            <button onClick={() => setSavedResult(null)}><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        }
      </AnimatePresence>

      {/* No Image State */}
      {!currentImage &&
      <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none" style={{ top: '104px' }}>
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/30 text-base font-medium">Upload an image to start</p>
          <p className="text-white/20 text-sm mt-1">Then connect nodes to build your AI pipeline</p>
        </div>
      }

      {/* ReactFlow Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              onChange: (patch) => updateNodeData(n.id, patch),
              onApply: n.type === "output" && n.data.resultUrl ?
              () => handleSaveResult(n.data.resultUrl) :
              undefined
            }
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          style={{ background: "#0A0A0A" }}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: "#FF6B35", strokeWidth: 2 }
          }}
          connectionLineStyle={{ stroke: "#FF6B35", strokeWidth: 2 }}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}>
          
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(255,255,255,0.07)" />
          
          <Controls className="!bottom-6 !left-6" showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const colors = { imageInput: "#FF6B35", filter: "#9B59B6", adjustments: "#4ECDC4", generate: "#FF6B35", magicBrush: "#F72C25", textGenerator: "#FFB800", output: "#4ECDC4" };
              return colors[n.type] || "#666";
            }}
            maskColor="rgba(0,0,0,0.75)"
            className="!bottom-6 !right-6" />
          
        </ReactFlow>
      </div>

      <GalleryPicker
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelect={handleGallerySelect} />
      
    </div>);

}