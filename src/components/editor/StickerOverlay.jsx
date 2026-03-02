import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, RotateCw } from "lucide-react";

export default function StickerOverlay({ stickers, onStickersChange, zoom, pan, containerRef }) {
  const [activeSticker, setActiveSticker] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const [rotateState, setRotateState] = useState(null);

  const getContainerRect = () => containerRef?.current?.getBoundingClientRect();

  const handleStickerMouseDown = useCallback((e, stickerId, action) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveSticker(stickerId);

    const clientX = e.touches?.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches?.length > 0 ? e.touches[0].clientY : e.clientY;

    if (action === 'drag') {
      const sticker = stickers.find(s => s.id === stickerId);
      setDragState({ startX: clientX, startY: clientY, origX: sticker.x, origY: sticker.y });
    } else if (action === 'resize') {
      const sticker = stickers.find(s => s.id === stickerId);
      setResizeState({ startX: clientX, startY: clientY, origW: sticker.width, origH: sticker.height });
    } else if (action === 'rotate') {
      const sticker = stickers.find(s => s.id === stickerId);
      const rect = getContainerRect();
      if (!rect) return;
      const centerX = rect.left + (sticker.x / 100) * rect.width + (sticker.width / 2) * (rect.width / 100);
      const centerY = rect.top + (sticker.y / 100) * rect.height + (sticker.height / 2) * (rect.height / 100);
      setRotateState({ centerX, centerY, origRotation: sticker.rotation || 0 });
    }
  }, [stickers, containerRef]);

  const handleMouseMove = useCallback((e) => {
    if (!activeSticker) return;
    const clientX = e.touches?.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches?.length > 0 ? e.touches[0].clientY : e.clientY;
    const rect = getContainerRect();
    if (!rect) return;

    if (dragState) {
      const dx = ((clientX - dragState.startX) / rect.width) * 100;
      const dy = ((clientY - dragState.startY) / rect.height) * 100;
      onStickersChange(stickers.map(s =>
        s.id === activeSticker
          ? { ...s, x: Math.max(0, Math.min(90, dragState.origX + dx)), y: Math.max(0, Math.min(90, dragState.origY + dy)) }
          : s
      ));
    } else if (resizeState) {
      const dx = ((clientX - resizeState.startX) / rect.width) * 100;
      const dy = ((clientY - resizeState.startY) / rect.height) * 100;
      const delta = (dx + dy) / 2;
      onStickersChange(stickers.map(s =>
        s.id === activeSticker
          ? { ...s, width: Math.max(5, resizeState.origW + delta), height: Math.max(5, resizeState.origH + delta) }
          : s
      ));
    } else if (rotateState) {
      const angle = Math.atan2(clientY - rotateState.centerY, clientX - rotateState.centerX);
      const degrees = (angle * 180) / Math.PI + 90;
      onStickersChange(stickers.map(s =>
        s.id === activeSticker ? { ...s, rotation: degrees } : s
      ));
    }
  }, [activeSticker, dragState, resizeState, rotateState, stickers, onStickersChange]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setResizeState(null);
    setRotateState(null);
  }, []);

  useEffect(() => {
    if (dragState || resizeState || rotateState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [dragState, resizeState, rotateState, handleMouseMove, handleMouseUp]);

  if (!stickers.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {stickers.map(sticker => (
        <div
          key={sticker.id}
          className="absolute pointer-events-auto"
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            width: `${sticker.width}%`,
            transform: `rotate(${sticker.rotation || 0}deg)`,
            cursor: 'move',
          }}
          onMouseDown={(e) => handleStickerMouseDown(e, sticker.id, 'drag')}
          onTouchStart={(e) => handleStickerMouseDown(e, sticker.id, 'drag')}
          onClick={(e) => { e.stopPropagation(); setActiveSticker(sticker.id); }}
        >
          <img
            src={sticker.url}
            alt="sticker"
            className="w-full h-auto select-none"
            draggable={false}
            style={{
              outline: activeSticker === sticker.id ? '2px dashed rgba(255,107,53,0.8)' : 'none',
              borderRadius: 4,
            }}
          />

          {activeSticker === sticker.id && (
            <>
              {/* Delete */}
              <button
                className="absolute -top-3 -left-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md z-10"
                onMouseDown={(e) => { e.stopPropagation(); onStickersChange(stickers.filter(s => s.id !== sticker.id)); setActiveSticker(null); }}
              >
                <X className="w-3 h-3 text-white" />
              </button>

              {/* Rotate */}
              <button
                className="absolute -top-3 -right-3 w-6 h-6 bg-[#FF6B35] rounded-full flex items-center justify-center shadow-md z-10 cursor-grab"
                onMouseDown={(e) => handleStickerMouseDown(e, sticker.id, 'rotate')}
                onTouchStart={(e) => handleStickerMouseDown(e, sticker.id, 'rotate')}
              >
                <RotateCw className="w-3 h-3 text-white" />
              </button>

              {/* Resize */}
              <div
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-white rounded-full border-2 border-[#FF6B35] shadow-md z-10 cursor-se-resize"
                onMouseDown={(e) => handleStickerMouseDown(e, sticker.id, 'resize')}
                onTouchStart={(e) => handleStickerMouseDown(e, sticker.id, 'resize')}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}