/**
 * CameraAdapter - Backend-agnostic camera abstraction layer
 * Web: navigator.mediaDevices.getUserMedia
 * Native (future): AVFoundation/Camera2 bridge via native module
 */

class CameraAdapterWeb {
  async requestPermission(facingMode = 'environment') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      return { success: true, stream };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  stopStream(stream) {
    stream?.getTracks?.().forEach(track => track.stop());
  }

  getCapabilities(stream) {
    const track = stream?.getVideoTracks?.()[0];
    return track?.getCapabilities?.() || {};
  }

  async applyConstraints(stream, constraints) {
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints(constraints);
    } catch (err) {
      console.warn('ApplyConstraints failed:', err);
    }
  }

  async captureFrame(videoEl) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      canvas.getContext('2d')?.drawImage(videoEl, 0, 0);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
    });
  }
}

export const CameraAdapter = new CameraAdapterWeb();