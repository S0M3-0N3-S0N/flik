import React, { useRef, useEffect, useState, useCallback, useReducer } from 'react';
import { RotateCcw, Zap, ZapOff, Grid3X3, FlipHorizontal, Circle, Square, Settings, Timer, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { toast } from "sonner";
import FocusSquare from '../components/camera/FocusSquare';
import ExposureSlider from '../components/camera/ExposureSlider';
import SettingsDrawer from '../components/camera/SettingsDrawer';

const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch {} };

const MODES = ['VIDEO', 'PHOTO'];

const initialSettings = { showGrid: false, timer: 0, resolution: 1080, fps: 30 };

function settingsReducer(state, action) {
  return { ...state, [action.key]: action.value };
}

export default function CameraPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);
  const longPressRef = useRef(null);
  const exposureThrottleRef = useRef(null);
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(null);
  const viewfinderRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [modeIndex, setModeIndex] = useState(1); // 0=VIDEO, 1=PHOTO
  const [flashMode, setFlashMode] = useState('off'); // 'off' | 'on' | 'auto'
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [zoomValue, setZoomValue] = useState(1);
  const [zoomCaps, setZoomCaps] = useState({ min: 1, max: 1, supported: false });
  const [showZoomOverlay, setShowZoomOverlay] = useState(false);
  const [focusPos, setFocusPos] = useState(null);
  const [afLocked, setAfLocked] = useState(false);
  const [exposure, setExposure] = useState(0);
  const [exposureCaps, setExposureCaps] = useState({ min: -2, max: 2, supported: false });
  const [showExposure, setShowExposure] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supported, setSupported] = useState({ res4k: false, fps60: false });
  const [settings, dispatchSettings] = useReducer(settingsReducer, initialSettings);

  const mode = MODES[modeIndex];

  // ─── Camera start ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing = facingMode, res = settings.resolution, fps = settings.fps) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setHasStream(false);
    try {
      const heightMap = { 720: 720, 1080: 1080, 2160: 2160 };
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: heightMap[res] === 720 ? 1280 : heightMap[res] === 2160 ? 3840 : 1920 },
          height: { ideal: heightMap[res] },
          frameRate: { ideal: fps },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasStream(true);
      }
      // Detect capabilities
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      if (caps.zoom) {
        setZoomCaps({ min: caps.zoom.min, max: caps.zoom.max, supported: true });
      }
      if (caps.exposureCompensation) {
        setExposureCaps({ min: caps.exposureCompensation.min, max: caps.exposureCompensation.max, supported: true });
      }
      // Check 4K / 60fps support
      setSupported({
        res4k: !!(caps.height?.max >= 2160),
        fps60: !!(caps.frameRate?.max >= 60),
      });
    } catch {
      toast.error("Could not access camera. Please check permissions.");
    }
  }, [facingMode, settings.resolution, settings.fps]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
    };
  }, []);

  // ─── Flash torch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = flashMode === 'on';
    track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {});
  }, [flashMode]);

  const cycleFlash = () => {
    haptic(8);
    setFlashMode(m => m === 'off' ? 'on' : m === 'on' ? 'auto' : 'off');
  };

  // ─── Zoom ─────────────────────────────────────────────────────────────────────
  const applyZoom = useCallback((val) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    if (zoomCaps.supported) {
      const clamped = Math.max(zoomCaps.min, Math.min(zoomCaps.max, val));
      track.applyConstraints({ advanced: [{ zoom: clamped }] }).catch(() => {});
      setZoomValue(clamped);
    } else {
      // CSS digital zoom fallback
      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${val})`;
        videoRef.current.style.transformOrigin = 'center center';
      }
      setZoomValue(val);
    }
  }, [zoomCaps]);

  const setZoomPreset = (preset) => {
    haptic(6);
    const map = { '.5': 0.5, '1x': 1, '2': 2 };
    const v = map[preset] || 1;
    const clamped = Math.max(zoomCaps.supported ? zoomCaps.min : 0.5, Math.min(zoomCaps.supported ? zoomCaps.max : 4, v));
    applyZoom(clamped);
    setShowZoomOverlay(true);
    setTimeout(() => setShowZoomOverlay(false), 1200);
  };

  // ─── Pinch to zoom ────────────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartZoomRef.current = zoomValue;
      e.preventDefault();
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / pinchStartDistRef.current;
      const newZoom = Math.max(0.5, Math.min(zoomCaps.supported ? zoomCaps.max : 4, pinchStartZoomRef.current * scale));
      // Snap to presets
      const snapped = [0.5, 1, 2].reduce((prev, curr) =>
        Math.abs(curr - newZoom) < 0.12 ? curr : prev, newZoom
      );
      applyZoom(snapped);
      setShowZoomOverlay(true);
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
      setTimeout(() => setShowZoomOverlay(false), 1200);
    }
  };

  // ─── Tap to focus + exposure ──────────────────────────────────────────────────
  const handleViewfinderTap = (e) => {
    if (afLocked) {
      setAfLocked(false);
      setFocusPos(null);
      setShowExposure(false);
      clearTimeout(longPressRef.current);
      return;
    }
    const rect = viewfinderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setFocusPos({ x, y });
    setShowExposure(true);
    haptic(8);

    // Apply focus constraints
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      const caps = track.getCapabilities?.() || {};
      const constraints = {};
      if (caps.focusMode?.includes('manual') || caps.focusMode?.includes('single-shot')) {
        constraints.focusMode = 'single-shot';
        constraints.focusDistance = 0.5;
      }
      if (Object.keys(constraints).length) {
        track.applyConstraints({ advanced: [constraints] }).catch(() => {});
      }
    }
  };

  const handleLongPress = (e) => {
    longPressRef.current = setTimeout(() => {
      haptic([30, 20, 30]);
      setAfLocked(true);
    }, 800);
  };
  const handleLongPressEnd = () => clearTimeout(longPressRef.current);

  // ─── Exposure ─────────────────────────────────────────────────────────────────
  const handleExposureChange = useCallback((val) => {
    const clamped = Math.max(exposureCaps.min, Math.min(exposureCaps.max, val));
    setExposure(clamped);
    if (exposureThrottleRef.current) clearTimeout(exposureThrottleRef.current);
    exposureThrottleRef.current = setTimeout(() => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track && exposureCaps.supported) {
        track.applyConstraints({ advanced: [{ exposureCompensation: clamped }] }).catch(() => {});
      }
    }, 50);
  }, [exposureCaps]);

  // ─── Mode switching ───────────────────────────────────────────────────────────
  const switchMode = (idx) => {
    if (idx === modeIndex) return;
    haptic(12);
    if (isRecording) stopRecording();
    setModeIndex(idx);
  };

  // ─── Swipe to change mode ─────────────────────────────────────────────────────
  const swipeStartX = useRef(null);
  const handleSwipeStart = (e) => { swipeStartX.current = e.touches?.[0]?.clientX ?? e.clientX; };
  const handleSwipeEnd = (e) => {
    if (swipeStartX.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? e.clientX;
    const diff = swipeStartX.current - endX;
    if (Math.abs(diff) > 50) {
      const next = diff > 0 ? Math.min(MODES.length - 1, modeIndex + 1) : Math.max(0, modeIndex - 1);
      switchMode(next);
    }
    swipeStartX.current = null;
  };

  // ─── Countdown ────────────────────────────────────────────────────────────────
  const runCountdown = (action) => {
    if (settings.timer === 0) { action(); return; }
    let remaining = settings.timer;
    setCountdown(remaining);
    haptic(20);
    const interval = setInterval(() => {
      remaining -= 1;
      haptic(20);
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setCountdown(0);
        action();
      }
    }, 1000);
  };

  // ─── Photo capture ────────────────────────────────────────────────────────────
  const takePhoto = () => {
    haptic([10, 5, 30]);
    runCountdown(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      setPhoto(canvas.toDataURL('image/png'));
    });
  };

  // ─── Video recording ──────────────────────────────────────────────────────────
  const startRecording = () => {
    if (!streamRef.current) return;
    haptic([15, 10, 15]);
    runCountdown(() => {
      recordedChunksRef.current = [];
      const mimeType = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const link = document.createElement('a');
        link.href = url;
        link.download = `flik_video_${Date.now()}.${ext}`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Video saved!");
      };
      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    });
  };

  const stopRecording = () => {
    haptic([15, 10, 15]);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const togglePause = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    haptic(8);
    if (isPaused) {
      rec.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      rec.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  // ─── Retake / download ────────────────────────────────────────────────────────
  const retake = () => { setPhoto(null); startCamera(facingMode); };
  const download = () => {
    haptic(15);
    const link = document.createElement('a');
    link.href = photo;
    link.download = `flik_photo_${Date.now()}.png`;
    link.click();
    toast.success("Photo saved!");
  };

  const flipCamera = () => {
    haptic(10);
    if (isRecording) stopRecording();
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const flashIcon = { off: <ZapOff className="w-4 h-4 text-white/70" />, on: <Zap className="w-4 h-4 text-[#FFB800]" fill="currentColor" />, auto: <Zap className="w-4 h-4 text-white" /> };

  const zoomPresets = ['.5', '1x', '2'];
  const activePreset = zoomPresets.find(p => {
    const map = { '.5': 0.5, '1x': 1, '2': 2 };
    return Math.abs(map[p] - zoomValue) < 0.08;
  });

  return (
    <div className="fixed inset-0 bg-black flex flex-col select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* ── Viewfinder ── */}
      <div
        ref={viewfinderRef}
        className="relative flex-1 overflow-hidden"
        onTouchStart={(e) => { handleTouchStart(e); handleSwipeStart(e); handleLongPress(e); if (e.touches.length === 1) handleViewfinderTap(e); }}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => { handleTouchEnd(e); handleSwipeEnd(e); handleLongPressEnd(); }}
        onClick={handleViewfinderTap}
      >
        {photo ? (
          <img src={photo} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} className="w-full h-full object-cover transition-transform duration-300" autoPlay playsInline muted />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Grid */}
        {settings.showGrid && !photo && (
          <div className="absolute inset-0 pointer-events-none grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
            {[...Array(9)].map((_, i) => <div key={i} className="border border-white/20" />)}
          </div>
        )}

        {/* Focus square */}
        <FocusSquare position={focusPos} locked={afLocked} />

        {/* Exposure slider */}
        <AnimatePresence>
          {showExposure && focusPos && !photo && (
            <ExposureSlider position={focusPos} value={exposure} onChange={handleExposureChange} />
          )}
        </AnimatePresence>

        {/* Countdown overlay */}
        <AnimatePresence>
          {countdown > 0 && (
            <motion.div
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-white font-bold drop-shadow-2xl" style={{ fontSize: 120 }}>{countdown}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zoom overlay while pinching */}
        <AnimatePresence>
          {showZoomOverlay && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-black/50 backdrop-blur-md rounded-full px-5 py-2"
            >
              <span className="text-white font-bold text-lg">{zoomValue.toFixed(1)}×</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording timer */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-1.5"
            >
              <motion.div
                animate={{ opacity: isPaused ? 0.3 : [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-2 h-2 rounded-full bg-red-500"
              />
              <span className="text-white text-sm font-mono font-semibold">{formatTime(recordingTime)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top control bar */}
        {!photo && (
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5">
            {/* Flash */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={cycleFlash}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
            >
              {flashIcon[flashMode]}
            </motion.button>

            <div className="flex items-center gap-3">
              {/* Timer indicator */}
              {settings.timer > 0 && (
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1">
                  <Timer className="w-3 h-3 text-[#FF6B35]" />
                  <span className="text-[#FF6B35] text-xs font-bold">{settings.timer}s</span>
                </div>
              )}

              {/* Grid toggle */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => { haptic(8); dispatchSettings({ key: 'showGrid', value: !settings.showGrid }); }}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
              >
                <Grid3X3 className={`w-4 h-4 ${settings.showGrid ? 'text-[#FF6B35]' : 'text-white/70'}`} />
              </motion.button>

              {/* Settings */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setSettingsOpen(true)}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
              >
                <Settings className="w-4 h-4 text-white/70" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Zoom capsule */}
        {!photo && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-0.5 bg-black/50 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/10">
              {zoomPresets.map(z => {
                const isActive = z === activePreset;
                return (
                  <motion.button
                    key={z}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setZoomPreset(z)}
                    className={`w-10 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive ? 'bg-white/20 text-white shadow-inner' : 'text-white/50'
                    }`}
                    style={isActive ? { boxShadow: 'inset 0 0 0 1px rgba(255,107,53,0.5)' } : {}}
                  >
                    {z}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div
        className="bg-black/90 backdrop-blur-xl flex flex-col items-center pt-4 gap-3 border-t border-white/5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        {!photo ? (
          <>
            {/* Mode selector */}
            <div className="relative flex items-center">
              <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
                {MODES.map((m, i) => (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => switchMode(i)}
                    className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
                      modeIndex === i
                        ? 'bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white shadow-lg'
                        : 'text-white/50'
                    }`}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Shutter row */}
            <div className="w-full flex items-center justify-around px-8">
              {/* Thumbnail / pause-resume */}
              <div className="w-14 h-14 flex items-center justify-center">
                {isRecording ? (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={togglePause}
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
                  >
                    {isPaused
                      ? <Play className="w-5 h-5 text-white" fill="currentColor" />
                      : <Pause className="w-5 h-5 text-white" fill="currentColor" />
                    }
                  </motion.button>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10" />
                )}
              </div>

              {/* Main shutter */}
              {mode === 'PHOTO' ? (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={takePhoto}
                  disabled={!hasStream || countdown > 0}
                  className="w-20 h-20 rounded-full disabled:opacity-40"
                  style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}
                >
                  <div className="w-full h-full rounded-full bg-white" />
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!hasStream || countdown > 0}
                  className="w-20 h-20 rounded-full disabled:opacity-40"
                  style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}
                >
                  <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {isRecording ? (
                        <motion.div key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Square className="w-7 h-7 text-red-500" fill="currentColor" />
                        </motion.div>
                      ) : (
                        <motion.div key="rec" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Circle className="w-10 h-10 text-red-500" fill="currentColor" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              )}

              {/* Flip */}
              <motion.button
                whileTap={{ scale: 0.85, rotate: 180 }}
                onClick={flipCamera}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
              >
                <FlipHorizontal className="w-6 h-6 text-white" />
              </motion.button>
            </div>
          </>
        ) : (
          <>
            <p className="text-white/40 text-xs tracking-widest uppercase">Photo captured</p>
            <div className="w-full flex items-center justify-around px-8">
              <motion.button whileTap={{ scale: 0.85 }} onClick={retake} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <span className="text-white/50 text-xs">Retake</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={download}
                className="w-20 h-20 rounded-full"
                style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}
              >
                <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                  <span className="text-white font-bold text-xs tracking-wide">SAVE</span>
                </div>
              </motion.button>

              <div className="w-14 h-14" />
            </div>
          </>
        )}
      </div>

      {/* Settings drawer */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={(key, value) => { dispatchSettings({ key, value }); if (key === 'resolution' || key === 'fps') startCamera(facingMode, key === 'resolution' ? value : settings.resolution, key === 'fps' ? value : settings.fps); }}
        supported={supported}
      />
    </div>
  );
}