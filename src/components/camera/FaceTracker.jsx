import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * FaceTracker overlays face-detection boxes on the live camera feed.
 * Uses the browser's built-in FaceDetector API (Chrome/Android).
 * Falls back silently if not supported.
 */
export default function FaceTracker({ videoRef, isActive, mirrored }) {
  const [faces, setFaces] = useState([]);
  const [supported, setSupported] = useState(false);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0, top: 0, left: 0 });

  // Check support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
        setSupported(true);
      } catch {
        setSupported(false);
      }
    }
  }, []);

  // Track the rendered size of the video element
  const updateVideoDims = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const rect = video.getBoundingClientRect();
    setVideoDims({ w: rect.width, h: rect.height, top: rect.top, left: rect.left });
  }, [videoRef]);

  useEffect(() => {
    updateVideoDims();
    window.addEventListener('resize', updateVideoDims);
    return () => window.removeEventListener('resize', updateVideoDims);
  }, [updateVideoDims]);

  // Detection loop
  useEffect(() => {
    if (!supported || !isActive) {
      setFaces([]);
      return;
    }

    const detect = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const detected = await detectorRef.current.detect(video);
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const rect = video.getBoundingClientRect();

        // Scale from video natural size → rendered size
        const scaleX = rect.width / vw;
        const scaleY = rect.height / vh;

        setFaces(detected.map(f => ({
          x: f.boundingBox.x * scaleX,
          y: f.boundingBox.y * scaleY,
          w: f.boundingBox.width * scaleX,
          h: f.boundingBox.height * scaleY,
        })));
      } catch {
        // Silently ignore detection errors
      }

      // Detect ~10 fps to keep CPU usage low
      rafRef.current = setTimeout(() => {
        rafRef.current = requestAnimationFrame(detect);
      }, 100);
    };

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        clearTimeout(rafRef.current);
      }
      setFaces([]);
    };
  }, [supported, isActive, videoRef]);

  if (!supported || faces.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {faces.map((face, i) => {
        // Mirror the X position if front camera is mirrored
        const x = mirrored
          ? (videoDims.w || 0) - face.x - face.w
          : face.x;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: face.y,
              width: face.w,
              height: face.h,
            }}
          >
            {/* Corner brackets only — no full box */}
            {[
              { top: 0, left: 0, borderTop: true, borderLeft: true },
              { top: 0, right: 0, borderTop: true, borderRight: true },
              { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
              { bottom: 0, right: 0, borderBottom: true, borderRight: true },
            ].map((corner, ci) => {
              const size = Math.max(12, Math.min(face.w * 0.22, 28));
              return (
                <div
                  key={ci}
                  style={{
                    position: 'absolute',
                    width: size,
                    height: size,
                    top: corner.top !== undefined ? 0 : undefined,
                    bottom: corner.bottom !== undefined ? 0 : undefined,
                    left: corner.left !== undefined ? 0 : undefined,
                    right: corner.right !== undefined ? 0 : undefined,
                    borderTop: corner.borderTop ? '2px solid rgba(255,184,0,0.9)' : undefined,
                    borderBottom: corner.borderBottom ? '2px solid rgba(255,184,0,0.9)' : undefined,
                    borderLeft: corner.borderLeft ? '2px solid rgba(255,184,0,0.9)' : undefined,
                    borderRight: corner.borderRight ? '2px solid rgba(255,184,0,0.9)' : undefined,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}