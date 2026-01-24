import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paintbrush, Droplet, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const brushPresets = [
  { id: 'round', name: 'Round', icon: '●', opacity: 1, size: 30, spacing: 25, jitter: 0, flow: 100, wetness: 0 },
  { id: 'soft', name: 'Soft Brush', icon: '◉', opacity: 0.7, size: 40, spacing: 20, jitter: 5, flow: 80, wetness: 0 },
  { id: 'hard', name: 'Hard Brush', icon: '⬤', opacity: 1, size: 25, spacing: 25, jitter: 0, flow: 100, wetness: 0 },
  { id: 'airbrush', name: 'Airbrush', icon: '◌', opacity: 0.5, size: 50, spacing: 15, jitter: 15, flow: 60, wetness: 0 },
  { id: 'marker', name: 'Marker', icon: '▮', opacity: 0.8, size: 35, spacing: 10, jitter: 2, flow: 90, wetness: 30 },
];

export default function ColorWheel({ color, onColorChange, brushPreset, onBrushChange, isOpen, onClose }) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const canvasRef = useRef(null);
  const wheelRef = useRef(null);

  useEffect(() => {
    if (color) {
      const rgb = hexToRgb(color);
      if (rgb) {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setHue(hsl.h);
        setSaturation(hsl.s);
        setLightness(hsl.l);
      }
    }
  }, []);

  useEffect(() => {
    const newColor = hslToHex(hue, saturation, lightness);
    onColorChange(newColor);
  }, [hue, saturation, lightness]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 200;
    const center = size / 2;
    const radius = size / 2 - 10;

    canvas.width = size;
    canvas.height = size;

    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 90) * Math.PI / 180;
      const endAngle = (angle - 89) * Math.PI / 180;
      
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
      gradient.addColorStop(0, `hsl(${angle}, 0%, ${lightness}%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, ${lightness}%)`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw center circle (white/black based on lightness)
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [lightness]);

  const handleWheelClick = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const center = 100;
    
    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 20) {
      // Clicked center - toggle black/white
      setLightness(lightness > 50 ? 0 : 100);
      setSaturation(0);
      return;
    }
    
    if (distance > 90) return;
    
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const normalizedAngle = (angle + 90 + 360) % 360;
    
    setHue(normalizedAngle);
    setSaturation(Math.min((distance / 90) * 100, 100));
  };

  const updateBrushProperty = (property, value) => {
    onBrushChange({ ...brushPreset, [property]: value });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="absolute bottom-16 right-0 z-50 max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div className="bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl w-80"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-[#FF6B35]" />
              <h3 className="text-white font-semibold">Color & Brush</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Color Wheel */}
          <div className="flex flex-col items-center mb-6">
            <canvas
              ref={canvasRef}
              onClick={handleWheelClick}
              className="cursor-crosshair rounded-full shadow-lg"
              style={{ width: '200px', height: '200px' }}
            />
            
            {/* Current Color Preview */}
            <div className="flex items-center gap-3 mt-4 w-full">
              <div
                className="w-12 h-12 rounded-xl shadow-lg border-2 border-white/10"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1">
                <div className="text-xs text-white/40 mb-1">Current Color</div>
                <div className="text-sm text-white font-mono">{color.toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Lightness Slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60">Brightness</span>
              <span className="text-xs text-white/40">{Math.round(lightness)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={lightness}
              onChange={(e) => setLightness(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #000, hsl(${hue}, ${saturation}%, 50%), #fff)`,
              }}
            />
          </div>

          {/* Brush Presets */}
          <div>
            <div className="text-xs text-white/60 mb-3">Brush Presets</div>
            <div className="grid grid-cols-5 gap-2">
              {brushPresets.map((brush) => (
                <button
                  key={brush.id}
                  onClick={() => onBrushChange(brush)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                    brushPreset?.id === brush.id
                      ? 'bg-[#FF6B35] text-white'
                      : 'bg-white/5 hover:bg-white/10 text-white/60'
                  }`}
                >
                  <span className="text-2xl">{brush.icon}</span>
                </button>
              ))}
            </div>
            {brushPreset && (
              <div className="mt-3 p-4 rounded-xl bg-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/80 font-medium">{brushPreset.name}</div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-[#FF6B35] hover:text-[#FFB800] transition-colors"
                  >
                    {showAdvanced ? 'Basic' : 'Advanced'}
                  </button>
                </div>

                {/* Basic Controls */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60">Size</span>
                      <span className="text-xs text-white/40">{brushPreset.size}px</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={brushPreset.size}
                      onChange={(e) => updateBrushProperty('size', Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60">Opacity</span>
                      <span className="text-xs text-white/40">{Math.round(brushPreset.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={brushPreset.opacity}
                      onChange={(e) => updateBrushProperty('opacity', Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10"
                    />
                  </div>
                </div>

                {/* Advanced Controls */}
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-3 border-t border-white/5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/60">Spacing</span>
                        <span className="text-xs text-white/40">{brushPreset.spacing}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={brushPreset.spacing}
                        onChange={(e) => updateBrushProperty('spacing', Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10"
                      />
                      <p className="text-[10px] text-white/30 mt-1">Distance between brush stamps</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/60">Jitter</span>
                        <span className="text-xs text-white/40">{brushPreset.jitter}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={brushPreset.jitter}
                        onChange={(e) => updateBrushProperty('jitter', Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10"
                      />
                      <p className="text-[10px] text-white/30 mt-1">Random position variance</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/60">Flow</span>
                        <span className="text-xs text-white/40">{brushPreset.flow}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={brushPreset.flow}
                        onChange={(e) => updateBrushProperty('flow', Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10"
                      />
                      <p className="text-[10px] text-white/30 mt-1">Paint application rate</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/60">Wetness</span>
                        <span className="text-xs text-white/40">{brushPreset.wetness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={brushPreset.wetness}
                        onChange={(e) => updateBrushProperty('wetness', Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10"
                      />
                      <p className="text-[10px] text-white/30 mt-1">Color blending behavior</p>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (val) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}