import React, { useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import { Image, Filter, SlidersHorizontal, Wand2, Type, Download, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

const STATUS_ICON = {
  idle: <Clock className="w-3 h-3 text-white/30" />,
  running: <Loader2 className="w-3 h-3 text-[#FFB800] animate-spin" />,
  done: <CheckCircle2 className="w-3 h-3 text-green-400" />,
  error: <AlertCircle className="w-3 h-3 text-red-400" />
};

const STATUS_RING = {
  idle: "border-white/10",
  running: "border-[#FFB800]/60 shadow-[0_0_12px_rgba(255,184,0,0.3)]",
  done: "border-green-500/60 shadow-[0_0_12px_rgba(74,222,128,0.2)]",
  error: "border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
};

function NodeWrapper({ children, selected, status = "idle", hasInput = true, hasOutput = true, accentColor = "#FF6B35" }) {
  return (
    <div className="bg-[#0d0d0d] rounded-2xl relative border transition-all duration-200 min-w-[180px] border-white/10">
      {hasInput &&
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !border-2 !bg-[#0A0A0A] transition-all"
        style={{ borderColor: accentColor }} />

      }
      {children}
      {hasOutput &&
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !border-2 !bg-[#0A0A0A] transition-all"
        style={{ borderColor: accentColor }} />

      }
      {/* Status badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {STATUS_ICON[status]}
      </div>
    </div>);

}

function NodeHeader({ icon: Icon, label, color }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-white/5">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}25` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-xs font-semibold text-white/80 truncate">{label}</span>
    </div>);

}

// ── Image Input Node ──────────────────────────────────────────────
export function ImageInputNode({ data, selected }) {
  const fileInputRef = useRef(null);
  const imageUrls = data.imageUrls || (data.imageUrl ? [data.imageUrl] : []);

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newUrls = [...imageUrls, ev.target.result];
        data.onChange?.({ imageUrls: newUrls });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (idx) => {
    const newUrls = imageUrls.filter((_, i) => i !== idx);
    data.onChange?.({ imageUrls: newUrls });
  };

  return (
    <NodeWrapper selected={selected} status={data.status} hasInput={false} accentColor="#FF6B35">
      <NodeHeader icon={Image} label="Image Input" color="#FF6B35" />
      <div className="p-3 min-w-[180px]">
        {imageUrls.length > 0 ?
        <div className="grid grid-cols-2 gap-1.5 mb-2">
            {imageUrls.map((url, idx) =>
          <div key={idx} className="relative group">
                <img src={url} alt={`Input ${idx + 1}`} className="w-full h-16 object-cover rounded-lg" />
                <button
              onClick={() => handleRemove(idx)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white/70 hover:text-red-400 text-[10px] flex items-center justify-center nodrag opacity-0 group-hover:opacity-100 transition-opacity">
              
                  ✕
                </button>
              </div>
          )}
          </div> :

        <div className="w-full h-16 rounded-xl bg-[#1a1a1a] border border-dashed border-white/10 flex items-center justify-center mb-2">
            <span className="text-[10px] text-white/30">No images</span>
          </div>
        }
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full text-[10px] bg-[#FF6B35]/15 hover:bg-[#FF6B35]/25 border border-[#FF6B35]/30 text-[#FF6B35] rounded-lg py-1 nodrag transition-colors">
          
          + Add Image{imageUrls.length > 0 ? 's' : ''}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
        {imageUrls.length > 0 &&
        <p className="text-[10px] text-white/30 mt-1.5 text-center">{imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''}</p>
        }
      </div>
    </NodeWrapper>);

}

// ── Filter Node ───────────────────────────────────────────────────
export function FilterNode({ data, selected }) {
  const filters = ["None", "Vintage", "B&W", "Sepia", "Vibrant", "Cool", "Warm", "Dramatic"];
  return (
    <NodeWrapper selected={selected} status={data.status} accentColor="#9B59B6">
      <NodeHeader icon={Filter} label="Filter" color="#9B59B6" />
      <div className="p-3">
        <select
          value={data.filter || "None"}
          onChange={(e) => data.onChange?.({ filter: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/80 px-2 py-1.5 outline-none cursor-pointer nodrag">
          
          {filters.map((f) => <option key={f} value={f} className="bg-[#1a1a1a]">{f}</option>)}
        </select>
        {data.previewUrl &&
        <img src={data.previewUrl} alt="Preview" className="w-full h-16 object-cover rounded-lg mt-2 opacity-80" />
        }
      </div>
    </NodeWrapper>);

}

// ── Adjustments Node ──────────────────────────────────────────────
export function AdjustmentsNode({ data, selected }) {
  const controls = [
  { key: "brightness", label: "Bright", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", min: -100, max: 100 },
  { key: "saturation", label: "Saturation", min: -100, max: 100 }];

  return (
    <NodeWrapper selected={selected} status={data.status} accentColor="#4ECDC4">
      <NodeHeader icon={SlidersHorizontal} label="Adjustments" color="#4ECDC4" />
      <div className="p-3 space-y-2.5 min-w-[200px]">
        {controls.map(({ key, label, min, max }) =>
        <div key={key} className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-white/40">{label}</span>
              <span className="text-[10px] text-white/40">{data[key] ?? 0}</span>
            </div>
            <input
            type="range" min={min} max={max}
            value={data[key] ?? 0}
            onChange={(e) => data.onChange?.({ [key]: parseInt(e.target.value) })}
            className="w-full h-1 nodrag accent-[#4ECDC4]" />
          
          </div>
        )}
      </div>
    </NodeWrapper>);

}

// ── Magic Brush Node ──────────────────────────────────────────────
export function MagicBrushNode({ data, selected }) {
  return (
    <NodeWrapper selected={selected} status={data.status} accentColor="#F72C25">
      <NodeHeader icon={Wand2} label="Magic Brush (AI)" color="#F72C25" />
      <div className="p-3">
        <textarea
          value={data.prompt || ""}
          onChange={(e) => data.onChange?.({ prompt: e.target.value })}
          placeholder="Describe the edit (e.g. remove background)..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/80 px-2 py-1.5 outline-none resize-none nodrag placeholder:text-white/20 min-w-[200px]" />
        
        {data.status === "error" &&
        <p className="text-[10px] text-red-400 mt-1">{data.error || "Failed"}</p>
        }
      </div>
    </NodeWrapper>);

}

// ── Text Generator Node ───────────────────────────────────────────
export function TextGeneratorNode({ data, selected }) {
  return (
    <NodeWrapper selected={selected} status={data.status} accentColor="#FFB800">
      <NodeHeader icon={Type} label="Text Generator" color="#FFB800" />
      <div className="p-3">
        <input
          value={data.text || ""}
          onChange={(e) => data.onChange?.({ text: e.target.value })}
          placeholder="Text to overlay..."
          className="w-full bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/80 px-2 py-1.5 outline-none nodrag placeholder:text-white/20 min-w-[180px]" />
        
        <input
          value={data.style || ""}
          onChange={(e) => data.onChange?.({ style: e.target.value })}
          placeholder="Style (e.g. neon graffiti)..."
          className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/80 px-2 py-1.5 outline-none nodrag placeholder:text-white/20" />
        
      </div>
    </NodeWrapper>);

}

// ── Generate / AI Transform Node ─────────────────────────────────
export function GenerateNode({ data, selected }) {
  const tools = ["Enhance", "Cinematic", "Cartoon", "Neon Glow", "Oil Painting", "Anime", "Sketch", "HDR"];
  return (
    <NodeWrapper selected={selected} status={data.status} accentColor="#FF6B35">
      <NodeHeader icon={Wand2} label="AI Transform" color="#FF6B35" />
      <div className="p-3">
        <select
          value={data.tool || "Enhance"}
          onChange={(e) => data.onChange?.({ tool: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/80 px-2 py-1.5 outline-none cursor-pointer nodrag min-w-[180px]">
          
          {tools.map((t) => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
        </select>
        {data.previewUrl &&
        <img src={data.previewUrl} alt="Result" className="w-full h-20 object-cover rounded-lg mt-2" />
        }
      </div>
    </NodeWrapper>);

}

// ── Output Node ───────────────────────────────────────────────────
export function OutputNode({ data, selected }) {
  return (
    <NodeWrapper selected={selected} status={data.status} hasOutput={false} accentColor="#4ECDC4">
      <NodeHeader icon={Download} label="Output" color="#4ECDC4" />
      <div className="p-3">
        {data.resultUrl ?
        <>
            <img src={data.resultUrl} alt="Result" className="w-full h-28 object-cover rounded-xl" />
            <button
            onClick={() => data.onApply?.()}
            className="mt-2 w-full text-[11px] bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white rounded-lg py-1.5 font-semibold nodrag hover:opacity-90 transition-opacity">
            
              Apply to Editor
            </button>
          </> :

        <div className="w-full h-16 rounded-xl bg-[#1a1a1a] border border-dashed border-white/10 flex items-center justify-center">
            <span className="text-[10px] text-white/30">Run flow to see result</span>
          </div>
        }
      </div>
    </NodeWrapper>);

}