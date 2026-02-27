import React, { useRef, useEffect, useState } from 'react';
import { FlipHorizontal, Download, RefreshCcw } from 'lucide-react';
import { toast } from "sonner";

export default function CameraPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [mode, setMode] = useState('PHOTO');

  const startCamera = async (facing = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setPhoto(canvas.toDataURL('image/png'));
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setHasStream(false);
  };

  const retake = () => {
    setPhoto(null);
    startCamera(facingMode);
  };

  const download = () => {
    const link = document.createElement('a');
    link.href = photo;
    link.download = `flik_photo_${Date.now()}.png`;
    link.click();
    toast.success("Photo saved!");
  };

  const flipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ paddingTop: '64px' }}>
      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden bg-black">
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
        <canvas ref={canvasRef} className="hidden" />

        {/* Rule of Thirds Grid */}
        {!photo && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical lines */}
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '33.33% 33.33%'
            }} />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-[#111111] pt-4 pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
        {/* Mode Selector */}
        {!photo && (
          <div className="flex justify-center mb-5">
            <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
              {['VIDEO', 'PHOTO'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    mode === m
                      ? 'bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white shadow-lg'
                      : 'text-white/60'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Shutter Row */}
        <div className="flex items-center justify-between px-10">
          {/* Left: last photo thumbnail or empty */}
          <div className="w-14 h-14">
            {photo && (
              <button onClick={download} className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/30">
                <img src={photo} alt="last" className="w-full h-full object-cover" />
              </button>
            )}
          </div>

          {/* Center: Shutter / Retake */}
          {!photo ? (
            <button
              onClick={takePhoto}
              disabled={!hasStream}
              className="relative w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-40"
            >
              {/* Gradient ring */}
              <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800]">
                <div className="w-full h-full rounded-full bg-white" />
              </div>
            </button>
          ) : (
            <button
              onClick={retake}
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800]">
                <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                  <RefreshCcw className="w-6 h-6 text-white" />
                </div>
              </div>
            </button>
          )}

          {/* Right: Flip camera */}
          <button
            onClick={flipCamera}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <FlipHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}