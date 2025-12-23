import React, { useState, useRef, useEffect } from 'react';
import { X, Move, RotateCw, Maximize, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';

export default function CollageLayer({ 
  layer, 
  isSelected, 
  onSelect, 
  onChange, 
  onRemove,
  onDuplicate
}) {
  const layerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isSelected) return;

      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        onChange(layer.id, {
          x: initialTransform.x + dx,
          y: initialTransform.y + dy
        });
      } else if (isResizing) {
        // Simple resizing logic - distance from center
        // A robust implementation would project onto the rotation vector, but simple distance works for collage tools usually
        // Let's try a better approach: Rotate the mouse point back to unrotated space relative to center
        // For simplicity in this constraints: just use distance scaling
        
        const rect = layerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const distStart = Math.hypot(dragStart.x - centerX, dragStart.y - centerY);
        const distCurr = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        const scaleFactor = distCurr / distStart;

        onChange(layer.id, {
          width: Math.max(20, initialTransform.width * scaleFactor),
          height: Math.max(20, initialTransform.height * scaleFactor)
        });
      } else if (isRotating) {
        const rect = layerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angleStart = Math.atan2(dragStart.y - centerY, dragStart.x - centerX);
        const angleCurr = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const angleDelta = (angleCurr - angleStart) * (180 / Math.PI);

        onChange(layer.id, {
          rotation: (initialTransform.rotation + angleDelta) % 360
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsRotating(false);
    };

    if (isDragging || isResizing || isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, isRotating, dragStart, initialTransform, isSelected, layer.id, onChange]);

  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    onSelect(layer.id);
    
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialTransform({
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation
    });

    if (type === 'drag') setIsDragging(true);
    if (type === 'resize') setIsResizing(true);
    if (type === 'rotate') setIsRotating(true);
  };

  return (
    <div
      ref={layerRef}
      className={`absolute group touch-none select-none ${isSelected ? 'z-50' : 'z-auto'}`}
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        transform: `rotate(${layer.rotation}deg)`,
        zIndex: layer.zIndex,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
    >
      <div className="w-full h-full relative">
        {layer.type === 'image' && (
          <img 
            src={layer.content} 
            alt="layer" 
            className="w-full h-full object-cover pointer-events-none rounded-sm"
            style={{ opacity: layer.opacity }}
          />
        )}
        {layer.type === 'text' && (
          <div 
            className="w-full h-full flex items-center justify-center p-2 text-center"
            style={{ 
              color: layer.color || 'white',
              fontSize: `${Math.min(layer.width, layer.height) / 2}px`, // Responsive font size base
              fontFamily: layer.fontFamily || 'sans-serif',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              opacity: layer.opacity
            }}
          >
            {layer.content}
          </div>
        )}
        {layer.type === 'sticker' && (
           <div 
            className="w-full h-full flex items-center justify-center text-6xl pointer-events-none"
            style={{ opacity: layer.opacity, fontSize: `${Math.min(layer.width, layer.height) * 0.8}px` }}
          >
            {layer.content}
          </div>
        )}

        {/* Selection UI */}
        {isSelected && (
          <div className="absolute inset-[-2px] border-2 border-[#FF6B35] pointer-events-none">
            {/* Controls Container - Positioned outside the layer to not obstruct */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 bg-black/80 rounded-lg p-1 pointer-events-auto">
               <button onClick={(e) => { e.stopPropagation(); onRemove(layer.id); }} className="p-1 hover:text-red-500 text-white"><Trash2 size={14} /></button>
               <button onClick={(e) => { e.stopPropagation(); onDuplicate(layer.id); }} className="p-1 hover:text-blue-500 text-white"><Copy size={14} /></button>
            </div>

            {/* Resize Handle (Bottom Right) */}
            <div 
              className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-[#FF6B35] rounded-full flex items-center justify-center cursor-nwse-resize pointer-events-auto shadow-md"
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
            >
              <Maximize size={10} className="text-[#FF6B35]" />
            </div>

            {/* Rotate Handle (Top Right) */}
            <div 
              className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-[#FF6B35] rounded-full flex items-center justify-center cursor-pointer pointer-events-auto shadow-md hover:bg-gray-100"
              onMouseDown={(e) => handleMouseDown(e, 'rotate')}
            >
              <RotateCw size={10} className="text-[#FF6B35]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}