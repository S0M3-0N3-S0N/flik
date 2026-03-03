import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FaceTracker overlays face-detection boxes on the live camera feed.
 * Primary: browser's built-in FaceDetector API (Chrome/Android).
 * Fallback: TensorFlow.js BlazeFace (works on iOS/Safari too).
 */
export default function FaceTracker({ videoRef, isActive, mirrored, onFacesUpdate }) {
  const [faces, setFaces] = useState([]);
  const [visible, setVisible] = useState(false);
  const fadeTimerRef = useRef(null);
  const detectorRef = useRef(null);
  const modelRef = useRef(null);
  const modeRef = useRef(null);        // 'native' | 'blazeface' | 'none'
  const rafRef = useRef(null);
  const onFacesUpdateRef = useRef(onFacesUpdate);
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
  const trackedFacesRef = useRef([]); // [{id, x, y, w, h, vx, vy, vw, vh, kx, ky, kw, kh, ...}, ...]
  const nextFaceIdRef = useRef(0);
  const SMOOTHING_FACTOR = 0.6;
  const KALMAN_Q = 0.001; // Process noise
  const KALMAN_R = 1.0;   // Measurement noise

  // Keep callback ref fresh without re-triggering detection loop
  useEffect(() => { onFacesUpdateRef.current = onFacesUpdate; }, [onFacesUpdate]);

  // Simple Kalman filter for each dimension
  const updateKalman = (state, measurement) => {
    const { estimate, p, vx } = state;
    // Predict
    const predictedEstimate = estimate + vx;
    const predictedP = p + KALMAN_Q;
    // Update
    const K = predictedP / (predictedP + KALMAN_R);
    const newEstimate = predictedEstimate + K * (measurement - predictedEstimate);
    const newP = (1 - K) * predictedP;
    const newVx = vx + K * (measurement - estimate) * 0.1; // Update velocity
    return { estimate: newEstimate, p: newP, vx: newVx };
  };

  // Assign face IDs and track with Kalman + velocity
  const trackFaces = (detections) => {
    if (detections.length === 0) {
      trackedFacesRef.current = [];
      return [];
    }

    const tracked = trackedFacesRef.current;
    const used = new Set();
    const result = [];

    // Match detections to existing tracked faces
    for (const detection of detections) {
      let bestMatch = null;
      let bestDist = Infinity;

      for (let i = 0; i < tracked.length; i++) {
        if (used.has(i)) continue;
        const t = tracked[i];
        const dist = Math.hypot(detection.x - t.x, detection.y - t.y);
        if (dist < bestDist && dist < 80) { // Match threshold
          bestDist = dist;
          bestMatch = i;
        }
      }

      if (bestMatch !== null) {
        used.add(bestMatch);
        const prev = tracked[bestMatch];
        // Update Kalman estimates
        const kx = updateKalman({ estimate: prev.kx || prev.x, p: prev.kp || 1, vx: prev.vx || 0 }, detection.x);
        const ky = updateKalman({ estimate: prev.ky || prev.y, p: prev.kp || 1, vx: prev.vy || 0 }, detection.y);
        const kw = updateKalman({ estimate: prev.kw || prev.w, p: prev.kp || 1, vx: prev.vw || 0 }, detection.w);
        const kh = updateKalman({ estimate: prev.kh || prev.h, p: prev.kp || 1, vx: prev.vh || 0 }, detection.h);
        
        result.push({
          id: prev.id,
          x: kx.estimate,
          y: ky.estimate,
          w: kw.estimate,
          h: kh.estimate,
          vx: kx.vx,
          vy: ky.vx,
          vw: kw.vx,
          vh: kh.vx,
          kx: kx.estimate,
          ky: ky.estimate,
          kw: kw.estimate,
          kh: kh.estimate,
          kp: kx.p,
        });
      } else {
        // New face
        result.push({
          id: nextFaceIdRef.current++,
          x: detection.x,
          y: detection.y,
          w: detection.w,
          h: detection.h,
          vx: 0,
          vy: 0,
          vw: 0,
          vh: 0,
          kx: detection.x,
          ky: detection.y,
          kw: detection.w,
          kh: detection.h,
          kp: 1,
        });
      }
    }

    trackedFacesRef.current = result;
    return result;
  };

  // Initialise whichever detector is available
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Try native FaceDetector
      if (typeof window !== 'undefined' && 'FaceDetector' in window) {
        try {
          detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
          modeRef.current = 'native';
          return;
        } catch {}
      }

      // 2. Fallback: BlazeFace via TensorFlow.js
      try {
        const [tf, blazeface] = await Promise.all([
          import('@tensorflow/tfjs'),
          import('@tensorflow-models/blazeface'),
        ]);
        await tf.ready();
        if (cancelled) return;
        modelRef.current = await blazeface.load();
        if (cancelled) return;
        modeRef.current = 'blazeface';
      } catch {
        modeRef.current = 'none';
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Track rendered video size
  const updateVideoDims = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const rect = video.getBoundingClientRect();
    setVideoDims({ w: rect.width, h: rect.height });
  }, [videoRef]);

  useEffect(() => {
    updateVideoDims();
    window.addEventListener('resize', updateVideoDims);
    return () => window.removeEventListener('resize', updateVideoDims);
  }, [updateVideoDims]);

  // Detection loop — only restarts when isActive/videoRef change, not on callback changes
  useEffect(() => {
    if (!isActive) {
      setFaces([]);
      onFacesUpdateRef.current?.([]);
      return;
    }

    let stopped = false;

    const detect = async () => {
      if (stopped) return;

      const video = videoRef.current;
      const mode = modeRef.current;

      if (!video || video.readyState < 2 || video.videoWidth === 0 || !mode || mode === 'none') {
        rafRef.current = setTimeout(() => { if (!stopped) requestAnimationFrame(detect); }, 300);
        return;
      }

      const rect = video.getBoundingClientRect();
      const scaleX = rect.width / video.videoWidth;
      const scaleY = rect.height / video.videoHeight;

      try {
        if (mode === 'native') {
          const detected = await detectorRef.current.detect(video);
          if (!stopped) {
            const mapped = detected.map(f => ({
              x: f.boundingBox.x * scaleX,
              y: f.boundingBox.y * scaleY,
              w: f.boundingBox.width * scaleX,
              h: f.boundingBox.height * scaleY,
            }));
            const smoothed = smoothFaces(mapped);
            setFaces(prev => {
              if (prev.length === 0 && smoothed.length === 0) return prev;
              return smoothed;
            });
            onFacesUpdateRef.current?.(smoothed);
            // Show brackets briefly then fade out (iPhone style)
            if (mapped.length > 0) {
              setVisible(true);
              clearTimeout(fadeTimerRef.current);
              fadeTimerRef.current = setTimeout(() => setVisible(false), 1500);
            } else {
              setVisible(false);
            }
          }
        } else if (mode === 'blazeface') {
          const predictions = await modelRef.current.estimateFaces(video, false);
          if (!stopped) {
            const mapped = predictions.map(p => {
              const [x1, y1] = p.topLeft;
              const [x2, y2] = p.bottomRight;
              return {
                x: x1 * scaleX,
                y: y1 * scaleY,
                w: (x2 - x1) * scaleX,
                h: (y2 - y1) * scaleY,
              };
            });
            const smoothed = smoothFaces(mapped);
            setFaces(prev => {
              if (prev.length === 0 && smoothed.length === 0) return prev;
              return smoothed;
            });
            onFacesUpdateRef.current?.(smoothed);
            if (mapped.length > 0) {
              setVisible(true);
              clearTimeout(fadeTimerRef.current);
              fadeTimerRef.current = setTimeout(() => setVisible(false), 1500);
            } else {
              setVisible(false);
            }
          }
        }
      } catch {
        // Silently ignore
      }

      // ~10 fps
      rafRef.current = setTimeout(() => {
        if (!stopped) requestAnimationFrame(detect);
      }, 100);
    };

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      stopped = true;
      clearTimeout(rafRef.current);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(fadeTimerRef.current);
      setFaces([]);
      setVisible(false);
    };
  }, [isActive, videoRef]);

  if (faces.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {faces.map((face, i) => {
            const x = mirrored ? (videoDims.w || 0) - face.x - face.w : face.x;
            const size = Math.max(12, Math.min(face.w * 0.22, 28));
            const corners = [
              { top: 0, left: 0, borderTop: true, borderLeft: true },
              { top: 0, right: 0, borderTop: true, borderRight: true },
              { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
              { bottom: 0, right: 0, borderBottom: true, borderRight: true },
            ];

            return (
              <div key={i} style={{ position: 'absolute', left: x, top: face.y, width: face.w, height: face.h }}>
                {corners.map((corner, ci) => (
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
                ))}
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}