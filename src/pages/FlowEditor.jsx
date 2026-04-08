import React, { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  BackgroundVariant,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Trash2, Loader2, Image, Wand2, Download, Sparkles,
  FileText, ArrowLeft, RotateCcw, X, CheckCircle2, Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  ImageInputNode, MagicBrushNode, ImagineAINode, BlankNode, OutputNode
} from "@/components/editor/flow/CustomNodes";
import GalleryPicker from "@/components/editor/GalleryPicker";

// ── Node type registry ────────────────────────────────────────────
const nodeTypes = {
  imageInput: ImageInputNode,
  magicBrush: MagicBrushNode,
  imagineAI: ImagineAINode,
  blank: BlankNode,
  output: OutputNode,
};

// ── Palette ───────────────────────────────────────────────────────
const PALETTE = [
  { type: "imageInput", label: "Image Input", icon: Image, color: "#FF6B35", desc: "Load images into the flow" },
  { type: "magicBrush", label: "Magic Brush", icon: Wand2, color: "#F72C25", desc: "Edit with AI + prompt" },
  { type: "imagineAI", label: "Imagine AI", icon: Sparkles, color: "#FFB800", desc: "Generate visuals from text" },
  { type: "output", label: "Output", icon: Download, color: "#4ECDC4", desc: "View & save result" },
  { type: "blank", label: "Note", icon: FileText, color: "#888888", desc: "Add a note or label" },
];

// ── Edge defaults ─────────────────────────────────────────────────
const EDGE_DEFAULTS = {
  animated: true,
  style: { stroke: "rgba(255,107,53,0.6)", strokeWidth: 2 },
};

// ── Topo sort ─────────────────────────────────────────────────────
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
    (adj[cur] || []).forEach(next => { indegree[next]--; if (indegree[next] === 0) queue.push(next); });
  }
  return order;
}

// ── Initial graph ─────────────────────────────────────────────────
const INITIAL_NODES = [
  { id: "input-1", type: "imageInput", position: { x: 80, y: 200 }, data: { imageUrls: [], status: "idle" } },
  { id: "imagine-1", type: "imagineAI", position: { x: 380, y: 200 }, data: { prompt: "", style: "None", status: "idle" } },
  { id: "output-1", type: "output", position: { x: 680, y: 200 }, data: { status: "idle", resultUrl: null } },
];
const INITIAL_EDGES = [
  { id: "e1", source: "input-1", target: "imagine-1", ...EDGE_DEFAULTS },
  { id: "e2", source: "imagine-1", target: "output-1", ...EDGE_DEFAULTS },
];

let nodeCounter = 100;

// ── Style presets for ImagineAI ───────────────────────────────────
const STYLE_PROMPTS = {
  "None": "",
  "Cinematic": "cinematic film look, dramatic lighting, deep colors, anamorphic lens flare, movie still aesthetic",
  "Anime": "anime art style, clean lines, vibrant colors, manga aesthetic",
  "Oil Painting": "oil painting style, visible brushstrokes, rich textures, classical art",
  "Neon Glow": "neon glow effects, cyberpunk aesthetic, dark background with vivid neon accents",
  "Sketch": "detailed pencil sketch, fine line art, shading",
  "HDR": "HDR processing, rich details in highlights and shadows, vivid colors",
  "Cartoon": "vibrant cartoon illustration style, bold outlines, saturated colors",
};

