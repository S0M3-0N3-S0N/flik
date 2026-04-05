import React, { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Trash2, Loader2, Image, Filter, SlidersHorizontal, Wand2, Type, Download, ZoomIn, Maximize2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  ImageInputNode,
  FilterNode,
  AdjustmentsNode,
  MagicBrushNode,
  TextGeneratorNode,
  GenerateNode,
  OutputNode,
} from "./flow/CustomNodes";

// Register custom node types
const nodeTypes = {
  imageInput: ImageInputNode,
  filter: FilterNode,
  adjustments: AdjustmentsNode,
  magicBrush: MagicBrushNode,
  textGenerator: TextGeneratorNode,
  generate: GenerateNode,
  output: OutputNode,
};

// Node palette definition
const NODE_PALETTE = [
  { type: "imageInput", label: "Image Input", icon: Image, color: "#FF6B35" },
  { type: "filter", label: "Filter", icon: Filter, color: "#9B59B6" },
  { type: "adjustments", label: "Adjustments", icon: SlidersHorizontal, color: "#4ECDC4" },
  { type: "generate", label: "AI Transform", icon: Sparkles, color: "#FF6B35" },
  { type: "magicBrush", label: "Magic Brush", icon: Wand2, color: "#F72C25" },
  { type: "textGenerator", label: "Text Gen", icon: Type, color: "#FFB800" },
  { type: "output", label: "Output", icon: Download, color: "#4ECDC4" },
];

// Default initial graph
function makeInitialNodes(imageUrl) {
  return [
    {
      id: "input-1",
      type: "imageInput",
      position: { x: 60, y: 150 },
      data: { imageUrl, status: "idle" },
    },
    {
      id: "output-1",
      type: "output",
      position: { x: 500, y: 150 },
      data: { status: "idle", resultUrl: null },
    },
  ];
}

const initialEdges = [];

// Topological sort
function topoSort(nodes, edges) {
  const adj = {};
  const indegree = {};
  nodes.forEach(n => { adj[n.id] = []; indegree[n.id] = 0; });
  edges.forEach(e => {
    if (adj[e.source]) {
      adj[e.source].push(e.target);
      indegree[e.target] = (indegree[e.target] || 0) + 1;
    }
  });
  const queue = nodes.filter(n => (indegree[n.id] || 0) === 0).map(n => n.id);
  const order = [];
  while (queue.length) {
    const cur = queue.shift();
    order.push(cur);
    (adj[cur] || []).forEach(next => {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    });
  }
  return order;
}

// CSS override for xyflow dark theme
const flowStyle = {
  background: "#0A0A0A",
};

let nodeIdCounter = 100;

