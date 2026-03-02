import { useCallback } from 'react';

export const useCameraFrame = (videoRef) => {
  const captureFrame = useCallback(async () => {
    if (!videoRef?.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  }, [videoRef]);

  return { captureFrame };
};