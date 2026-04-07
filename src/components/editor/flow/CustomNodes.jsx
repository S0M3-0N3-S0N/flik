import React, { useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import { Image, Wand2, Download, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

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
        data.onChange?.({ imageUrls: [...(data.imageUrls || []), ev.target.result] });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (idx) => {
    data.onChange?.({ imageUrls: imageUrls.filter((_, i) => i !== idx) });
  };

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 min-w-[180px] ${STATUS_RING[data.status || 'idle']} ${selected ? 'ring-2 ring-[#FF6B35]/60' : ''}`}
      style={{ backgroundColor: '#111111' }}>
      
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !rounded-full !border-2 !bg-[#0A0A0A]" style={{ borderColor: '#FF6B35' }} />
      <div className="absolute top-2 right-2">{STATUS_ICON[data.status || 'idle']}</div>
      <NodeHeader icon={Image} label="Image Input" color="#FF6B35" />
      <div className="p-3" style={{ backgroundColor: '#111111' }}>
        {imageUrls.length > 0 ?
        <div className="grid grid-cols-2 gap-1.5 mb-2">
            {imageUrls.map((url, idx) =>
          <div key={idx} className="relative group">
                <img src={url} alt={`Input ${idx + 1}`} className="w-full h-16 object-cover rounded-lg" />
                <button
              onClick={() => handleRemove(idx)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white/70 hover:text-red-400 text-[10px] flex items-center justify-center nodrag opacity-0 group-hover:opacity-100 transition-opacity">
              ✕</button>
              </div>
          )}
          </div> :

        <div className="w-full h-16 rounded-xl border border-dashed border-white/10 flex items-center justify-center mb-2" style={{ backgroundColor: '#1a1a1a' }}>
            <span className="text-[10px] text-white/30">No images</span>
          </div>
        }
        <div className="flex gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 text-[10px] border border-[#FF6B35]/30 text-[#FF6B35] rounded-lg py-1 nodrag transition-colors hover:opacity-80"
            style={{ backgroundColor: 'rgba(255,107,53,0.15)' }}>
            + Upload</button>
          <button
            onClick={() => data.onGalleryOpen?.()}
            className="flex-1 text-[10px] border border-white/10 text-white/50 hover:text-white/80 rounded-lg py-1 nodrag transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            Gallery</button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
        {imageUrls.length > 0 &&
        <p className="text-[10px] text-white/30 mt-1.5 text-center">{imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''}</p>
        }
      </div>
    </div>);

}

// ── Magic Brush Node ──────────────────────────────────────────────
export function MagicBrushNode({ data, selected }) {
  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 min-w-[200px] ${STATUS_RING[data.status || 'idle']} ${selected ? 'ring-2 ring-[#F72C25]/60' : ''}`}
      style={{ backgroundColor: '#111111' }}>
      
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !rounded-full !border-2 !bg-[#0A0A0A]" style={{ borderColor: '#F72C25' }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !rounded-full !border-2 !bg-[#0A0A0A]" style={{ borderColor: '#F72C25' }} />
      <div className="absolute top-2 right-2">{STATUS_ICON[data.status || 'idle']}</div>
      <NodeHeader icon={Wand2} label="Magic Brush (AI)" color="#F72C25" />
      <div className="p-3" style={{ backgroundColor: '#111111' }}>
        <textarea
          value={data.prompt || ""}
          onChange={(e) => data.onChange?.({ prompt: e.target.value })}
          placeholder="Describe the edit (e.g. remove background)..."
          rows={3}
          className="w-full border border-white/10 rounded-lg text-[11px] text-white/80 px-2 py-1.5 outline-none resize-none nodrag placeholder:text-white/20"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        
        {data.status === "error" &&
        <p className="text-[10px] text-red-400 mt-1">{data.error || "Failed"}</p>
        }
      </div>
    </div>);

}

// ── Output Node ───────────────────────────────────────────────────
export function OutputNode({ data, selected }) {
  return null;


























}

// Keep exports for backward compat (not shown in palette)
export function FilterNode({ data, selected }) {return null;}
export function AdjustmentsNode({ data, selected }) {return null;}
export function GenerateNode({ data, selected }) {return null;}
export function TextGeneratorNode({ data, selected }) {return null;}