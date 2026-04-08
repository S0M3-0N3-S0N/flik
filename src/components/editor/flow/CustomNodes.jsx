import React, { useRef } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Image, Wand2, Download, Loader2, CheckCircle2, AlertCircle, Sparkles, FileText, Trash2, X } from "lucide-react";

const STATUS_ICON = {
  idle: null,
  running: <Loader2 className="w-3 h-3 text-[#FFB800] animate-spin" />,
  done: <CheckCircle2 className="w-3 h-3 text-green-400" />,
  error: <AlertCircle className="w-3 h-3 text-red-400" />,
};

const STATUS_BORDER = {
  idle: "border-white/10",
  running: "border-[#FFB800]/50 shadow-[0_0_16px_rgba(255,184,0,0.2)]",
  done: "border-green-500/40 shadow-[0_0_16px_rgba(74,222,128,0.15)]",
  error: "border-red-500/40 shadow-[0_0_16px_rgba(239,68,68,0.15)]",
};

const makeHandle = (color) => ({
  width: 12, height: 12, borderRadius: "50%",
  border: `2px solid ${color}`, background: "#0A0A0A",
});

function NodeShell({ children, color, status, selected }) {
  const border = STATUS_BORDER[status || "idle"];
  return (
    <div className={`relative rounded-2xl border overflow-visible transition-all duration-200 min-w-[200px] max-w-[240px] ${border}`}
      style={{ backgroundColor: "#111111", boxShadow: selected ? `0 0 0 2px ${color}60` : undefined }}>
      {children}
    </div>
  );
}