export default function FlowEditor({ currentImage, onApplyResult }) {
  const imageUrl = currentImage?.preview || currentImage?.url || null;

  const [nodes, setNodes, onNodesChange] = useNodesState(makeInitialNodes(imageUrl));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Update node data helper
  const updateNodeData = useCallback((id, patch) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  // Keep imageInput nodes in sync with editor image
  React.useEffect(() => {
    setNodes(nds => nds.map(n =>
      n.type === "imageInput" ? { ...n, data: { ...n.data, imageUrl } } : n
    ));
  }, [imageUrl]);

  const onConnect = useCallback((params) => {
    // Prevent self-loops and duplicate edges
    if (params.source === params.target) return;
    const duplicate = edges.some(e => e.source === params.source && e.target === params.target);
    if (duplicate) return;
    setEdges(eds => addEdge({
      ...params,
      animated: true,
      style: { stroke: "#FF6B35", strokeWidth: 2 },
    }, eds));
  }, [edges, setEdges]);

  const addNode = useCallback((type) => {
    const id = `${type}-${++nodeIdCounter}`;
    const defaultData = {
      status: "idle",
      onChange: (patch) => updateNodeData(id, patch),
    };
    if (type === "imageInput") defaultData.imageUrl = imageUrl;
    if (type === "adjustments") { defaultData.brightness = 0; defaultData.contrast = 0; defaultData.saturation = 0; }
    if (type === "filter") defaultData.filter = "None";
    if (type === "generate") defaultData.tool = "Enhance";

    const viewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };
    const centerX = (reactFlowWrapper.current?.clientWidth / 2 - viewport.x) / viewport.zoom;
    const centerY = (reactFlowWrapper.current?.clientHeight / 2 - viewport.y) / viewport.zoom;

    setNodes(nds => [...nds, {
      id,
      type,
      position: { x: centerX - 100, y: centerY - 80 },
      data: defaultData,
    }]);
  }, [imageUrl, reactFlowInstance, setNodes, updateNodeData]);

  const deleteSelected = useCallback(() => {
    setNodes(nds => nds.filter(n => !n.selected || n.type === "imageInput" || n.type === "output"));
    setEdges(eds => eds.filter(e => !e.selected));
  }, [setNodes, setEdges]);

  // Apply per-node CSS filter style
  const applyFilterStyle = (filterName) => {
    const map = {
      Vintage: "sepia(0.5) contrast(1.1) brightness(0.9)",
      "B&W": "grayscale(1)",
      Sepia: "sepia(1)",
      Vibrant: "saturate(1.8) contrast(1.1)",
      Cool: "hue-rotate(180deg) saturate(1.2)",
      Warm: "sepia(0.3) saturate(1.3)",
      Dramatic: "contrast(1.4) saturate(0.8) brightness(0.85)",
    };
    return map[filterName] || "none";
  };

  // Run the flow
  const runFlow = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunError(null);

    const order = topoSort(nodes, edges);
    // Map: nodeId → current imageUrl in the pipeline
    const outputs = {};

    // Reset all statuses
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: "idle", previewUrl: undefined } })));

    for (const nodeId of order) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Find input imageUrl from predecessor
      const inEdge = edges.find(e => e.target === nodeId);
      const inputUrl = inEdge ? outputs[inEdge.source] : null;

      updateNodeData(nodeId, { status: "running" });
      await new Promise(r => setTimeout(r, 50)); // allow UI update

      try {
        if (node.type === "imageInput") {
          outputs[nodeId] = node.data.imageUrl;
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "filter") {
          // CSS filter — no API call, just pass through with preview
          outputs[nodeId] = inputUrl;
          updateNodeData(nodeId, { status: "done", previewUrl: inputUrl });

        } else if (node.type === "adjustments") {
          // Adjustments applied via CSS — pass through with preview
          outputs[nodeId] = inputUrl;
          updateNodeData(nodeId, { status: "done", previewUrl: inputUrl });

        } else if (node.type === "generate") {
          if (!inputUrl) throw new Error("No input image");
          const tool = node.data.tool || "Enhance";
          const prompts = {
            Enhance: "Professionally enhance this image: improve sharpness, lighting, colors, and overall quality. Make it look stunning.",
            Cinematic: "Apply a cinematic film look: dramatic lighting, deep colors, anamorphic lens flare, movie still aesthetic.",
            Cartoon: "Transform into vibrant cartoon/illustration style with bold outlines and saturated colors.",
            "Neon Glow": "Add glowing neon light effects, cyberpunk aesthetic, dark background with vivid neon accents.",
            "Oil Painting": "Transform into a masterful oil painting with visible brushstrokes and rich textures.",
            Anime: "Convert to anime/manga art style with clean lines and vibrant colors.",
            Sketch: "Convert to detailed pencil sketch with fine line art and shading.",
            HDR: "Apply HDR processing: rich details in highlights and shadows, vivid colors, high dynamic range look.",
          };
          const result = await base44.integrations.Core.GenerateImage({
            prompt: `${prompts[tool] || prompts.Enhance} Apply to the reference image provided.`,
            existing_image_urls: [inputUrl],
          });
          outputs[nodeId] = result.url;
          updateNodeData(nodeId, { status: "done", previewUrl: result.url });

        } else if (node.type === "magicBrush") {
          if (!inputUrl) throw new Error("No input image");
          const prompt = node.data.prompt?.trim();
          if (!prompt) throw new Error("Please enter a prompt");
          const result = await base44.integrations.Core.GenerateImage({
            prompt: `${prompt}. Apply this edit to the provided reference image while preserving overall composition.`,
            existing_image_urls: [inputUrl],
          });
          outputs[nodeId] = result.url;
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "textGenerator") {
          if (!inputUrl) throw new Error("No input image");
          const text = node.data.text?.trim() || "FLIK";
          const style = node.data.style?.trim() || "bold white text";
          const result = await base44.integrations.Core.GenerateImage({
            prompt: `Add the text "${text}" in ${style} style to this image. Keep the original image intact as the background.`,
            existing_image_urls: [inputUrl],
          });
          outputs[nodeId] = result.url;
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "output") {
          const finalUrl = inputUrl;
          outputs[nodeId] = finalUrl;
          const onApply = finalUrl ? () => onApplyResult?.(finalUrl) : undefined;
          updateNodeData(nodeId, { status: "done", resultUrl: finalUrl, onApply });
        }
      } catch (err) {
        updateNodeData(nodeId, { status: "error", error: err.message });
        setRunError(`Node "${node.type}" failed: ${err.message}`);
        setIsRunning(false);
        return;
      }
    }

    setIsRunning(false);
  }, [nodes, edges, isRunning, updateNodeData, onApplyResult]);

  if (!currentImage) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/30">
        <Sparkles className="w-10 h-10 mb-3" />
        <p className="text-sm font-medium">Upload an image to start</p>
        <p className="text-xs mt-1">Then build your AI pipeline</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -mx-4 -mb-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0 bg-[#0f0f0f]">
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {NODE_PALETTE.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              title={`Add ${label}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all flex-shrink-0"
            >
              <Icon className="w-3 h-3" style={{ color }} />
              <span className="text-[10px] text-white/60 hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <button
            onClick={deleteSelected}
            title="Delete selected"
            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={runFlow}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
          >
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {isRunning ? "Running..." : "Run Flow"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {runError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[10px] flex items-center justify-between"
          >
            {runError}
            <button onClick={() => setRunError(null)} className="ml-2 hover:text-red-300">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ReactFlow canvas */}
      <div ref={reactFlowWrapper} className="flex-1 min-h-0" style={{ height: "420px" }}>
        <style>{`
          .react-flow__attribution { display: none; }
          .react-flow__controls button { background: #1a1a1a !important; border-color: rgba(255,255,255,0.1) !important; color: white !important; }
          .react-flow__controls button:hover { background: #2a2a2a !important; }
          .react-flow__minimap { background: #111 !important; border: 1px solid rgba(255,255,255,0.05) !important; border-radius: 8px !important; }
        `}</style>
        <ReactFlow
          nodes={nodes.map(n => ({
            ...n,
            data: {
              ...n.data,
              onChange: (patch) => updateNodeData(n.id, patch),
              onApply: n.type === "output" && n.data.resultUrl
                ? () => onApplyResult?.(n.data.resultUrl)
                : undefined,
            },
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          style={flowStyle}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: "#FF6B35", strokeWidth: 2 },
          }}
          connectionLineStyle={{ stroke: "#FF6B35", strokeWidth: 2 }}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(255,255,255,0.08)"
          />
          <Controls
            className="!bottom-4 !left-4"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(n) => {
              const colors = { imageInput: "#FF6B35", filter: "#9B59B6", adjustments: "#4ECDC4", generate: "#FF6B35", magicBrush: "#F72C25", textGenerator: "#FFB800", output: "#4ECDC4" };
              return colors[n.type] || "#666";
            }}
            maskColor="rgba(0,0,0,0.7)"
            className="!bottom-4 !right-4"
          />
        </ReactFlow>
      </div>
    </div>
  );
}