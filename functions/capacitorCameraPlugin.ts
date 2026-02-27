import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

// Register the native plugin
const FlikCamera = registerPlugin('FlikCamera');

export const CapacitorCameraAPI = {
  isNative: () => Capacitor.isNativePlatform(),

  async startCamera(options = {}) {
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Native plugin not available');
      }
      return await FlikCamera.startCamera({ facing: options.facing || 'back' });
    } catch (error) {
      console.error('Failed to start native camera:', error);
      throw error;
    }
  },

  async stopCamera() {
    try {
      if (!Capacitor.isNativePlatform()) return;
      return await FlikCamera.stopCamera();
    } catch (error) {
      console.error('Failed to stop native camera:', error);
      throw error;
    }
  },

  async switchCamera() {
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Native plugin not available');
      }
      return await FlikCamera.switchCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
      throw error;
    }
  },

  async setTorch(enabled) {
    try {
      if (!Capacitor.isNativePlatform()) return;
      return await FlikCamera.setTorch({ on: enabled });
    } catch (error) {
      console.error('Failed to set torch:', error);
    }
  },

  async setFlashMode(mode) {
    try {
      if (!Capacitor.isNativePlatform()) return;
      return await FlikCamera.setFlashMode({ mode });
    } catch (error) {
      console.error('Failed to set flash mode:', error);
    }
  },

  async setZoom(value) {
    try {
      if (!Capacitor.isNativePlatform()) return;
      return await FlikCamera.setZoom({ value });
    } catch (error) {
      console.error('Failed to set zoom:', error);
    }
  },

  async setExposureBias(value) {
    try {
      if (!Capacitor.isNativePlatform()) return;
      return await FlikCamera.setExposureBias({ value });
    } catch (error) {
      console.error('Failed to set exposure bias:', error);
    }
  },

  async setFocusPoint(x, y) {
    try {
      if (!Capacitor.isNativePlatform()) return;
      return await FlikCamera.setFocusPoint({ x, y });
    } catch (error) {
      console.error('Failed to set focus point:', error);
    }
  },

  async setAEAFLocked(locked) {
    try {
      if (!Capacitor.isNativePlatform()) return;
      return await FlikCamera.setAEAFLocked({ locked });
    } catch (error) {
      console.error('Failed to set AE/AF lock:', error);
    }
  },

  async capturePhoto(options = {}) {
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Native plugin not available');
      }
      return await FlikCamera.capturePhoto({
        quality: options.quality || 0.95,
        highRes: options.highRes || false,
        live: options.live || false
      });
    } catch (error) {
      console.error('Failed to capture photo:', error);
      throw error;
    }
  }
};

export default CapacitorCameraAPI;