// ── Main component (inner, needs ReactFlowProvider) ───────────────
function FlowEditorInner() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [savedOk, setSavedOk] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTargetId, setGalleryTargetId] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);
  const wrapperRef = useRef(null);

  // ── Node data updater ───────────────────────────────────────────
  const updateNodeData = useCallback((id, patch) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  // ── Build data map for a node (collects from all upstream nodes) ─
  const buildNodeProps = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return {};
    return {
      onChange: (patch) => updateNodeData(nodeId, patch),
      onGalleryOpen: node.type === "imageInput"
        ? () => { setGalleryTargetId(nodeId); setIsGalleryOpen(true); }
        : undefined,
    };
  }, [nodes, updateNodeData]);

  // ── Connection handler ──────────────────────────────────────────
  const onConnect = useCallback((params) => {
    if (params.source === params.target) return;
    const dup = edges.some(e => e.source === params.source && e.target === params.target);
    if (dup) return;
    setEdges(eds => addEdge({ ...params, ...EDGE_DEFAULTS }, eds));
  }, [edges, setEdges]);

  // ── Add node ────────────────────────────────────────────────────
  const addNode = useCallback((type) => {
    const id = `${type}-${++nodeCounter}`;
    const viewport = rfInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };
    const cx = (wrapperRef.current?.clientWidth / 2 - viewport.x) / viewport.zoom;
    const cy = (wrapperRef.current?.clientHeight / 2 - viewport.y) / viewport.zoom;
    const defaultData = { status: "idle" };
    if (type === "imageInput") defaultData.imageUrls = [];
    if (type === "imagineAI") { defaultData.prompt = ""; defaultData.style = "None"; }
    if (type === "output") defaultData.resultUrl = null;
    if (type === "blank") defaultData.text = "";
    setNodes(nds => [...nds, { id, type, position: { x: cx - 110, y: cy - 80 }, data: defaultData }]);
  }, [rfInstance, setNodes]);

  // ── Reset ───────────────────────────────────────────────────────
  const resetFlow = useCallback(() => {
    setNodes(INITIAL_NODES.map(n => ({ ...n, data: { ...n.data } })));
    setEdges(INITIAL_EDGES.map(e => ({ ...e })));
    setRunError(null);
    setSavedOk(false);
  }, [setNodes, setEdges]);

  // ── Save result ─────────────────────────────────────────────────
  const handleSave = useCallback(async (url) => {
    await base44.entities.Creation.create({
      title: `Flow Result (${new Date().toLocaleString()})`,
      type: "image", url, thumbnail_url: url,
    });
    setSavedOk(true);
  }, []);

  // ── Run flow ────────────────────────────────────────────────────
  // Collect ALL image URLs from all upstream nodes recursively
  const collectAllRefs = useCallback((nodeId, outputs, visited = new Set()) => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    const inEdges = edges.filter(e => e.target === nodeId);
    let refs = [];
    for (const e of inEdges) {
      const up = outputs[e.source];
      if (up) {
        if (up.imageUrls) refs.push(...up.imageUrls);
        if (up.imageUrl) refs.push(up.imageUrl);
      }
      refs.push(...collectAllRefs(e.source, outputs, visited));
    }
    return [...new Set(refs.filter(Boolean))];
  }, [edges]);

  const runFlow = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunError(null);
    setSavedOk(false);

    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: "idle", resultUrl: undefined, resultPreview: undefined, allRefs: undefined, error: undefined } })));

    const order = topoSort(nodes, edges);
    const outputs = {};

    for (const nodeId of order) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const inEdges = edges.filter(e => e.target === nodeId);
      const upstreamData = inEdges.reduce((acc, e) => {
        const up = outputs[e.source];
        if (up) Object.assign(acc, up);
        return acc;
      }, {});
      const inputUrl = upstreamData.imageUrl || null;

      // Collect ALL image refs from all connected upstream nodes
      const allRefs = collectAllRefs(nodeId, outputs);

      updateNodeData(nodeId, { status: "running", allRefs });
      await new Promise(r => setTimeout(r, 80));

      try {
        if (node.type === "imageInput") {
          const urls = node.data.imageUrls || [];
          outputs[nodeId] = { imageUrl: urls[0] || null, imageUrls: urls };
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "blank") {
          outputs[nodeId] = upstreamData;
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "magicBrush") {
          if (!inputUrl) throw new Error("Magic Brush needs a connected image input");
          const prompt = node.data.prompt?.trim();
          if (!prompt) throw new Error("Please enter a prompt for Magic Brush");
          const result = await base44.integrations.Core.GenerateImage({
            prompt: `${prompt}. Apply to the reference image while preserving overall composition.`,
            existing_image_urls: allRefs.length > 0 ? allRefs : [inputUrl],
          });
          outputs[nodeId] = { imageUrl: result.url };
          updateNodeData(nodeId, { status: "done" });

        } else if (node.type === "imagineAI") {
          const prompt = node.data.prompt?.trim();
          if (!prompt) throw new Error("Please enter a prompt for Imagine AI");
          const styleExtra = STYLE_PROMPTS[node.data.style || "None"];
          const fullPrompt = styleExtra ? `${prompt}. Style: ${styleExtra}.` : prompt;
          const genOpts = { prompt: fullPrompt };
          const refs = allRefs.length > 0 ? allRefs : (inputUrl ? [inputUrl] : null);
          if (refs) genOpts.existing_image_urls = refs;
          const result = await base44.integrations.Core.GenerateImage(genOpts);
          outputs[nodeId] = { imageUrl: result.url };
          updateNodeData(nodeId, { status: "done", resultPreview: result.url });

        } else if (node.type === "output") {
          const finalUrl = inputUrl;
          const allOutputRefs = allRefs;
          outputs[nodeId] = { imageUrl: finalUrl };
          updateNodeData(nodeId, {
            status: finalUrl ? "done" : "error",
            resultUrl: finalUrl,
            allRefs: allOutputRefs,
            error: finalUrl ? undefined : "No image received from upstream",
          });
        }
      } catch (err) {
        updateNodeData(nodeId, { status: "error", error: err.message });
        setRunError(`Node "${node.type}" failed: ${err.message}`);
        setIsRunning(false);
        return;
      }
    }

    setIsRunning(false);
  }, [nodes, edges, isRunning, updateNodeData, collectAllRefs]);

  // ── Gallery select ──────────────────────────────────────────────
  const handleGallerySelect = useCallback((image) => {
    if (galleryTargetId) {
      const imgs = Array.isArray(image) ? image : [image];
      const newUrls = imgs.map(i => i.url || i.thumbnail_url).filter(Boolean);
      setNodes(nds => nds.map(n => {
        if (n.id !== galleryTargetId) return n;
        return { ...n, data: { ...n.data, imageUrls: [...(n.data.imageUrls || []), ...newUrls] } };
      }));
      setGalleryTargetId(null);
    }
    setIsGalleryOpen(false);
  }, [galleryTargetId, setNodes]);

  // ── Inject callbacks into node data ────────────────────────────
  const enrichedNodes = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onChange: (patch) => updateNodeData(n.id, patch),
      onGalleryOpen: n.type === "imageInput"
        ? () => { setGalleryTargetId(n.id); setIsGalleryOpen(true); }
        : undefined,
      onSave: n.type === "output" && n.data.resultUrl
        ? () => handleSave(n.data.resultUrl)
        : undefined,
    },
  }));

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0A0A0A]">
      <style>{`
        .react-flow__attribution { display: none !important; }
        .react-flow__controls { background: #111 !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 12px !important; overflow: hidden; }
        .react-flow__controls-button { background: #111 !important; border-color: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.5) !important; }
        .react-flow__controls-button:hover { background: #1a1a1a !important; color: white !important; }
        .react-flow__minimap { background: #111 !important; border: 1px solid rgba(255,255,255,0.06) !important; border-radius: 12px !important; }
        .react-flow__edge-path { stroke: rgba(255,107,53,0.6) !important; }
        .react-flow__edge.selected .react-flow__edge-path { stroke: #FF6B35 !important; }
        .react-flow__connection-line { stroke: rgba(255,107,53,0.5) !important; }
      `}</style>

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-white/5 flex items-center justify-between px-4 py-3" style={{ background: "#0f0f0f" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl("Editor"))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Photo Studio</span>
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div>
            <h1 className="text-sm font-bold text-white">Flow Editor</h1>
            <p className="text-[10px] text-white/30 hidden sm:block">Build AI image pipelines</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={resetFlow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all text-xs">
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button onClick={runFlow} disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #FF6B35, #F72C25)" }}>
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Running..." : "Run Flow"}
          </button>
        </div>
      </header>

      {/* ── Banners ── */}
      <AnimatePresence>
        {runError && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-shrink-0 flex items-center justify-between px-4 py-2 text-red-400 text-xs border-b border-red-500/20"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            <span>⚠ {runError}</span>
            <button onClick={() => setRunError(null)}><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
        {savedOk && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-shrink-0 flex items-center justify-between px-4 py-2 text-green-400 text-xs border-b border-green-500/20"
            style={{ background: "rgba(74,222,128,0.08)" }}>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Saved to gallery!</div>
            <button onClick={() => setSavedOk(false)}><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-h-0">
        {/* ── Left palette ── */}
        <aside className="flex-shrink-0 w-52 border-r border-white/5 flex flex-col gap-1 p-3 overflow-y-auto hidden md:flex" style={{ background: "#0c0c0c" }}>
          <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest px-1 mb-1">Add Node</p>
          {PALETTE.map(({ type, label, icon: Icon, color, desc }) => (
            <button key={type} onClick={() => addNode(type)}
              className="group flex items-start gap-2.5 p-2.5 rounded-xl border border-white/5 hover:border-white/12 text-left transition-all hover:scale-[1.01]"
              style={{ background: "rgba(255,255,255,0.025)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}20` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-white/75 group-hover:text-white transition-colors">{label}</p>
                <p className="text-[9px] text-white/30 leading-tight">{desc}</p>
              </div>
            </button>
          ))}

          <div className="mt-auto pt-3 border-t border-white/5">
            <p className="text-[9px] text-white/20 leading-relaxed px-1">
              Connect nodes by dragging from a handle. Delete edges by selecting and pressing Backspace.
            </p>
          </div>
        </aside>

        {/* ── Mobile palette bar ── */}
        <div className="md:hidden absolute bottom-16 left-0 right-0 z-20 flex items-center gap-1.5 px-3 py-2 border-t border-white/5 overflow-x-auto" style={{ background: "#0c0c0c" }}>
          {PALETTE.map(({ type, label, icon: Icon, color }) => (
            <button key={type} onClick={() => addNode(type)}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-white/8 text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-[9px] text-white/50">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Canvas ── */}
        <div ref={wrapperRef} className="flex-1 min-w-0 min-h-0">
          <ReactFlow
            nodes={enrichedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={EDGE_DEFAULTS}
            connectionLineStyle={{ stroke: "rgba(255,107,53,0.5)", strokeWidth: 2 }}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: "#0A0A0A" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.06)" />
            <Controls className="!bottom-6 !left-6" showInteractive={false} />
          </ReactFlow>
        </div>
      </div>

      <GalleryPicker isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} onSelect={handleGallerySelect} />
    </div>
  );
}

export default function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
}