function NodeHeader({ icon: Icon, label, color, status, onDelete }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-2.5 border-b border-white/5">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-[11px] font-semibold text-white/80 truncate flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        {STATUS_ICON[status || "idle"]}
        {onDelete && (
          <button onClick={onDelete} className="nodrag w-5 h-5 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Image Input Node ──────────────────────────────────────────────
export function ImageInputNode({ id, data, selected }) {
  const fileInputRef = useRef(null);
  const { deleteElements } = useReactFlow();
  const imageUrls = data.imageUrls || [];
  const color = "#FF6B35";

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        data.onChange?.({ imageUrls: [...(data.imageUrls || []), ev.target.result] });
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <NodeShell color={color} status={data.status} selected={selected}>
      <Handle type="target" position={Position.Left} style={makeHandle(color)} />
      <Handle type="source" position={Position.Right} style={makeHandle(color)} />
      <NodeHeader icon={Image} label="Image Input" color={color} status={data.status}
        onDelete={() => deleteElements({ nodes: [{ id }] })} />
      <div className="p-3 space-y-2">
        {imageUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {imageUrls.map((url, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden">
                <img src={url} alt="" className="w-full h-16 object-cover" />
                <button onClick={() => data.onChange?.({ imageUrls: imageUrls.filter((_, i) => i !== idx) })}
                  className="nodrag absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-2.5 h-2.5 text-white/70" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center" style={{ background: "rgba(255,107,53,0.04)" }}>
            <span className="text-[10px] text-white/25">No images</span>
          </div>
        )}
        <div className="flex gap-1.5">
          <button onClick={() => fileInputRef.current?.click()}
            className="nodrag flex-1 text-[10px] py-1.5 rounded-lg border border-[#FF6B35]/30 text-[#FF6B35] hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,107,53,0.1)" }}>+ Upload</button>
          <button onClick={() => data.onGalleryOpen?.()}
            className="nodrag flex-1 text-[10px] py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/80 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}>Gallery</button>
        </div>
        {imageUrls.length > 0 && (
          <p className="text-[9px] text-white/25 text-center">{imageUrls.length} image{imageUrls.length !== 1 ? "s" : ""}</p>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      </div>
    </NodeShell>
  );
}

// ── Magic Brush Node ──────────────────────────────────────────────
export function MagicBrushNode({ id, data, selected }) {
  const { deleteElements } = useReactFlow();
  const color = "#F72C25";
  return (
    <NodeShell color={color} status={data.status} selected={selected}>
      <Handle type="target" position={Position.Left} style={makeHandle(color)} />
      <Handle type="source" position={Position.Right} style={makeHandle(color)} />
      <NodeHeader icon={Wand2} label="Magic Brush" color={color} status={data.status}
        onDelete={() => deleteElements({ nodes: [{ id }] })} />
      <div className="p-3 space-y-2">
        <textarea value={data.prompt || ""} onChange={(e) => data.onChange?.({ prompt: e.target.value })}
          placeholder="Describe the edit (e.g. remove background, add fog)..."
          rows={3}
          className="nodrag w-full text-[11px] text-white/80 px-2.5 py-2 rounded-lg border border-white/8 outline-none resize-none placeholder:text-white/20"
          style={{ background: "rgba(255,255,255,0.04)" }} />
        {data.allRefs && data.allRefs.length > 0 && (
          <div>
            <p className="text-[9px] text-white/25 mb-1">{data.allRefs.length} reference{data.allRefs.length !== 1 ? "s" : ""} from upstream</p>
            <div className="grid grid-cols-3 gap-1">
              {data.allRefs.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full h-10 object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}
        {data.status === "error" && <p className="text-[10px] text-red-400">{data.error || "Failed"}</p>}
      </div>
    </NodeShell>
  );
}

// ── Imagine AI Node ───────────────────────────────────────────────
const STYLES = ["None", "Cinematic", "Anime", "Oil Painting", "Neon Glow", "Sketch", "HDR", "Cartoon"];

export function ImagineAINode({ id, data, selected }) {
  const { deleteElements } = useReactFlow();
  const color = "#FFB800";
  return (
    <NodeShell color={color} status={data.status} selected={selected}>
      <Handle type="target" position={Position.Left} style={makeHandle(color)} />
      <Handle type="source" position={Position.Right} style={makeHandle(color)} />
      <NodeHeader icon={Sparkles} label="Imagine AI" color={color} status={data.status}
        onDelete={() => deleteElements({ nodes: [{ id }] })} />
      <div className="p-3 space-y-2">
        <textarea value={data.prompt || ""} onChange={(e) => data.onChange?.({ prompt: e.target.value })}
          placeholder="Describe what to generate or transform..."
          rows={3}
          className="nodrag w-full text-[11px] text-white/80 px-2.5 py-2 rounded-lg border border-white/8 outline-none resize-none placeholder:text-white/20"
          style={{ background: "rgba(255,255,255,0.04)" }} />
        <div>
          <p className="text-[9px] text-white/30 mb-1 uppercase tracking-wider">Style</p>
          <div className="flex flex-wrap gap-1">
            {STYLES.map(s => (
              <button key={s} onClick={() => data.onChange?.({ style: s })}
                className={`nodrag text-[9px] px-2 py-0.5 rounded-full border transition-all ${
                  (data.style || "None") === s
                    ? "border-[#FFB800]/60 text-[#FFB800]"
                    : "border-white/10 text-white/40 hover:text-white/60"
                }`}
                style={(data.style || "None") === s ? { background: "rgba(255,184,0,0.1)" } : {}}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {data.allRefs && data.allRefs.length > 0 && (
          <div>
            <p className="text-[9px] text-white/25 mb-1">{data.allRefs.length} reference{data.allRefs.length !== 1 ? "s" : ""} from upstream</p>
            <div className="grid grid-cols-3 gap-1">
              {data.allRefs.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full h-10 object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}
        {data.status === "error" && <p className="text-[10px] text-red-400">{data.error || "Failed"}</p>}
        {data.resultPreview && (
          <div className="rounded-lg overflow-hidden">
            <img src={data.resultPreview} alt="Result" className="w-full h-16 object-cover" />
          </div>
        )}
      </div>
    </NodeShell>
  );
}

// ── Blank / Note Node ─────────────────────────────────────────────
export function BlankNode({ id, data, selected }) {
  const { deleteElements } = useReactFlow();
  const color = "#888888";
  return (
    <NodeShell color={color} status="idle" selected={selected}>
      <Handle type="target" position={Position.Left} style={makeHandle(color)} />
      <Handle type="source" position={Position.Right} style={makeHandle(color)} />
      <NodeHeader icon={FileText} label="Note" color={color} status="idle"
        onDelete={() => deleteElements({ nodes: [{ id }] })} />
      <div className="p-3">
        <textarea value={data.text || ""} onChange={(e) => data.onChange?.({ text: e.target.value })}
          placeholder="Add a note or label..."
          rows={3}
          className="nodrag w-full text-[11px] text-white/60 px-2.5 py-2 rounded-lg border border-white/8 outline-none resize-none placeholder:text-white/20"
          style={{ background: "rgba(255,255,255,0.03)" }} />
      </div>
    </NodeShell>
  );
}

// ── Output Node (green) ───────────────────────────────────────────
export function OutputNode({ id, data, selected }) {
  const { deleteElements } = useReactFlow();
  const color = "#22C55E";
  return (
    <NodeShell color={color} status={data.status} selected={selected}>
      <Handle type="target" position={Position.Left} style={makeHandle(color)} />
      <Handle type="source" position={Position.Right} style={makeHandle(color)} />
      <NodeHeader icon={Download} label="Output" color={color} status={data.status}
        onDelete={() => deleteElements({ nodes: [{ id }] })} />
      <div className="p-3 space-y-2">
        {data.resultUrl ? (
          <>
            <img src={data.resultUrl} alt="Result" className="w-full h-28 object-cover rounded-xl" />
            {data.allRefs && data.allRefs.length > 1 && (
              <div>
                <p className="text-[9px] text-white/25 mb-1">All references used</p>
                <div className="grid grid-cols-4 gap-1">
                  {data.allRefs.filter(u => u !== data.resultUrl).slice(0, 4).map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full h-8 object-cover rounded-md" />
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => data.onSave?.()}
              className="nodrag w-full text-[11px] py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)" }}>
              Save to Gallery
            </button>
          </>
        ) : (
          <div className="h-20 rounded-xl border border-dashed border-white/8 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.04)" }}>
            <span className="text-[10px] text-white/25">Run flow to see result</span>
          </div>
        )}
        {data.status === "error" && <p className="text-[10px] text-red-400">{data.error}</p>}
      </div>
    </NodeShell>
  );
}