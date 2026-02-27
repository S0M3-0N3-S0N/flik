import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Palette, RotateCcw, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_COLORS = {
  color1: "#FF6B35",
  color2: "#F72C25",
  color3: "#FFB800",
};

export default function GradientEditor({ open, onOpenChange }) {
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) loadConfig();
  }, [open]);

  const loadConfig = async () => {
    setIsLoading(true);
    const configs = await base44.entities.AppConfiguration.filter({ key: "gradient_colors" });
    if (configs.length > 0) {
      setColors({ ...DEFAULT_COLORS, ...configs[0].value });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const existing = await base44.entities.AppConfiguration.filter({ key: "gradient_colors" });
    if (existing.length > 0) {
      await base44.entities.AppConfiguration.update(existing[0].id, { value: colors });
    } else {
      await base44.entities.AppConfiguration.create({ key: "gradient_colors", value: colors });
    }

    // Apply immediately to CSS variables
    applyGradientColors(colors);
    toast.success("Gradient colors updated!");
    setIsSaving(false);
    onOpenChange(false);
  };

  const handleReset = () => {
    setColors(DEFAULT_COLORS);
  };

  const preview = `linear-gradient(135deg, ${colors.color1} 0%, ${colors.color2} 50%, ${colors.color3} 100%)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#FF6B35]" />
            App Gradient Colors
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Preview */}
            <div
              className="h-16 rounded-xl shadow-lg"
              style={{ background: preview }}
            />

            {/* Color Pickers */}
            <div className="space-y-4">
              {[
                { label: "Color 1 (Start)", key: "color1" },
                { label: "Color 2 (Mid)", key: "color2" },
                { label: "Color 3 (End)", key: "color3" },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <label className="text-sm text-white/70 min-w-[110px]">{label}</label>
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-sm font-mono text-white/60 uppercase">{colors[key]}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 text-white"
                style={{ background: preview }}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function applyGradientColors(colors) {
  const root = document.documentElement;
  const { color1, color2, color3 } = colors;
  const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`;
  const gradientSecondary = `linear-gradient(135deg, ${color3} 0%, ${color1} 100%)`;
  const gradientAccent = `linear-gradient(135deg, ${color2} 0%, ${color1} 50%, ${color3} 100%)`;

  root.style.setProperty("--app-color1", color1);
  root.style.setProperty("--app-color2", color2);
  root.style.setProperty("--app-color3", color3);
  root.style.setProperty("--gradient-primary", gradient);
  root.style.setProperty("--gradient-secondary", gradientSecondary);
  root.style.setProperty("--gradient-accent", gradientAccent);

  // Remove existing override style if any
  const existing = document.getElementById("flik-theme-override");
  if (existing) existing.remove();

  // Inject a style tag that overrides all hardcoded color usages
  const style = document.createElement("style");
  style.id = "flik-theme-override";
  style.innerHTML = `
    /* Gradient text */
    .gradient-text {
      background: ${gradient} !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      background-clip: text !important;
    }

    /* Gradient buttons */
    .btn-gradient {
      background: ${gradient} !important;
    }

    /* Gradient border pseudo-element */
    .gradient-border::before {
      background: ${gradient} !important;
    }

    /* Primary color usages - text */
    [class*="text-[#FF6B35]"] { color: ${color1} !important; }
    [class*="text-[#F72C25]"] { color: ${color2} !important; }
    [class*="text-[#FFB800]"] { color: ${color3} !important; }

    /* Primary color usages - backgrounds */
    [class*="bg-[#FF6B35]"] { background-color: ${color1} !important; }
    [class*="bg-[#F72C25]"] { background-color: ${color2} !important; }
    [class*="bg-[#FFB800]"] { background-color: ${color3} !important; }

    /* Opacity variants for bg */
    [class*="bg-[#FF6B35]/"] { --tw-bg-opacity: 1; }
    [class*="from-[#FF6B35]"] { --tw-gradient-from: ${color1} !important; }
    [class*="from-[#F72C25]"] { --tw-gradient-from: ${color2} !important; }
    [class*="from-[#FFB800]"] { --tw-gradient-from: ${color3} !important; }
    [class*="via-[#FF6B35]"] { --tw-gradient-via: ${color1} !important; }
    [class*="via-[#F72C25]"] { --tw-gradient-via: ${color2} !important; }
    [class*="via-[#FFB800]"] { --tw-gradient-via: ${color3} !important; }
    [class*="to-[#FF6B35]"] { --tw-gradient-to: ${color1} !important; }
    [class*="to-[#F72C25]"] { --tw-gradient-to: ${color2} !important; }
    [class*="to-[#FFB800]"] { --tw-gradient-to: ${color3} !important; }

    /* Border colors */
    [class*="border-[#FF6B35]"] { border-color: ${color1} !important; }
    [class*="border-[#F72C25]"] { border-color: ${color2} !important; }
    [class*="border-[#FFB800]"] { border-color: ${color3} !important; }

    /* Ring colors */
    [class*="ring-[#FF6B35]"] { --tw-ring-color: ${color1} !important; }

    /* Shadow colors */
    [class*="shadow-[#FF6B35]"] { --tw-shadow-color: ${color1} !important; }

    /* Specific active nav states */
    [class*="data-[state=active]:from-[#FF6B35]"] { --tw-gradient-from: ${color1} !important; }
    [class*="data-[state=active]:to-[#FFB800]"] { --tw-gradient-to: ${color3} !important; }
  `;
  document.head.appendChild(style);
}