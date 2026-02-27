import React, { useRef, useEffect, useState, useCallback, useReducer, useMemo } from 'react';
import { X, Zap, ZapOff, RefreshCw, Settings, Timer, Check, Image as ImageIcon, Wand2, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import FocusSquare from '@/components/camera/FocusSquare';
import ExposureSlider from '@/components/camera/ExposureSlider';
import GlassButton from '@/components/camera/GlassButton';
import GlassPill from '@/components/camera/GlassPill';
import QuickControlsSheet from '@/components/camera/QuickControlsSheet';
import { CameraAdapter } from '@/components/camera/CameraAdapter';
import { PHOTO_STYLES } from '@/components/camera/PhotoStyles';

const haptic = (pattern = 10) => {
  try {
    navigator.vibrate?.(pattern);
  } catch (e) {
    // Silent fail for unsupported browsers
  }
};

const MODES = ['PHOTO'];
const initialSettings = { showGrid: false, timer: 0 };

function settingsReducer(state, action) {
  return { ...state, [action.key]: action.value };
}

const useCleanupTimeout = () => {
  const timeoutsRef = useRef([]);

  const setTimeout_ = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  return { setTimeout: setTimeout_, clearAll };
};

export default function Camera() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setTimeout: setTimeoutSafe, clearAll: clearAllTimeouts } = useCleanupTimeout();

  // ─── Refs ────────────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const viewfinderRef = useRef(null);
  const initializingRef = useRef(false);
  const longPressRef = useRef(null);
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(null);
  const pinchThrottleRef = useRef(null);
  const exposureThrottleRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const swipeStartXRef = useRef(null);

  // ─── State ───────────────────────────────────────────────────────────────────
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
  const [quickControlsOpen, setQuickControlsOpen] = useState(false);
  const [settings, dispatchSettings] = useReducer(settingsReducer, initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPhoto, setSavedPhoto] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [videoCapabilities, setVideoCapabilities] = useState(null);
  const [highRes, setHighRes] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(PHOTO_STYLES[0]);
  const [nightMode, setNightMode] = useState('off');
  const [shutterFlash, setShutterFlash] = useState(false);

  const mode = MODES[modeIndex];

  // ─── Camera initialization (safe, no double-start) ──────────────────────────
  const startCamera = useCallback(
    async (facing = facingMode) => {
      if (initializingRef.current) return;
      initializingRef.current = true;
      setCameraLoading(true);

      // Stop existing stream
      if (streamRef.current) {
        CameraAdapter.stopStream(streamRef.current);
      }
      setHasStream(false);

      try {
        const result = await CameraAdapter.requestPermission(facing);
        if (!result.success) {
          toast.error('Camera access denied. Please check permissions.');
          return;
        }

        streamRef.current = result.stream;

        if (videoRef.current) {
          videoRef.current.srcObject = result.stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.error('Video play error:', playErr);
            toast.error('Camera playback failed.');
            return;
          }
          setHasStream(true);
        }

        const caps = CameraAdapter.getCapabilities(result.stream);
        setVideoCapabilities(caps);
        setZoomCaps(
          caps.zoom
            ? { min: caps.zoom.min, max: caps.zoom.max, supported: true }
            : { min: 1, max: 4, supported: false }
        );
        setExposureCaps(
          caps.exposureCompensation
            ? { min: caps.exposureCompensation.min, max: caps.exposureCompensation.max, supported: true }
            : { min: -2, max: 2, supported: false }
        );

        setZoomValue(1);
        setExposure(0);
      } catch (err) {
        console.error('Camera start error:', err);
        toast.error('Camera unavailable.');
      } finally {
        initializingRef.current = false;
        setCameraLoading(false);
      }
    },
    [facingMode]
  );

  // ─── Initialize & cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    startCamera();

    // Fetch latest creation
    base44.entities.Creation.list('-updated_date', 1)
      .then(creations => {
        if (creations?.[0]) setLatestCreation(creations[0]);
      })
      .catch(() => {});

    // Subscribe to new creations
    const unsubscribe = base44.entities.Creation.subscribe(event => {
      if (event.type === 'create') {
        setLatestCreation(event.data);
      }
    });

    return () => {
      initializingRef.current = false;
      if (streamRef.current) CameraAdapter.stopStream(streamRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      clearAllTimeouts();
      unsubscribe?.();
    };
  }, []);

  // ─── Flash/torch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    CameraAdapter.applyConstraints(streamRef.current, {
      advanced: [{ torch: flashMode === 'on' }],
    });
  }, [flashMode]);

  // ─── Zoom ────────────────────────────────────────────────────────────────────
  const applyZoom = useCallback(
    val => {
      const clamped = zoomCaps.supported
        ? Math.max(zoomCaps.min, Math.min(zoomCaps.max, val))
        : Math.max(0.5, Math.min(4, val));

      if (zoomCaps.supported) {
        CameraAdapter.applyConstraints(streamRef.current, { advanced: [{ zoom: clamped }] });
      } else if (videoRef.current) {
        videoRef.current.style.transform = `scale(${clamped})`;
      }

      setZoomValue(clamped);
    },
    [zoomCaps]
  );

  const setZoomPreset = useCallback(preset => {
    haptic(6);
    const map = { '.5': 0.5, '1x': 1, '2': 2 };
    applyZoom(map[preset] ?? 1);
    setShowZoomOverlay(true);
    setTimeoutSafe(() => setShowZoomOverlay(false), 1200);
  }, [applyZoom, setTimeoutSafe]);

  // ─── Pinch to zoom ───────────────────────────────────────────────────────────
  const handleTouchStart = useCallback(e => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartZoomRef.current = zoomValue;
    }
  }, [zoomValue]);

  const handleTouchMove = useCallback(
    e => {
      if (e.touches.length === 2 && pinchStartDistRef.current) {
        // Throttle pinch updates (60fps max)
        if (pinchThrottleRef.current) return;
        pinchThrottleRef.current = setTimeoutSafe(() => {
          pinchThrottleRef.current = null;
        }, 16);

        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const newZoom = Math.max(
          0.5,
          Math.min(
            zoomCaps.supported ? zoomCaps.max : 4,
            pinchStartZoomRef.current * (dist / pinchStartDistRef.current)
          )
        );
        applyZoom(newZoom);
        setShowZoomOverlay(true);
      }
    },
    [applyZoom, zoomCaps, setTimeoutSafe]
  );

  const handleTouchEnd = useCallback(
    e => {
      if (pinchStartDistRef.current && e.touches.length < 2) {
        pinchStartDistRef.current = null;
        setTimeoutSafe(() => setShowZoomOverlay(false), 1200);
      }
    },
    [setTimeoutSafe]
  );

  // ─── Tap to focus & expose ───────────────────────────────────────────────────
  const handleViewfinderTap = useCallback(
    e => {
      if (pinchStartDistRef.current || afLocked) {
        if (afLocked) {
          setAfLocked(false);
          setFocusPos(null);
          setShowExposure(false);
        }
        return;
      }

      const rect = viewfinderRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clientX = e.changedTouches?.[0]?.clientX ?? e.clientX;
      const clientY = e.changedTouches?.[0]?.clientY ?? e.clientY;

      const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

      setFocusPos({ x: normX * rect.width + rect.left, y: normY * rect.height + rect.top });
      setShowExposure(true);
      haptic(8);

      const track = streamRef.current?.getVideoTracks?.()?.[0];
      if (track) {
        const caps = track.getCapabilities?.() || {};
        const advanced = {};

        if (caps.focusMode?.includes('single-shot')) {
          advanced.focusMode = 'single-shot';
        }
        if (caps.focusPointOfInterest) {
          advanced.focusPointOfInterest = { x: normX, y: normY };
        }
        if (caps.exposureMode?.includes('continuous')) {
          advanced.exposureMode = 'continuous';
        }
        if (caps.exposurePointOfInterest) {
          advanced.exposurePointOfInterest = { x: normX, y: normY };
        }

        if (Object.keys(advanced).length) {
          track.applyConstraints({ advanced: [advanced] }).catch(() => {});
        }
      }

      setTimeoutSafe(() => {
        if (!afLocked) setShowExposure(false);
      }, 4000);
    },
    [afLocked, setTimeoutSafe]
  );

  // ─── Long press for AE/AF lock ───────────────────────────────────────────────
  const handleLongPressStart = useCallback(e => {
    if (e.touches?.length > 1) return;
    longPressRef.current = setTimeoutSafe(() => {
      haptic([30, 20, 30]);
      setAfLocked(true);
    }, 800);
  }, [setTimeoutSafe]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }, []);

  // ─── Exposure adjustment ─────────────────────────────────────────────────────
  const handleExposureChange = useCallback(
    val => {
      const clamped = Math.max(exposureCaps.min, Math.min(exposureCaps.max, val));
      setExposure(clamped);

      setTimeoutSafe(() => {
        if (!afLocked) setShowExposure(false);
      }, 4000);

      if (exposureThrottleRef.current) clearTimeout(exposureThrottleRef.current);

      exposureThrottleRef.current = setTimeoutSafe(() => {
        const track = streamRef.current?.getVideoTracks?.()?.[0];
        if (!track) return;

        if (exposureCaps.supported) {
          track.applyConstraints({ advanced: [{ exposureCompensation: clamped }] }).catch(() => {});
        } else if (videoRef.current) {
          const brightness = 1 + (clamped / 2) * 0.8;
          videoRef.current.style.filter = `brightness(${brightness})`;
        }
      }, 50);
    },
    [exposureCaps, afLocked, setTimeoutSafe]
  );

  // ─── Countdown with proper cleanup ────────────────────────────────────────────
  const runCountdown = useCallback(
    action => {
      if (settings.timer === 0) {
        action();
        return;
      }

      let remaining = settings.timer;
      setCountdown(remaining);
      haptic(20);

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        haptic(20);
        setCountdown(remaining);

        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setCountdown(0);
          action();
        }
      }, 1000);
    },
    [settings.timer]
  );

  // ─── Photo capture (blob-first pipeline) ──────────────────────────────────────
  const takePhoto = useCallback(async () => {
    haptic([10, 5, 30]);

    runCountdown(async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        // Blob-first pipeline (better performance than base64)
        const blob = await CameraAdapter.captureFrame(video);
        const previewUrl = URL.createObjectURL(blob);

        // Apply style filter to preview
        const styledBlob = await applyStyleToCapture(blob, selectedStyle);
        const styledUrl = URL.createObjectURL(styledBlob);

        setPhoto(styledUrl);
        setSavedPhoto(null);

        // Subtle shutter flash
        setShutterFlash(true);
        setTimeoutSafe(() => setShutterFlash(false), 100);
      } catch (err) {
        console.error('Capture error:', err);
        toast.error('Capture failed.');
      }
    });
  }, [runCountdown, selectedStyle, setTimeoutSafe]);

  // ─── Apply style filter to blob ───────────────────────────────────────────────
  const applyStyleToCapture = useCallback(async (blob, style) => {
    if (style.name === 'Standard') return blob;

    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          ctx.filter = style.filter;
          ctx.globalAlpha = style.intensity;
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(resolve, 'image/jpeg', 0.92);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(blob);
    });
  }, []);

  // ─── Save photo (blob-based) ──────────────────────────────────────────────────
  const savePhoto = useCallback(async () => {
    if (!photo || isSaving) return;

    haptic(15);
    setIsSaving(true);
    toast.loading('Saving photo...', { id: 'photo-save' });

    try {
      const res = await fetch(photo);
      const blob = await res.blob();
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Creation.create({
        type: 'image',
        url: file_url,
        thumbnail_url: file_url,
        title: `Photo ${new Date().toLocaleDateString()}`,
        metadata: {
          source: 'camera',
          facing_mode: facingMode,
          style: selectedStyle.name,
          night_mode: nightMode,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['creations'] });
      setSavedPhoto(true);
      toast.success('Saved!', { id: 'photo-save' });

      // Auto-close after 2s
      setTimeoutSafe(() => {
        setPhoto(null);
        setSavedPhoto(null);
      }, 2000);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Save failed.', { id: 'photo-save' });
    } finally {
      setIsSaving(false);
    }
  }, [photo, isSaving, facingMode, selectedStyle, nightMode, queryClient, setTimeoutSafe]);

  // ─── Retake & flip ───────────────────────────────────────────────────────────
  const retake = useCallback(() => {
    setPhoto(null);
    setSavedPhoto(null);
    setExposure(0);
    if (videoRef.current) {
      videoRef.current.style.filter = '';
      videoRef.current.style.transform = '';
    }
    setZoomValue(1);
    startCamera(facingMode);
  }, [facingMode, startCamera]);

  const flipCamera = useCallback(() => {
    haptic(10);
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  // ─── Swipe to switch mode ────────────────────────────────────────────────────
  const handleSwipeStart = useCallback(e => {
    swipeStartXRef.current = e.touches?.[0]?.clientX ?? e.clientX;
  }, []);

  const handleSwipeEnd = useCallback(e => {
    if (swipeStartXRef.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? e.clientX;
    const diff = swipeStartXRef.current - endX;
    if (Math.abs(diff) > 60 && !photo) {
      const newIdx = diff > 0 ? Math.min(MODES.length - 1, modeIndex + 1) : Math.max(0, modeIndex - 1);
      if (newIdx !== modeIndex) {
        haptic(12);
        setModeIndex(newIdx);
      }
    }
    swipeStartXRef.current = null;
  }, [photo, modeIndex]);

  // ─── Flash icon ──────────────────────────────────────────────────────────────
  const flashIcon = useMemo(
    () => ({
      off: <ZapOff className="w-4 h-4" />,
      on: <Zap className="w-4 h-4 text-[#FFB800]" fill="currentColor" />,
      auto: <Zap className="w-4 h-4" />,
    }),
    []
  );

  const zoomPresets = useMemo(() => ['.5', '1x', '2'], []);
  const activePreset = useMemo(
    () =>
      zoomPresets.find(p => {
        const map = { '.5': 0.5, '1x': 1, '2': 2 };
        return Math.abs(map[p] - zoomValue) < 0.08;
      }),
    [zoomPresets, zoomValue]
  );

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Shutter flash effect */}
      <AnimatePresence>
        {shutterFlash && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-white pointer-events-none z-50"
          />
        )}
      </AnimatePresence>

      {/* Loading state */}
      <AnimatePresence>
        {cameraLoading && !hasStream && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-white/70 text-sm">Starting camera...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewfinder */}
      <div
        ref={viewfinderRef}
        className="absolute inset-0 overflow-hidden"
        onTouchStart={e => {
          handleTouchStart(e);
          handleSwipeStart(e);
          handleLongPressStart(e);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={e => {
          handleTouchEnd(e);
          handleSwipeEnd(e);
          handleLongPressEnd();
          if (!pinchStartDistRef.current && e.changedTouches.length === 1 && e.touches.length === 0) {
            handleViewfinderTap(e);
          }
        }}
        onClick={e => {
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

        {/* Grid overlay */}
        {settings.showGrid && !photo && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
            }}
          >
            {[...Array(9)].map((_, i) => (
              <div key={i} className="border border-white/15" />
            ))}
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
              <span className="text-white font-semibold drop-shadow-2xl" style={{ fontSize: 100 }}>
                {countdown}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zoom overlay */}
        <AnimatePresence>
          {showZoomOverlay && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-black/50 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/10"
            >
              <span className="text-white font-semibold text-lg">{zoomValue.toFixed(1)}×</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top HUD */}
        {!photo && (
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20">
            <GlassButton icon={X} onClick={() => navigate(createPageUrl('Editor'))} size="md" />

            <div className="flex items-center gap-2">
              {afLocked && (
                <GlassPill>
                  <Lock className="w-3 h-3 text-yellow-400 inline mr-1" />
                  <span className="text-xs text-yellow-400 font-medium">AE/AF Lock</span>
                </GlassPill>
              )}
              {settings.timer > 0 && (
                <GlassPill>
                  <Timer className="w-3 h-3 text-[#FF6B35] inline mr-1" />
                  <span className="text-[#FF6B35] text-xs font-bold">{settings.timer}s</span>
                </GlassPill>
              )}
            </div>

            <GlassButton
              icon={flashIcon[flashMode]}
              onClick={() => setFlashMode(m => (m === 'off' ? 'on' : m === 'on' ? 'auto' : 'off'))}
              active={flashMode !== 'off'}
              size="md"
            />
          </div>
        )}

        {/* Zoom presets */}
        {!photo && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/10 z-20">
            {zoomPresets.map(z => (
              <motion.button
                key={z}
                whileTap={{ scale: 0.85 }}
                onClick={() => setZoomPreset(z)}
                className={`
                  w-8 h-8 rounded-full text-xs font-bold transition-all
                  ${z === activePreset ? 'bg-white/20 text-white border border-white/30' : 'text-white/50 hover:text-white/70'}
                `}
              >
                {z}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute left-0 right-0 bottom-0 flex flex-col items-center gap-4 pb-6 z-20" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {!photo ? (
          <div className="w-full px-6 flex items-center justify-between">
            {/* Gallery thumbnail */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(createPageUrl('Profile'))}
              className="w-12 h-12 rounded-xl overflow-hidden border border-white/15 hover:border-white/30 transition-all bg-black/20"
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
            </motion.button>

            {/* Shutter button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={takePhoto}
              disabled={!hasStream || countdown > 0 || cameraLoading}
              className="relative w-20 h-20 rounded-full disabled:opacity-50 transition-opacity z-10"
              style={{
                background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)',
                padding: '3px',
              }}
            >
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center hover:bg-black/90 transition-colors" />
            </motion.button>

            {/* Flip camera */}
            <GlassButton
              icon={RefreshCw}
              onClick={flipCamera}
              size="lg"
            />
          </div>
        ) : (
          <div className="w-full px-4 flex flex-col gap-4">
            <div className="flex items-center justify-around">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={retake}
                className="flex flex-col items-center gap-2"
              >
                <GlassButton icon={() => null} size="lg">
                  <RotateCcw className="w-5 h-5" />
                </GlassButton>
                <span className="text-xs text-white/50 font-medium">Retake</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={savePhoto}
                disabled={isSaving}
                className="relative w-20 h-20 rounded-full disabled:opacity-70 transition-opacity"
                style={{
                  background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)',
                  padding: '3px',
                }}
              >
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : savedPhoto ? (
                    <Check className="w-6 h-6 text-green-400" />
                  ) : (
                    <span className="text-white font-bold text-xs">SAVE</span>
                  )}
                </div>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate(createPageUrl('Editor'))}
                className="flex flex-col items-center gap-2"
              >
                <GlassButton icon={X} size="lg" />
                <span className="text-xs text-white/50 font-medium">Exit</span>
              </motion.button>
            </div>

            <div className="flex gap-2 max-w-xs mx-auto w-full">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  localStorage.setItem('capturedPhoto', photo);
                  navigate(createPageUrl('Editor'));
                }}
                className="flex-1 py-2.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Studio</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  localStorage.setItem('capturedPhoto', photo);
                  navigate(createPageUrl('Generate'));
                }}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#FF6B35]/20 hover:bg-[#FF6B35]/30 border border-[#FF6B35]/40 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                <span>Imagine</span>
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Settings button (bottom right) */}
      {!photo && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setQuickControlsOpen(true)}
          className="absolute right-4 z-20"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 140px)' }}
        >
          <GlassButton icon={Settings} size="md" />
        </motion.button>
      )}

      {/* Quick Controls Sheet */}
      <QuickControlsSheet
        isOpen={quickControlsOpen}
        onClose={() => setQuickControlsOpen(false)}
        settings={settings}
        onSettingChange={(key, val) => dispatchSettings({ key, value: val })}
        capabilities={videoCapabilities}
        highRes={highRes}
        onHighResToggle={() => setHighRes(!highRes)}
        selectedStyle={selectedStyle}
        onStyleChange={setSelectedStyle}
        nightMode={nightMode}
        onNightModeChange={setNightMode}
      />
    </div>
  );
}