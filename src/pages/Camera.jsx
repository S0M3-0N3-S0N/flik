import React, { useRef, useEffect, useState, useCallback, useReducer } from 'react';
import { RotateCcw, Zap, ZapOff, Grid3X3, RefreshCw, Circle, Square, Settings, Timer, Pause, Play, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
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
  const navigate = useNavigate();
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
  const tapTimeoutRef = useRef(null);
  const initializingRef = useRef(false);
  const countdownTimerRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [modeIndex, setModeIndex] = useState(1);
  const [flashMode, setFlashMode] = useState('off');
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
  const [isSaving, setIsSaving] = useState(false);
  const [savedPhoto, setSavedPhoto] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  const mode = MODES[modeIndex];

  // ─── Safe camera initialization with guard ───────────────────────────────────
  const startCamera = useCallback(async (facing = facingMode, res = settings.resolution, fps = settings.fps) => {
    // Prevent double initialization
    if (initializingRef.current) return;
    initializingRef.current = true;
    setCameraLoading(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setHasStream(false);

    try {
      // Only request audio for video mode (not photo)
      const audioNeeded = modeIndex === 0; // VIDEO mode

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: res === 2160 ? 3840 : res === 720 ? 1280 : 1920 },
          height: { ideal: res },
          frameRate: { ideal: fps },
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
  }, [facingMode, settings.resolution, settings.fps, modeIndex]);

  useEffect(() => {
    startCamera();
    return () => {
      initializingRef.current = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
      clearTimeout(countdownTimerRef.current);
      clearTimeout(tapTimeoutRef.current);
      clearTimeout(exposureThrottleRef.current);
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

  // ─── Tap to focus with proper position calculation ──────────────────────────
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

  // ─── Mode switching with recording guard ──────────────────────────────────────
  const switchMode = (idx) => {
    if (idx === modeIndex) return;
    haptic(12);

    // Stop recording before switching
    if (isRecording) {
      stopRecording();
    }

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
    });
  };

  // ─── Save photo to gallery ────────────────────────────────────────────────────
  const savePhoto = async () => {
    if (!photo || isSaving) return;
    haptic(15);
    setIsSaving(true);
    toast.loading("Saving photo to gallery...", { id: 'photo-save' });
    try {
      const res = await fetch(photo);
      const blob = await res.blob();
      const file = new File([blob], `flik_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Creation.create({
        type: 'image',
        url: file_url,
        thumbnail_url: file_url,
        title: `Photo ${new Date().toLocaleDateString()}`,
        metadata: { source: 'camera', facing_mode: facingMode },
      });

      setSavedPhoto(true);
      toast.success("Saved to gallery!", { id: 'photo-save' });
    } catch (err) {
      console.error('Save error:', err);
      toast.error("Failed to save. Please try again.", { id: 'photo-save' });
      setSavedPhoto(null);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Video recording with guards ──────────────────────────────────────────────
  const startRecording = () => {
    if (!streamRef.current) return;
    if (mediaRecorderRef.current) return; // Guard against double start

    haptic([15, 10, 15]);
    runCountdown(() => {
      // Clear old chunks
      recordedChunksRef.current = [];

      const mimeType = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

      try {
        const recorder = new MediaRecorder(streamRef.current, { mimeType });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], `flik_video_${Date.now()}.${ext}`, { type: mimeType });

          toast.loading("Saving video to gallery...", { id: 'video-save' });
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.Creation.create({
              type: 'video',
              url: file_url,
              title: `Video ${new Date().toLocaleDateString()}`,
              metadata: { source: 'camera', facing_mode: facingMode, duration: recordingTime },
            });
            toast.success("Video saved to gallery!", { id: 'video-save' });
          } catch (err) {
            console.error('Video save error:', err);
            toast.error("Failed to save video.", { id: 'video-save' });
          } finally {
            mediaRecorderRef.current = null;
            recordedChunksRef.current = [];
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(100);
        setIsRecording(true);
        setIsPaused(false);
        setRecordingTime(0);
        timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      } catch (err) {
        console.error('MediaRecorder error:', err);
        toast.error("Recording failed.");
        mediaRecorderRef.current = null;
      }
    });
  };

  const stopRecording = () => {
    haptic([15, 10, 15]);
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
  };

  const togglePause = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    haptic(8);

    if (rec.state === 'paused') {
      rec.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else if (rec.state === 'recording') {
      rec.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
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
    if (isRecording) stopRecording();
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  // ─── Handle settings changes safely ────────────────────────────────────────────
  const handleSettingChange = (key, value) => {
    dispatchSettings({ key, value });

    if ((key === 'resolution' || key === 'fps') && !isRecording) {
      const newRes = key === 'resolution' ? value : settings.resolution;
      const newFps = key === 'fps' ? value : settings.fps;
      startCamera(facingMode, newRes, newFps);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
          if (e.pointerType !== 'touch') handleViewfinderTap(e);
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

        {/* Recording timer - Prominent red pill */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-red-500 rounded-xl px-6 py-2 shadow-lg shadow-red-500/40"
            >
              <motion.div
                animate={{ opacity: isPaused ? 0.3 : [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-2.5 h-2.5 rounded-full bg-white"
              />
              <span className="text-white text-lg font-mono font-bold tracking-wider">{formatTime(recordingTime)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top controls */}
        {!photo && !isRecording && (
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5">
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => { haptic(8); navigate(createPageUrl('Editor')); }}
              className="md:hidden w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
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
                onClick={() => { haptic(8); dispatchSettings({ key: 'showGrid', value: !settings.showGrid }); }}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                <Grid3X3 className={`w-4 h-4 ${settings.showGrid ? 'text-[#FF6B35]' : 'text-white/70'}`} />
              </motion.button>
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
          <div className="absolute left-1/2 -translate-x-1/2 top-36">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-0.5 bg-black/50 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/10">
              {zoomPresets.map(z => {
                const isActive = z === activePreset;
                return (
                  <motion.button key={z} whileTap={{ scale: 0.85 }} onClick={() => setZoomPreset(z)}
                    className={`w-10 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-white/20 text-white' : 'text-white/50'}`}
                    style={isActive ? { boxShadow: 'inset 0 0 0 1px rgba(255,107,53,0.5)' } : {}}>
                    {z}
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>

      {/* ── Bottom controls (floating overlay) ── */}
      <div
        className={`absolute left-0 right-0 bottom-0 flex flex-col items-center gap-3 transition-all duration-300 ease-out ${mode === 'VIDEO' ? 'bg-transparent pt-3' : 'bg-black/90 backdrop-blur-xl border-t border-white/5 pt-4'}`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        {!photo ? (
          <>
            {/* Mode selector */}
            <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
              {MODES.map((m, i) => (
                <motion.button key={m} whileTap={{ scale: 0.92 }} onClick={() => switchMode(i)}
                  className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${modeIndex === i ? 'bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white shadow-lg' : 'text-white/50'}`}>
                  {m}
                </motion.button>
              ))}
            </div>

            {/* Shutter row */}
            <div className="w-full flex items-center justify-around px-8">
              <div className="w-14 h-14 flex items-center justify-center">
                {isRecording ? (
                  <motion.button whileTap={{ scale: 0.85 }} onClick={togglePause}
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                    {isPaused
                      ? <Play className="w-5 h-5 text-white" fill="currentColor" />
                      : <Pause className="w-5 h-5 text-white" fill="currentColor" />}
                  </motion.button>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10" />
                )}
              </div>

              {/* Shutter */}
              {mode === 'PHOTO' ? (
                <motion.button whileTap={{ scale: 0.9 }} onClick={takePhoto}
                  disabled={!hasStream || countdown > 0 || cameraLoading}
                  className="w-20 h-20 rounded-full disabled:opacity-40"
                  style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}>
                  <div className="w-full h-full rounded-full bg-white" />
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.9 }} onClick={isRecording ? stopRecording : startRecording}
                  disabled={!hasStream || countdown > 0 || cameraLoading}
                  className="w-20 h-20 rounded-full disabled:opacity-40"
                  style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}>
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
              <motion.button whileTap={{ scale: 0.85, rotate: 180 }} onClick={flipCamera}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white" />
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

              <motion.button whileTap={{ scale: 0.9 }} onClick={savePhoto} disabled={isSaving || !!savedPhoto}
                className="w-20 h-20 rounded-full disabled:opacity-70"
                style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}>
                <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : savedPhoto ? (
                    <Check className="w-7 h-7 text-green-400" />
                  ) : (
                    <span className="text-white font-bold text-xs tracking-wide">SAVE</span>
                  )}
                </div>
              </motion.button>

              <div className="w-14 h-14" />
            </div>
          </>
        )}
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={handleSettingChange}
        supported={supported}
      />
    </div>
  );
}