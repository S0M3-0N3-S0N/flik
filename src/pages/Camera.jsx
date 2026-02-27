import React, { useRef, useEffect, useState } from 'react';
import { RefreshCcw, Download, Zap, ZapOff, Grid } from 'lucide-react';
import { toast } from "sonner";

export default function CameraPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const [showGrid, setShowGrid] = useState(true);
  const [flash, setFlash] = useState(false);

  const startCamera = async (facing = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasStream(true);
      }
    } catch (err) {
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    setPhoto(canvas.toDataURL('image/png'));
    // Flash effect
    if (flash) {
      document.getElementById('flash-overlay').style.opacity = '1';
      setTimeout(() => {
        document.getElementById('flash-overlay').style.opacity = '0';
      }, 150);
    }
  };

  const retake = () => {
    setPhoto(null);
    startCamera(facingMode);
  };

  const savePhoto = () => {
    const link = document.createElement('a');
    link.href = photo;
    link.download = `flik_${Date.now()}.png`;
    link.click();
    toast.success("Photo saved!");
  };

  const flipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  const zoomLevels = [0.5, 1, 2];

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Flash overlay */}
      <div
        id="flash-overlay"
        className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150"
        style={{ opacity: 0 }}
      />

      {/* Camera viewfinder - full screen */}
      <div className="relative flex-1 overflow-hidden">
        {photo ? (
          <img src={photo} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        )}

        {/* Grid lines */}
        {showGrid && !photo && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical lines */}
            <div className="absolute inset-0 flex">
              <div className="flex-1" />
              <div className="w-px bg-white/20 h-full" />
              <div className="flex-1" />
              <div className="w-px bg-white/20 h-full" />
              <div className="flex-1" />
            </div>
            {/* Horizontal lines */}
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1" />
              <div className="h-px bg-white/20 w-full" />
              <div className="flex-1" />
              <div className="h-px bg-white/20 w-full" />
              <div className="flex-1" />
            </div>
          </div>
        )}

        {/* Top controls */}
        {!photo && (
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={() => setFlash(f => !f)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            >
              {flash ? (
                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ) : (
                <ZapOff className="w-5 h-5 text-white" />
              )}
            </button>
            <button
              onClick={() => setShowGrid(g => !g)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            >
              <Grid className={`w-5 h-5 ${showGrid ? 'text-yellow-400' : 'text-white'}`} />
            </button>
          </div>
        )}

        {/* Zoom controls - shown on viewfinder */}
        {!photo && (
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3">
            {zoomLevels.map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  zoom === z
                    ? 'bg-black/60 text-yellow-400 scale-110'
                    : 'text-white/80'
                }`}
              >
                {z === 0.5 ? '.5' : z === 1 ? '1x' : '2'}
              </button>
            ))}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom controls panel */}
      <div className="bg-black/90 backdrop-blur-xl pt-4 pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
        {photo ? (
          /* After capture: retake + save */
          <div className="flex items-center justify-around px-8 py-4">
            <button
              onClick={retake}
              className="text-white font-medium text-base px-6 py-3"
            >
              Retake
            </button>
            <button
              onClick={savePhoto}
              className="text-yellow-400 font-semibold text-base px-6 py-3"
            >
              Save Photo
            </button>
          </div>
        ) : (
          <>
            {/* Mode selector */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {['video', 'photo'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    mode === m
                      ? 'bg-white/20 text-yellow-400'
                      : 'text-white/50'
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Shutter row */}
            <div className="flex items-center justify-between px-10">
              {/* Last photo thumbnail placeholder */}
              <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
                <span className="text-white/30 text-xs">Gallery</span>
              </div>

              {/* Shutter button */}
              <button
                onClick={takePhoto}
                disabled={!hasStream}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl active:scale-95 transition-transform disabled:opacity-40"
              >
                <div className="w-[68px] h-[68px] rounded-full border-4 border-black/10 bg-white" />
              </button>

              {/* Flip camera */}
              <button
                onClick={flipCamera}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
              >
                <RefreshCcw className="w-6 h-6 text-white" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}