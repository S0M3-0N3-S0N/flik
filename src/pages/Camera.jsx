import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, RefreshCcw, Download, FlipHorizontal } from 'lucide-react';
import { toast } from "sonner";

export default function CameraPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState('user');

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
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    setPhoto(canvas.toDataURL('image/png'));
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
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center pt-16 pb-24 px-4">
      <h1 className="text-2xl font-bold gradient-text mb-6">Camera</h1>

      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {photo ? (
          <img src={photo} alt="Captured" className="w-full h-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        )}
        {!hasStream && !photo && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
            Waiting for camera access...
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="mt-8 flex items-center gap-4">
        {!photo ? (
          <>
            <Button
              onClick={flipCamera}
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 px-5 py-3 rounded-xl"
            >
              <FlipHorizontal className="w-5 h-5" />
            </Button>
            <Button
              onClick={takePhoto}
              disabled={!hasStream}
              className="btn-gradient px-8 py-3 rounded-xl text-base font-semibold flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Capture
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={retake}
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 px-6 py-3 rounded-xl flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Retake
            </Button>
            <Button
              onClick={download}
              className="btn-gradient px-8 py-3 rounded-xl text-base font-semibold flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Save Photo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}