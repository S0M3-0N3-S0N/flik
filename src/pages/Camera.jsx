import React, { useRef, useEffect, useState, useCallback, useReducer, useMemo } from 'react';
import { RotateCcw, Zap, ZapOff, Grid3X3, RefreshCw, Settings, Timer, Check, X, Image, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import FocusSquare from '../components/camera/FocusSquare';
import ExposureSlider from '../components/camera/ExposureSlider';
import SettingsDrawer from '../components/camera/SettingsDrawer';
import CameraGuidance from '../components/camera/CameraGuidance';
import FaceTracker from '../components/camera/FaceTracker';
import VintageTimestamp from '../components/camera/VintageTimestamp';
import { useFlikActions } from '../components/useFlikActions';

const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch {} };

const MODES = ['PHOTO'];
const initialSettings = { showGrid: false, timer: 0, cameraGuidance: true };

const checkCameraSupport = () => {
  return !!navigator.mediaDevices?.getUserMedia;
};

function settingsReducer(state, action) {
  return { ...state, [action.key]: action.value };
}

// Rotate only inner icon content — use display:flex to prevent layout shift
const rotateStyle = (deg) => ({
  transition: 'transform 0.3s ease',
  transform: `rotate(${deg}deg)`,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export default function CameraPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const tapCountRef = useRef(0);
  const doubleTapTimeoutRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [modeIndex, setModeIndex] = useState(0);
  const [flashMode, setFlashMode] = useState('off');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
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
  const [cameraSupported, setCameraSupported] = useState(true);
  const [faceTrackingEnabled, setFaceTrackingEnabled] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const detectedFacesRef = useRef([]);
  const autoFocusedFaceRef = useRef(false);
  const focusPosRef = useRef(null);

  // Keep focusPosRef in sync so handleFacesUpdate doesn't need focusPos in deps
  useEffect(() => { focusPosRef.current = focusPos; }, [focusPos]);

  const handleFacesUpdate = useCallback((faces) => {
    detectedFacesRef.current = faces;
    if (faces.length > 0 && !focusPosRef.current && !autoFocusedFaceRef.current) {
      autoFocusedFaceRef.current = true;
      const face = faces[0];
      setFocusPos({ x: face.x + face.w / 2, y: face.y + face.h / 2 });
      setShowExposure(false);
    } else if (faces.length === 0) {
      autoFocusedFaceRef.current = false;
    }
  }, []);

  const mode = MODES[modeIndex];

  // Check camera support on mount
  useEffect(() => {
    if (!checkCameraSupport()) {
      setCameraSupported(false);
      toast.error("Camera not supported on this device");
    } else {
      // Request permissions early for better UX
      navigator.mediaDevices.enumerateDevices().catch(() => {});
    }
  }, []);

  // Lock to portrait and detect orientation for counter-rotating icons
  useEffect(() => {
    // Try to lock screen to portrait so the video feed stays upright
    try {
      screen.orientation?.lock('portrait').catch(() => {});
    } catch {}

    const getAngle = () => {
      const angle = screen.orientation?.angle ?? window.orientation ?? 0;
      // Normalize: landscape-left = 90, landscape-right = -90/270
      if (angle === 90) return -90;
      if (angle === -90 || angle === 270) return 90;
      return 0;
    };

    const update = () => setOrientation(getAngle());
    update();

    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
      try { screen.orientation?.unlock(); } catch {}
    };
  }, []);

  // ─── Safe camera initialization with guard ───────────────────────────────────
  const startCamera = useCallback(async (facing = facingMode) => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    setCameraLoading(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setHasStream(false);

    try {
      if (!checkCameraSupport()) {
        setCameraSupported(false);
        toast.error("Camera not supported on this device");
        setCameraLoading(false);
        return;
      }

      // Try with facingMode first for mobile, then fallback to basic constraints for desktop
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      } catch {
        // Fallback: remove facingMode for desktop cameras
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
            audio: false,
          });
        } catch {
          // Last resort: accept any available camera
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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

      setZoomCaps(caps.zoom ? { min: caps.zoom.min, max: caps.zoom.max, supported: true } : { min: 1, max: 4, supported: false });
      setExposureCaps(caps.exposureCompensation
        ? { min: caps.exposureCompensation.min, max: caps.exposureCompensation.max, supported: true }
        : { min: -2, max: 2, supported: false }
      );
      setSupported({
        res4k: !!(caps.height?.max >= 2160),
        fps60: !!(caps.frameRate?.max >= 60),
      });

      setZoomValue(1);
      setExposure(0);
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        toast.error("Camera permission denied. Please allow camera access.");
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        toast.error("No camera device found on this device.");
        setCameraSupported(false);
      } else {
        toast.error("Camera unavailable. Please check permissions.");
      }
    } finally {
      initializingRef.current = false;
      setCameraLoading(false);
    }
  }, [facingMode, modeIndex]);

  useEffect(() => {
    startCamera();
    
    base44.entities.Creation.list('-updated_date', 1)
      .then(creations => {
        if (creations && creations.length > 0) setLatestCreation(creations[0]);
      })
      .catch(() => {});

    const unsubscribe = base44.entities.Creation.subscribe((event) => {
      if (event.type === 'create') setLatestCreation(event.data);
    });
    
    return () => {
      initializingRef.current = false;
      streamRef.current?.getTracks().forEach(t => {
        try { t.stop(); } catch (e) { /* ignore */ }
      });
      clearInterval(timerRef.current);
      clearTimeout(countdownTimerRef.current);
      clearTimeout(tapTimeoutRef.current);
      clearTimeout(exposureThrottleRef.current);
      clearTimeout(longPressRef.current);
      unsubscribe();
    };
    }, [startCamera]);

  // Cleanup throttle timer
  useEffect(() => {
    return () => {
      if (pinchThrottleRef.current) clearTimeout(pinchThrottleRef.current);
    };
  }, []);

  const setTorch = useCallback((on) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {});
  }, []);

  const setScreenFlash = useCallback((brightness) => {
    if (videoRef.current) {
      videoRef.current.style.filter = brightness > 0 ? `brightness(${brightness})` : 'none';
    }
  }, []);

  // Persistent torch when flashMode === 'on' (stays lit as a flashlight)
  useEffect(() => {
    if (flashMode === 'on') {
      setTorch(true);
      setScreenFlash(0);
    } else {
      setTorch(false);
      setScreenFlash(0);
    }
  }, [flashMode, setTorch, setScreenFlash]);

  const applyZoom = useCallback((val) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    const clamped = zoomCaps.supported
      ? Math.max(zoomCaps.min, Math.min(zoomCaps.max, val))
      : Math.max(0.5, Math.min(4, val));

    if (zoomCaps.supported) {
      track.applyConstraints({ advanced: [{ zoom: clamped }] }).catch(() => {});
    } else {
      if (videoRef.current) {
        const mirror = facingMode === 'user' ? ' scaleX(-1)' : '';
        videoRef.current.style.transform = `scale(${clamped})${mirror}`;
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

  const handleTouchStart = (e) => {
    if (e?.touches?.length === 2) {
      clearTimeout(tapTimeoutRef.current);
      pinchStartDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartZoomRef.current = zoomValue;
    }
  };

  const pinchThrottleRef = useRef(null);
  
  const handleTouchMove = (e) => {
    if (e?.touches?.length === 2 && pinchStartDistRef.current) {
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
    if (pinchStartDistRef.current && e?.touches?.length < 2) {
      pinchStartDistRef.current = null;
      setTimeout(() => setShowZoomOverlay(false), 1200);
    }
  };

  const handleViewfinderTap = (e) => {
    if (!e || pinchStartDistRef.current) return;
    if (afLocked) {
      setAfLocked(false);
      setFocusPos(null);
      setShowExposure(false);
      return;
    }

    const rect = viewfinderRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.changedTouches?.length > 0 ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches?.length > 0 ? e.changedTouches[0].clientY : e.clientY;

    const zoomScale = zoomCaps.supported ? 1 : zoomValue;
    let x = (clientX - rect.left) / zoomScale;
    let y = (clientY - rect.top) / zoomScale;

    // Snap to nearest detected face center if tap is within a face box
    const faces = detectedFacesRef.current;
    if (faces.length > 0) {
      for (const face of faces) {
        if (x >= face.x && x <= face.x + face.w && y >= face.y && y <= face.y + face.h) {
          x = face.x + face.w / 2;
          y = face.y + face.h / 2;
          haptic([10, 5, 10]);
          break;
        }
      }
    }

    setFocusPos({ x, y });
    setShowExposure(true);
    haptic(8);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      const caps = track.getCapabilities?.() || {};
      const advanced = {};

      const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

      if (caps.focusMode?.includes('single-shot')) advanced.focusMode = 'single-shot';
      else if (caps.focusMode?.includes('manual')) advanced.focusMode = 'manual';

      if (caps.focusPointOfInterest) advanced.focusPointOfInterest = { x: normX, y: normY };
      if (caps.exposureMode?.includes('manual')) advanced.exposureMode = 'manual';
      else if (caps.exposureMode?.includes('continuous')) advanced.exposureMode = 'continuous';
      if (caps.exposurePointOfInterest) advanced.exposurePointOfInterest = { x: normX, y: normY };

      if (Object.keys(advanced).length) {
        track.applyConstraints({ advanced: [advanced] }).catch(() => {});
      }
    }

    clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      if (!afLocked) setShowExposure(false);
    }, 4000);
  };

  const handleLongPressStart = (e) => {
    if (e.touches?.length > 1) return;
    longPressRef.current = setTimeout(() => {
      haptic([30, 20, 30]);
      setAfLocked(true);
      clearTimeout(tapTimeoutRef.current);
    }, 800);
  };
  const handleLongPressEnd = () => clearTimeout(longPressRef.current);

  const handleExposureChange = useCallback((val) => {
    const min = exposureCaps.min;
    const max = exposureCaps.max;
    const clamped = Math.max(min, Math.min(max, val));
    setExposure(clamped);

    clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      if (!afLocked) setShowExposure(false);
    }, 4000);

    if (exposureThrottleRef.current) clearTimeout(exposureThrottleRef.current);

    exposureThrottleRef.current = setTimeout(() => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;

      if (exposureCaps.supported) {
        track.applyConstraints({ advanced: [{ exposureCompensation: clamped }] }).catch(() => {});
      } else {
        const brightness = 1 + (clamped / exposureCaps.max) * 0.8;
        if (videoRef.current) {
          videoRef.current.style.filter = `brightness(${brightness})`;
        }
      }
    }, 50);
  }, [exposureCaps, afLocked]);

  const switchMode = (idx) => {
    if (idx === modeIndex) return;
    haptic(12);
    if (isRecording) stopRecording();
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

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Apply screen flash brightness to captured image for selfies
    let flashBrightness = 1;
    if (facingMode === 'user' && (flashMode === 'on' || flashMode === 'auto')) {
      flashBrightness = 1.5; // Screen flash brightens the image
    }

    if (exposure !== 0 || flashBrightness !== 1) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const maxExposure = Math.max(Math.abs(exposureCaps.min), exposureCaps.max);
      const exposureBrightness = 1 + (exposure / maxExposure) * 0.8;
      const totalBrightness = exposureBrightness * flashBrightness;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * totalBrightness);
        data[i + 1] = Math.min(255, data[i + 1] * totalBrightness);
        data[i + 2] = Math.min(255, data[i + 2] * totalBrightness);
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Burn vintage timestamp onto canvas if enabled
    if (showTimestamp) {
      const now = new Date();
      const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const month = months[now.getMonth()];
      const day = String(now.getDate()).padStart(2, "0");
      const year = now.getFullYear();
      let hours = now.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");

      const line1 = `${month}.${day} ${year}`;
      const line2 = `${hoursStr}:${minutes} ${ampm}`;

      const fontSize = Math.round(canvas.width * 0.045);
      ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      // Glow effect
      ctx.shadowColor = "rgba(255, 180, 0, 0.9)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#FFD700";

      const marginRight = Math.round(canvas.width * 0.03);
      const marginBottom = Math.round(canvas.height * 0.05);
      const lineHeight = Math.round(fontSize * 1.3);

      ctx.fillText(line2, canvas.width - marginRight, canvas.height - marginBottom);
      ctx.fillText(line1, canvas.width - marginRight, canvas.height - marginBottom - lineHeight);

      ctx.shadowBlur = 0;
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    setPhoto(dataUrl);
    setSavedPhoto(null);
    if (flashMode !== 'on') {
      setTorch(false);
      setScreenFlash(0);
    }
  }, [exposure, exposureCaps, flashMode, facingMode, showTimestamp, setTorch, setScreenFlash]);

  const takePhoto = () => {
    haptic([10, 5, 30]);
    runCountdown(() => {
      const shouldFlash = flashMode === 'on' || flashMode === 'auto';
      if (shouldFlash) {
        if (facingMode === 'user') {
          // Front camera: use screen flash
          setScreenFlash(3);
          setTimeout(() => {
            captureFrame();
            setScreenFlash(0);
          }, 80);
        } else {
          // Rear camera: use torch
          setTorch(true);
          setTimeout(captureFrame, 100);
        }
      } else {
        captureFrame();
      }
    });
  };

  const savePhoto = async () => {
    if (!photo || isSaving) return;
    haptic(15);
    setIsSaving(true);
    toast.loading("Saving photo to gallery...", { id: 'photo-save' });
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
        metadata: { source: 'camera', facing_mode: facingMode },
      });

      queryClient.invalidateQueries({ queryKey: ['profileCreations'] });
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

  const stopRecording = () => {
    haptic([15, 10, 15]);
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
  };

  const retake = () => {
    setPhoto(null);
    setSavedPhoto(null);
    setExposure(0);
    if (videoRef.current) {
      videoRef.current.style.filter = 'none';
      videoRef.current.style.transform = 'none';
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

  const handleSettingChange = (key, value) => {
    dispatchSettings({ key, value });
    if ((key === 'resolution' || key === 'fps') && !isRecording) {
      startCamera(facingMode);
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

  // icon rotation style — applied only to inner icon content, NOT the button container
  const iconRot = rotateStyle(orientation);

  // Cleanup blob URLs from zoomed screenshots
  useEffect(() => {
    return () => {
      if (photo?.startsWith('blob:')) {
        URL.revokeObjectURL(photo);
      }
    };
  }, [photo]);

  // Give FLIK full camera control
  useFlikActions('Camera', {
    takePhoto: () => takePhoto(),
    savePhoto: () => savePhoto(),
    retake: () => retake(),
    flipCamera: () => flipCamera(),
    setFlashMode: (mode) => setFlashMode(mode),
    toggleFlash: () => setFlashMode(m => m === 'off' ? 'on' : m === 'on' ? 'auto' : 'off'),
    setZoom: (val) => applyZoom(val),
    setZoomPreset: (preset) => setZoomPreset(preset),
    toggleGrid: () => dispatchSettings({ key: 'showGrid', value: !settings.showGrid }),
    setTimer: (seconds) => dispatchSettings({ key: 'timer', value: seconds }),
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    exitCamera: () => navigate(createPageUrl('Editor')),
  }, () => ({
    isActive: true,
    hasStream,
    facingMode,
    flashMode,
    zoomValue,
    zoomCaps,
    exposure,
    exposureCaps,
    showGrid: settings.showGrid,
    timer: settings.timer,
    isRecording,
    countdown,
    hasPhoto: !!photo,
    isSaving,
    savedPhoto: !!savedPhoto,
    cameraLoading,
    orientation,
    supported,
    faceTrackingEnabled,
    }));

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

      {/* Unsupported state */}
      {!cameraSupported && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <h3 className="text-xl font-bold mb-2">Camera Not Available</h3>
            <p className="text-white/60 mb-4">Your device doesn't support camera access</p>
            <button onClick={() => navigate(createPageUrl('Editor'))} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* ── Viewfinder (fullscreen) ── */}
      <div
        ref={viewfinderRef}
        className={`absolute inset-0 overflow-hidden ${!cameraSupported ? 'hidden' : ''}`}
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
          if (!pinchStartDistRef.current && e?.changedTouches?.length === 1 && e?.touches?.length === 0) {
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
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
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

        {/* Camera Guidance */}
        {!photo && settings.cameraGuidance && <CameraGuidance videoRef={videoRef} isActive={hasStream && !photo} />}

        {/* Face tracker */}
        {!photo && faceTrackingEnabled && <FaceTracker
          videoRef={videoRef}
          isActive={hasStream && !photo}
          mirrored={facingMode === 'user'}
          onFacesUpdate={handleFacesUpdate}
        />}

        {/* Focus square */}
        {!photo && <FocusSquare position={focusPos} locked={afLocked} />}

        {/* Vintage timestamp — only show on live viewfinder, not on captured photo */}
        {showTimestamp && !photo && <VintageTimestamp />}

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

        {/* Recording timer */}
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

        {/* Top controls — positions are fixed, only icons rotate */}
        {!photo && !isRecording && (
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5">
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => { haptic(8); navigate(createPageUrl('Editor')); }}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              <span style={iconRot}><X className="w-5 h-5 text-white" /></span>
            </motion.button>

            <motion.button whileTap={{ scale: 0.85 }} onClick={() => { haptic(8); setFlashMode(m => m === 'off' ? 'on' : m === 'on' ? 'auto' : 'off'); }}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              <span style={iconRot}>{flashIcon[flashMode]}</span>
            </motion.button>

            <div className="flex items-center gap-3">
              {settings.timer > 0 && (
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1">
                  <span style={iconRot}><Timer className="w-3 h-3 text-[#FF6B35]" /></span>
                  <span className="text-[#FF6B35] text-xs font-bold">{settings.timer}s</span>
                </div>
              )}
              <motion.button whileTap={{ scale: 0.85 }}
                onClick={() => setSettingsOpen(true)}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                <span style={iconRot}><Settings className="w-4 h-4 text-white/70" /></span>
              </motion.button>
            </div>
          </div>
        )}

        {/* Zoom capsule — position stays, pills rotate */}
        {!photo && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 110 }}>
            <div className="flex items-center gap-0.5 bg-black/50 backdrop-blur-xl rounded-full px-1.5 py-1 border border-white/10">
              {zoomPresets.map(z => {
                const isActive = z === activePreset;
                return (
                  <motion.button key={z} whileTap={{ scale: 0.85 }} onClick={() => setZoomPreset(z)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-white/20 text-white' : 'text-white/50'}`}
                    style={isActive ? { boxShadow: 'inset 0 0 0 1px rgba(255,107,53,0.5)' } : {}}>
                    <span style={iconRot}>{z}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls — layout stays fixed, icons rotate ── */}
      <div
        className="absolute left-0 right-0 bottom-0 flex flex-col items-center gap-3 bg-transparent pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        {!photo ? (
          <>
            {/* Shutter row */}
            <div className="w-full flex items-center justify-around px-8">
              {/* Gallery thumbnail */}
              <div className="w-14 h-14 flex items-center justify-center">
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
              </div>

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
                <span style={iconRot}><RefreshCw className="w-6 h-6 text-white" /></span>
              </motion.button>
            </div>
          </>
        ) : (
          <>
            {/* Save / Retake row */}
            <div className="w-full flex items-center justify-around px-8">
              <motion.button whileTap={{ scale: 0.85 }} onClick={retake}
                className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <span style={iconRot}><RotateCcw className="w-6 h-6 text-white" /></span>
                </div>
                <span className="text-white/50 text-[10px] font-medium tracking-wide">Retake</span>
              </motion.button>

              <motion.button whileTap={{ scale: 0.9 }} onClick={savePhoto} disabled={isSaving || !!savedPhoto}
                className="flex flex-col items-center gap-1.5">
                <div className="w-20 h-20 rounded-full"
                  style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: 3 }}>
                  <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : savedPhoto ? (
                      <span style={iconRot}><Check className="w-7 h-7 text-green-400" /></span>
                    ) : (
                      <span className="text-white font-bold text-xs tracking-widest" style={iconRot}>SAVE</span>
                    )}
                  </div>
                </div>
                <span className="text-white/50 text-[10px] font-medium tracking-wide">
                  {savedPhoto ? 'Saved!' : 'Save'}
                </span>
              </motion.button>

              <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate(createPageUrl('Editor'))}
                className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <span style={iconRot}><X className="w-6 h-6 text-white/70" /></span>
                </div>
                <span className="text-white/50 text-[10px] font-medium tracking-wide">Exit</span>
              </motion.button>
            </div>

            {/* Edit shortcuts row */}
            <div className="w-full flex items-center justify-center gap-3 px-8 mt-1">
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('load', photo);
                  navigate(createPageUrl('Editor') + '?' + params.toString());
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span style={iconRot}><Image className="w-4 h-4 text-[#FF6B35]" /></span>
                <span className="text-white text-xs font-semibold">Photo Studio</span>
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('load', photo);
                  navigate(createPageUrl('Generate') + '?' + params.toString());
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span style={iconRot}><Wand2 className="w-4 h-4 text-[#FFB800]" /></span>
                <span className="text-white text-xs font-semibold">Imagine AI</span>
              </motion.button>
            </div>
          </>
        )}
      </div>

      <SettingsDrawer
         open={settingsOpen}
         onClose={() => setSettingsOpen(false)}
         settings={settings}
         onChange={handleSettingChange}
         faceTrackingEnabled={faceTrackingEnabled}
         onFaceTrackingChange={setFaceTrackingEnabled}
         showTimestamp={showTimestamp}
         onTimestampChange={setShowTimestamp}
       />
    </div>
  );
}