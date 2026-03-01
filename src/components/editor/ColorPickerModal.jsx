import React, { useState, useRef } from "react";
import { X, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ColorPickerModal({ isOpen, onClose, onColorSelect, initialColor }) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [hexInput, setHexInput] = useState(initialColor || "#FF6B35");
  const hueSliderRef = useRef(null);

  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const currentColor = hslToHex(hue, saturation, lightness);

  const handleHexInputChange = (e) => {
    const value = e.target.value;
    setHexInput(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      const { h, s, l } = hexToHsl(value);
      setHue(h);
      setSaturation(s);
      setLightness(l);
    }
  };

  const handleColorSelect = () => {
    onColorSelect(currentColor);
    onClose();
  };

  const handleHueSliderClick = (e) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    setHue(Math.round(percentage * 360));
  };

  const handleTouchHueSlider = (e) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const percentage = (e.touches[0].clientX - rect.left) / rect.width;
    setHue(Math.round(Math.max(0, Math.min(1, percentage)) * 360));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] w-full md:w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-semibold text-white">Pick Color</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Color Preview */}
            <div className="space-y-3">
              <div
                className="w-full h-48 rounded-2xl shadow-xl border-4 border-white/10 transition-colors"
                style={{
                  background: `linear-gradient(135deg, #ffffff 0%, hsl(${hue}, ${saturation}%, ${lightness}%) 100%)`
                }}
              />
              
              {/* Hue Slider */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Hue</p>
                <div
                  ref={hueSliderRef}
                  onClick={handleHueSliderClick}
                  onTouchMove={handleTouchHueSlider}
                  className="relative h-12 rounded-full cursor-pointer overflow-hidden shadow-lg border border-white/10"
                  style={{
                    background: "linear-gradient(90deg, red, yellow, lime, aqua, blue, magenta, red)"
                  }}
                >
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-4 border-[#FF6B35] shadow-lg transition-none"
                    style={{ left: `${(hue / 360) * 100}%`, transform: "translate(-50%, -50%)" }}
                  />
                </div>
              </div>

              {/* Saturation Slider */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Saturation</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-[#FF6B35]"
                />
              </div>

              {/* Lightness Slider */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Brightness</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={lightness}
                  onChange={(e) => setLightness(Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-[#FF6B35]"
                />
              </div>
            </div>

            {/* Hex Input */}
            <div className="space-y-2">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Hex Code</p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white/20 flex-shrink-0"
                    style={{ backgroundColor: currentColor }}
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={handleHexInputChange}
                    placeholder="#FF6B35"
                    className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleColorSelect}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white font-medium hover:shadow-lg hover:shadow-[#FF6B35]/40 transition-all"
              >
                Select
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}