import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Pipette } from "lucide-react";

function hexToHsv(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max !== min) {
    if (max === r) h = (g - b) / (max - min) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

function hsvToHex(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const b = Math.round(f(1) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hueToHex(h) {
  return hsvToHex(h, 1, 1);
}

export default function ColorPickerModal({ color, onColorChange, onClose }) {
  const hsv = hexToHsv(color.startsWith("#") ? color : "#FF6B35");
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);
  const [hexInput, setHexInput] = useState(color);

  const satValRef = useRef(null);
  const hueRef = useRef(null);
  const isDraggingSV = useRef(false);
  const isDraggingHue = useRef(false);

  const currentHex = hsvToHex(hue, sat, val);

  useEffect(() => {
    setHexInput(currentHex);
    onColorChange(currentHex);
  }, [hue, sat, val]);

  const getSVFromEvent = useCallback((e) => {
    const rect = satValRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setSat(x);
    setVal(1 - y);
  }, []);

  const getHueFromEvent = useCallback((e) => {
    const rect = hueRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHue(x * 360);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (isDraggingSV.current) getSVFromEvent(e);
      if (isDraggingHue.current) getHueFromEvent(e);
    };
    const onUp = () => {
      isDraggingSV.current = false;
      isDraggingHue.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [getSVFromEvent, getHueFromEvent]);

  const handleHexInput = (e) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const h = hexToHsv(val);
      setHue(h.h);
      setSat(h.s);
      setVal(h.v);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-t-2xl bg-[#141414] border border-white/10 p-3 pb-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-white/60">Custom Color</span>
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-3 h-3 text-white/80" />
          </button>
        </div>

        {/* Saturation / Value Box */}
        <div
          ref={satValRef}
          className="relative w-full h-28 rounded-xl overflow-hidden cursor-crosshair select-none"
          style={{
            background: `linear-gradient(to right, white, ${hueToHex(hue)})`,
          }}
          onMouseDown={(e) => { isDraggingSV.current = true; getSVFromEvent(e); }}
          onTouchStart={(e) => { isDraggingSV.current = true; getSVFromEvent(e); }}
        >
          {/* Black overlay bottom */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent, black)" }} />
          {/* Cursor */}
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${sat * 100}%`,
              top: `${(1 - val) * 100}%`,
              backgroundColor: currentHex,
            }}
          />
        </div>

        {/* Hue Slider */}
        <div
          ref={hueRef}
          className="relative w-full h-6 rounded-full overflow-hidden cursor-pointer select-none"
          style={{
            background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
          }}
          onMouseDown={(e) => { isDraggingHue.current = true; getHueFromEvent(e); }}
          onTouchStart={(e) => { isDraggingHue.current = true; getHueFromEvent(e); }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 border-white shadow-lg pointer-events-none"
            style={{
              left: `${(hue / 360) * 100}%`,
              backgroundColor: hueToHex(hue),
            }}
          />
        </div>

        {/* Hex Input */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div className="w-6 h-6 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: currentHex }} />
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInput}
              className="flex-1 bg-transparent text-white font-mono text-sm outline-none uppercase"
              maxLength={7}
            />
          </div>
          <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
            <Pipette className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}