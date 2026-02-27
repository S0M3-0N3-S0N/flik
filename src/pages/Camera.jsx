import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Zap, ZapOff, Grid3X3, FlipHorizontal, Circle, Square } from 'lucide-react';
import { toast } from "sonner";

export default function CameraPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [photo, setPhoto] = useState(null);
  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [mode, setMode] = useState('PHOTO');
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState('1x');
  const [flashOn, setFlashOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  const applyZoom = useCallback((stream, zoomLevel) => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities?.();
    if (caps?.zoom) {
      const zoomMap = { '.5': 0.5, '1x': 1, '2': 2 };
      const desired = zoomMap[zoomLevel] || 1;
      const clamped = Math.max(caps.zoom.min, Math.min(caps.zoom.max, desired));
      track.applyConstraints({ advanced: [{ zoom: clamped }] }).catch(() => {});
    }
  }, []);

  const startCamera = async (facing = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setFlashOn(false);
    setHasStream(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true
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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (streamRef.current) applyZoom(streamRef.current, zoom);
  }, [zoom, applyZoom]);

  const toggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const newState = !flashOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: newState }] });
      setFlashOn(newState);
    } catch {
      toast.error("Flash not supported on this device.");
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setPhoto(canvas.toDataURL('image/png'));
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flik_video_${Date.now()}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Video saved!");
    };
    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const flipCamera = () => {
    if (isRecording) stopRecording();
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
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

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const zoomLevels = ['.5', '1x', '2'];

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        {photo ? (
          <img src={photo} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Grid overlay */}
        {showGrid && !photo && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
              {[...Array(9)].map((_, i) => <div key={i} className="border border-white/25" />)}
            </div>
          </div>
        )}

        {/* Recording timer */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-mono font-semibold">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* Top controls */}
        {!photo && (
          <div className="absolute top-4 right-4 flex flex-col gap-3">
            <button
              onClick={() => setShowGrid(g => !g)}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
            >
              <Grid3X3 className={`w-5 h-5 ${showGrid ? 'text-[#FF6B35]' : 'text-white'}`} />
            </button>
            <button
              onClick={toggleFlash}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center ${flashOn ? 'bg-[#FFB800]/80' : 'bg-black/50'}`}
            >
              {flashOn
                ? <Zap className="w-5 h-5 text-black" fill="currentColor" />
                : <ZapOff className="w-5 h-5 text-white" />
              }
            </button>
          </div>
        )}

        {/* Zoom selector */}
        {!photo && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5">
              {zoomLevels.map(z => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    zoom === z ? 'bg-black/60 text-[#FF6B35]' : 'text-white/70'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls panel */}
      <div
        className="bg-[#111111] flex flex-col items-center pt-5 pb-6 gap-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        {!photo ? (
          <>
            {/* Mode selector */}
            <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
              {['VIDEO', 'PHOTO'].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    if (isRecording) stopRecording();
                    setMode(m);
                  }}
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

            {/* Shutter row */}
            <div className="w-full flex items-center justify-around px-8">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 overflow-hidden" />

              {mode === 'PHOTO' ? (
                /* Photo shutter */
                <button
                  onClick={takePhoto}
                  disabled={!hasStream}
                  className="w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-40"
                  style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: '3px' }}
                >
                  <div className="w-full h-full rounded-full bg-white" />
                </button>
              ) : (
                /* Video record / stop button */
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!hasStream}
                  className="w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-40"
                  style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: '3px' }}
                >
                  <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                    {isRecording
                      ? <Square className="w-7 h-7 text-red-500" fill="currentColor" />
                      : <Circle className="w-10 h-10 text-red-500" fill="currentColor" />
                    }
                  </div>
                </button>
              )}

              <button
                onClick={flipCamera}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
              >
                <FlipHorizontal className="w-6 h-6 text-white" />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-white/50 text-sm">Photo captured</p>
            <div className="w-full flex items-center justify-around px-8">
              <button onClick={retake} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <span className="text-white/60 text-xs">Retake</span>
              </button>

              <button
                onClick={download}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'conic-gradient(from 0deg, #FF6B35, #F72C25, #FFB800, #FF6B35)', padding: '3px' }}
              >
                <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">SAVE</span>
                </div>
              </button>

              <div className="w-14 h-14" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}