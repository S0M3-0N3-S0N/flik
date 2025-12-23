import React from "react";

export default function VideoPreview({ isPlaying, currentTime, tracks }) {
  // In a real app, this would use an HTML5 video element or WebGL canvas 
  // managed by a dedicated renderer that composites the tracks.
  // For now, we'll show a placeholder or the first visible video clip.

  const activeVideoClip = tracks
    .find(t => t.type === 'video')
    ?.clips.find(c => {
       // Mock logic: assuming clips are sequential 5s for demo
       // In real implementation, would check start time + duration vs currentTime
       return true; 
    });

  return (
    <div className="aspect-video h-full max-h-[60vh] bg-black shadow-2xl rounded-lg overflow-hidden border border-white/10 relative">
      {activeVideoClip ? (
        activeVideoClip.type === 'video' ? (
          <video 
            src={activeVideoClip.url} 
            className="w-full h-full object-contain"
            // controls={false} // Controlled by our custom controls
          />
        ) : (
          <img 
            src={activeVideoClip.url} 
            className="w-full h-full object-contain"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/20">
          <p>No media selected</p>
        </div>
      )}
      
      {/* Safe Area Guides (optional) */}
      <div className="absolute inset-8 border border-white/5 pointer-events-none border-dashed opacity-50" />
    </div>
  );
}