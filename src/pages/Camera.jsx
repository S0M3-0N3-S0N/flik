import React, { useRef, useEffect, useState, useCallback, useReducer } from 'react';
import { RotateCcw, Zap, ZapOff, RefreshCw, Settings, Timer, Check, X, Image, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import FocusSquare from '../components/camera/FocusSquare';
import ExposureSlider from '../components/camera/ExposureSlider';
import SettingsDrawer from '../components/camera/SettingsDrawer';

const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch {} };

const MODES = ['PHOTO'];
const initialSettings = { showGrid: false, timer: 0 };

function settingsReducer(state, action) {
  return { ...state, [action.key]: action.value };
}

export default function CameraPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const longPressRef = useRef(null);
  const exposureThrottleRef = useRef(null);
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(null);
  const viewfinderRef = useRef(null);
  const tapTimeoutRef = useRef(null);
  const initializingRef = useRef(false);
  const countdownTimerRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [modeIndex, setModeIndex] = useState(0);
  const [flashMode, setFlashMode] = useState('off');
  const [zoomValue, setZoomValue] = useState(1);
  const [zoomCaps, setZoomCaps] = useState({ min: 1, max: 1, supported: false });
  const [showZoomOverlay, setShowZoomOverlay] = useState(false);
  const [focusPos, setFocusPos] = useState(null);
  const [afLocked, setAfLocked] = useState(false);
  const [latestCreation, setLatestCreation] = useState(null);
  const [exposure, setExposure] = useState(0);
  const [exposureCaps, setExposureCaps] = useState({ min: -2, max: 2, supported: false });
  const [showExposure, setShowExposure] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supported, setSupported] = useState({ res4k: false, fps60: false });
  const [settings, dispatchSettings] = useReducer(settingsReducer, initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPhoto, setSavedPhoto] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [orientation, setOrientation] = useState(0);

  const mode = MODES[modeIndex];

  // Handle device orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const angle = window.innerHeight > window.innerWidth ? 0 : 90;
      setOrientation(angle);
    };

    handleOrientationChange();
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // ─── Safe camera initialization with guard ───────────────────────────────────
  const startCamera = useCallback(async (facing = facingMode) => {
    // Prevent double initialization
    if (initializingRef.current) return;
    initializingRef.current = true;
    setCameraLoading(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setHasStream(false);

    try {
      // No audio needed for photo mode
      const audioNeeded = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
        },
        audio: audioNeeded,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Safe play with error handling
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.error('Video play failed:', playErr);
          toast.error("Camera error. Please refresh.");
          return;
        }
        setHasStream(true);
      }

      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};

      // Detect hardware capabilities
      setZoomCaps(caps.zoom ? { min: caps.zoom.min, max: caps.zoom.max, supported: true } : { min: 1, max: 4, supported: false });
      setExposureCaps(caps.exposureCompensation
        ? { min: caps.exposureCompensation.min, max: caps.exposureCompensation.max, supported: true }
        : { min: -2, max: 2, supported: false }
      );
      setSupported({
        res4k: !!(caps.height?.max >= 2160),
        fps60: !!(caps.frameRate?.max >= 60),
      });

      // Reset zoom and exposure
      setZoomValue(1);
      setExposure(0);
    } catch (err) {
      console.error('Camera error:', err);
      toast.error("Camera access denied or unavailable.");
    } finally {
      initializingRef.current = false;
      setCameraLoading(false);
    }
  }, [facingMode, modeIndex]);

  useEffect(() => {
    startCamera();
    
    // Fetch latest creation for gallery thumbnail
    base44.entities.Creation.list('-updated_date', 1)
      .then(creations => {
        if (creations && creations.length > 0) {
          setLatestCreation(creations[0]);
        }
      })
      .catch(() => {});

    // Subscribe to new creations
    const unsubscribe = base44.entities.Creation.subscribe((event) => {
      if (event.type === 'create') {
        setLatestCreation(event.data);
      }
    });
    
    return () => {
      initializingRef.current = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearTimeout(countdownTimerRef.current);
      clearTimeout(tapTimeoutRef.current);
      clearTimeout(exposureThrottleRef.current);
      unsubscribe();
    };
  }, []);

  // ─── Flash torch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.applyConstraints({ advanced: [{ torch: flashMode === 'on' }] }).catch(() => {});
  }, [flashMode]);

  // ─── Zoom with throttling ────────────────────────────────────────────────────
  const applyZoom = useCallback((val) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    const clamped = zoomCaps.supported
      ? Math.max(zoomCaps.min, Math.min(zoomCaps.max, val))
      : Math.max(0.5, Math.min(4, val));

    if (zoomCaps.supported) {
      track.applyConstraints({ advanced: [{ zoom: clamped }] }).catch(() => {});
    } else {
      // CSS fallback - scale video without affecting overlays
      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${clamped})`;
      }
    }
    setZoomValue(clamped);
  }, [zoomCaps]);

  const setZoomPreset = (preset) => {
    haptic(6);
    const map = { '.5': 0.5, '1x': 1, '2': 2 };
    applyZoom(map[preset] ?? 1);
    setShowZoomOverlay(true);
    setTimeout(() => setShowZoomOverlay(false), 1200);
  };

  // ─── Pinch to zoom with throttling ───────────────────────────────────────────
  const pinchThrottleRef = useRef(null);
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      clearTimeout(tapTimeoutRef.current);
      pinchStartDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartZoomRef.current = zoomValue;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      // Throttle pinch updates to prevent jank
      if (pinchThrottleRef.current) return;
      pinchThrottleRef.current = setTimeout(() => { pinchThrottleRef.current = null; }, 16);

      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newZoom = Math.max(0.5, Math.min(zoomCaps.supported ? zoomCaps.max : 4, pinchStartZoomRef.current * (dist / pinchStartDistRef.current)));
      applyZoom(newZoom);
      setShowZoomOverlay(true);
    }
  };

  const handleTouchEnd = (e) => {
    if (pinchStartDistRef.current && e.touches.length < 2) {
      pinchStartDistRef.current = null;
      setTimeout(() => setShowZoomOverlay(false), 1200);
    }
  };

  // ─── Single tap to focus ──────────────────────────────────────────────────
  const handleViewfinderTap = (e) => {
    if (pinchStartDistRef.current) return; // Ignore tap if pinching
    if (afLocked) {
      setAfLocked(false);
      setFocusPos(null);
      setShowExposure(false);
      return;
    }

    const rect = viewfinderRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    // Account for CSS zoom transform on video
    const zoomScale = zoomCaps.supported ? 1 : zoomValue;
    const x = (clientX - rect.left) / zoomScale;
    const y = (clientY - rect.top) / zoomScale;

    setFocusPos({ x, y });
    setShowExposure(true);
    haptic(8);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      const caps = track.getCapabilities?.() || {};
      const advanced = {};

      // Normalize to 0-1 range and clamp
      const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

      if (caps.focusMode?.includes('single-shot')) {
        advanced.focusMode = 'single-shot';
      } else if (caps.focusMode?.includes('manual')) {
        advanced.focusMode = 'manual';
      }

      if (caps.focusPointOfInterest) {
        advanced.focusPointOfInterest = { x: normX, y: normY };
      }

      if (caps.exposureMode?.includes('manual')) {
        advanced.exposureMode = 'manual';
      } else if (caps.exposureMode?.includes('continuous')) {
        advanced.exposureMode = 'continuous';
      }

      if (caps.exposurePointOfInterest) {
        advanced.exposurePointOfInterest = { x: normX, y: normY };
      }

      if (Object.keys(advanced).length) {
        track.applyConstraints({ advanced: [advanced] }).catch(() => {});
      }
    }

    clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      if (!afLocked) setShowExposure(false);
    }, 4000);
  };

  // ─── Long press for AE/AF lock ────────────────────────────────────────────────
  const handleLongPressStart = (e) => {
    if (e.touches?.length > 1) return;
    longPressRef.current = setTimeout(() => {
      haptic([30, 20, 30]);
      setAfLocked(true);
      clearTimeout(tapTimeoutRef.current);
    }, 800);
  };
  const handleLongPressEnd = () => clearTimeout(longPressRef.current);

  // ─── Exposure with proper throttling and cleanup ─────────────────────────────
  const handleExposureChange = useCallback((val) => {
    const min = exposureCaps.min;
    const max = exposureCaps.max;
    const clamped = Math.max(min, Math.min(max, val));
    setExposure(clamped);

    clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      if (!afLocked) setShowExposure(false);
    }, 4000);

    // Clear old throttle
    if (exposureThrottleRef.current) clearTimeout(exposureThrottleRef.current);

    exposureThrottleRef.current = setTimeout(() => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;

      if (exposureCaps.supported) {
        track.applyConstraints({ advanced: [{ exposureCompensation: clamped }] }).catch(() => {});
      } else {
        const brightness = 1 + (clamped / 2) * 0.8;
        if (videoRef.current) {
          videoRef.current.style.filter = `brightness(${brightness})`;
        }
      }
    }, 50);
  }, [exposureCaps, afLocked]);

  // ─── Mode switching ──────────────────────────────────────────────────────────
  const switchMode = (idx) => {
    if (idx === modeIndex) return;
    haptic(12);

    // Clear any pending countdown
    if (countdown > 0) {
      clearTimeout(countdownTimerRef.current);
      setCountdown(0);
    }

    setModeIndex(idx);
  };

  const swipeStartX = useRef(null);
  const handleSwipeStart = (e) => { swipeStartX.current = e.touches?.[0]?.clientX ?? e.clientX; };
  const handleSwipeEnd = (e) => {
    if (swipeStartX.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? e.clientX;
    const diff = swipeStartX.current - endX;
    if (Math.abs(diff) > 60) {
      switchMode(diff > 0 ? Math.min(MODES.length - 1, modeIndex + 1) : Math.max(0, modeIndex - 1));
    }
    swipeStartX.current = null;
  };

  // ─── Countdown with proper cleanup ────────────────────────────────────────────
  const runCountdown = (action) => {
    if (settings.timer === 0) { action(); return; }
    let remaining = settings.timer;
    setCountdown(remaining);
    haptic(20);

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      haptic(20);
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current);
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setPhoto(dataUrl);
      setSavedPhoto(null);
      // Auto-save to gallery
      autoSavePhoto(dataUrl);
    });
  };

  const autoSavePhoto = async (photoData) => {
    setIsSaving(true);
    toast.loading("Saving to gallery...", { id: 'photo-save' });
    try {
      const res = await fetch(photoData);
      const blob = await res.blob();
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Creation.create({
        type: 'image',
        url: file_url,
        thumbnail_url: file_url,
        title: `Photo ${new Date().toLocaleDateString()}`,
        metadata: { source: 'camera', facing_mode: facingMode },
      });

      queryClient.invalidateQueries({ queryKey: ['creations'] });
      setSavedPhoto(true);
      toast.success("Saved to gallery!", { id: 'photo-save' });
    } catch (err) {
      console.error('Auto-save error:', err);
      toast.error("Failed to save. Try again manually.", { id: 'photo-save' });
      setSavedPhoto(null);
    } finally {
      setIsSaving(false);
    }
  };





  const retake = () => {
    setPhoto(null);
    setSavedPhoto(null);
    setExposure(0);
    if (videoRef.current) {
      videoRef.current.style.filter = '';
      videoRef.current.style.transform = '';
    }
    setZoomValue(1);
    startCamera(facingMode);
  };

  const flipCamera = () => {
    haptic(10);
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  // ─── Handle settings changes safely ────────────────────────────────────────────
  const handleSettingChange = (key, value) => {
    dispatchSettings({ key, value });
  };

  const flashIcon = {
    off: <ZapOff className="w-4 h-4 text-white/70" />,
    on: <Zap className="w-4 h-4 text-[#FFB800]" fill="currentColor" />,
    auto: <Zap className="w-4 h-4 text-white" />,
  };

  const zoomPresets = ['.5', '1x', '2'];
  const activePreset = zoomPresets.find(p => {
    const map = { '.5': 0.5, '1x': 1, '2': 2 };
    return Math.abs(map[p] - zoomValue) < 0.08;
  });

  return (
    <div className="fixed inset-0 bg-black select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Loading state */}
      <AnimatePresence>
        {cameraLoading && !hasStream && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white text-sm">Starting camera...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Viewfinder (fullscreen) ── */}
      <div
        ref={viewfinderRef}
        className="absolute inset-0 overflow-hidden"
        onTouchStart={(e) => {
          handleTouchStart(e);
          handleSwipeStart(e);
          handleLongPressStart(e);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => {
          handleTouchEnd(e);
          handleSwipeEnd(e);
          handleLongPressEnd();
          if (!pinchStartDistRef.current && e.changedTouches.length === 1 && e.touches.length === 0) {
            handleViewfinderTap(e);
          }
        }}
        onClick={(e) => {
          if (e.pointerType !== 'touch') {
            handleViewfinderTap(e);
          }
        }}
      >
        {photo ? (
          <img src={photo} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover transition-all duration-300"
            autoPlay
            playsInline
            muted
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Grid */}
        {settings.showGrid && !photo && (
          <div className="absolute inset-0 pointer-events-none" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
            {[...Array(9)].map((_, i) => <div key={i} className="border border-white/20" />)}
          </div>
        )}

        {/* Focus square */}
        {!photo && <FocusSquare position={focusPos} locked={afLocked} />}

        {/* Exposure slider */}
        <AnimatePresence>
          {showExposure && focusPos && !photo && (
            <ExposureSlider
              position={focusPos}
              value={exposure}
              min={exposureCaps.min}
              max={exposureCaps.max}
              onChange={handleExposureChange}
            />
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

        {/* Zoom bubble */}
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



        {/* Top controls */}
        {!photo && (
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5 z-50 pointer-events-auto">
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => { haptic(8); navigate(createPageUrl('Editor')); }}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </motion.button>

            <motion.button whileTap={{ scale: 0.85 }} onClick={() => { haptic(8); setFlashMode(m => m === 'off' ? 'on' : m === 'on' ? 'auto' : 'off'); }}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              {flashIcon[flashMode]}
            </motion.button>

            <div className="flex items-center gap-3">
              {settings.timer > 0 && (
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1">
                  <Timer className="w-3 h-3 text-[#FF6B35]" />
                  <span className="text-[#FF6B35] text-xs font-bold">{settings.timer}s</span>
                </div>
              )}
              <motion.button whileTap={{ scale: 0.85 }}
                onClick={() => setSettingsOpen(true)}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                <Settings className="w-4 h-4 text-white/70" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Zoom capsule */}
        {!photo && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 110, transform: `translateX(-50%)` }}>
            <div className="flex items-center gap-0.5 bg-black/50 backdrop-blur-xl rounded-full px-1.5 py-1 border border-white/10">
              {zoomPresets.map(z => {
                const isActive = z === activePreset;
                return (
                  <motion.button key={z} whileTap={{ scale: 0.85 }} onClick={() => setZoomPreset(z)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-white/20 text-white' : 'text-white/50'}`}
                    style={isActive ? { boxShadow: 'inset 0 0 0 1px rgba(255,107,53,0.5)' } : {}}>
                    {z}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls (floating overlay) ── */}
      <div
        className="absolute left-0 right-0 bottom-0 flex flex-col items-center gap-3 transition-all duration-300 ease-out bg-transparent pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        {!photo ? (
          <>


            {/* Shutter row */}
            <div className="w-full flex items-center justify-around px-8">
              <button 
                onClick={() => navigate(createPageUrl("Profile"))}
                className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 transition-all"
              >
                {latestCreation?.thumbnail_url || latestCreation?.url ? (
                  <img 
                    src={latestCreation.thumbnail_url || latestCreation.url} 
                    alt="Latest" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5" />
                )}
              </button>

              {/* Shutter */}
              <motion.button whileTap={{ scale: 0.9 }} onClick={takePhoto}
                disabled={!hasStream || countdown > 0 || cameraLoading}
                className="w-20 h-20 rounded-full disabled:opacity-40"
                style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}>
                <div className="w-full h-full rounded-full bg-white" />
              </motion.button>

              {/* Flip */}
              <motion.button whileTap={{ scale: 0.85, rotate: 180 }} onClick={flipCamera}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white" />
              </motion.button>
            </div>
          </>
        ) : (
          <>
            <p className="text-white/40 text-xs tracking-widest uppercase">{isSaving ? 'Saving...' : 'Saved to gallery'}</p>
            <div className="w-full flex flex-col items-center gap-3 px-8">
              <div className="flex items-center justify-center w-full gap-6">
                <motion.button whileTap={{ scale: 0.85 }} onClick={retake} className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <RotateCcw className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white/50 text-xs">Retake</span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.9 }}
                  className="w-20 h-20 rounded-full"
                  style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}
                  disabled>
                  <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-7 h-7 text-green-400" />
                    )}
                  </div>
                </motion.button>

                <div className="w-14 h-14" />
              </div>

              <div className="flex gap-3 w-full max-w-sm justify-center">
                <motion.button whileTap={{ scale: 0.95 }} 
                  onClick={() => { haptic(10); localStorage.setItem('capturedPhoto', photo); navigate(createPageUrl('Editor')); }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-white/15 to-white/5 hover:from-white/25 hover:to-white/10 border border-white/20 hover:border-white/40 text-white font-medium transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                  <Image className="w-4 h-4" />
                  <span>Photo Studio</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} 
                  onClick={() => { haptic(10); localStorage.setItem('capturedPhoto', photo); navigate(createPageUrl('Generate')); }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF6B35]/30 to-[#F72C25]/20 hover:from-[#FF6B35]/40 hover:to-[#F72C25]/30 border border-[#FF6B35]/50 hover:border-[#FF6B35]/70 text-white font-medium transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                  <Wand2 className="w-4 h-4" />
                  <span>Imagine AI</span>
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={handleSettingChange}
      />
    </div>
  );
}