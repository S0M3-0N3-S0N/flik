import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function TextOverlay({ onAddText }) {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState("48");
  const [color, setColor] = useState("#FFFFFF");
  const [fontFamily, setFontFamily] = useState("Arial");

  const handleAdd = () => {
    if (text.trim()) {
      onAddText({
        text,
        fontSize: parseInt(fontSize),
        color,
        fontFamily,
        x: 50, // Center position
        y: 50,
      });
      setText("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label className="text-white/80">Text</Label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          className="bg-white/5 border-white/10 text-white"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/80">Font Size</Label>
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24px</SelectItem>
              <SelectItem value="32">32px</SelectItem>
              <SelectItem value="48">48px</SelectItem>
              <SelectItem value="64">64px</SelectItem>
              <SelectItem value="96">96px</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-white/80">Font</Label>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Times New Roman">Times</SelectItem>
              <SelectItem value="Courier New">Courier</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Impact">Impact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white/80">Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 rounded-lg cursor-pointer bg-white/5 border border-white/10"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      <Button
        onClick={handleAdd}
        disabled={!text.trim()}
        className="w-full btn-gradient text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Text
      </Button>
    </motion.div>
  );
}