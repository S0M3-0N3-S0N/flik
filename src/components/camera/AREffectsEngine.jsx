import { useEffect, useRef, useState } from 'react';

// Lazy-loaded face detection
let faceMesh = null;
let segmentation = null;

const loadFaceMesh = async () => {
  if (faceMesh) return faceMesh;
  try {
    const { FaceMesh } = await import('@mediapipe/face_mesh');
    faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    });
    await faceMesh.initialize();
    return faceMesh;
  } catch (e) {
    console.warn('Face Mesh loading failed:', e);
    return null;
  }
};

const loadSegmentation = async () => {
  if (segmentation) return segmentation;
  try {
    const { BodySegmentation } = await import(
      '@tensorflow-models/body-segmentation'
    );
    const model = await BodySegmentation.createSegmenter(
      BodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
      { runtime: 'mediapipe' }
    );
    return model;
  } catch (e) {
    console.warn('Segmentation loading failed:', e);
    return null;
  }
};

export const EFFECTS = [
  { id: 'mask', label: '😷 Mask', icon: '😷', category: 'face' },
  { id: 'halo', label: '✨ Halo', icon: '✨', category: 'face' },
  { id: 'bigEyes', label: '👀 Big Eyes', icon: '👀', category: 'morph' },
  { id: 'beauty', label: '💄 Beauty', icon: '💄', category: 'beauty' },
  { id: 'bgBlur', label: '🌫️ Blur BG', icon: '🌫️', category: 'bg' },
  { id: 'bgReplace', label: '🎨 BG Color', icon: '🎨', category: 'bg' },
  { id: 'particles', label: '✨ Sparkles', icon: '✨', category: 'particles' },
  { id: 'lensFlare', label: '💡 Lens Flare', icon: '💡', category: 'overlay' },
];

class AREffectsEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.faceMesh = null;
    this.segmentationModel = null;
    this.faces = [];
    this.particles = [];
    this.animationFrameId = null;
    this.isProcessing = false;
  }

  async initialize() {
    try {
      this.faceMesh = await loadFaceMesh();
      return this.faceMesh !== null;
    } catch (e) {
      console.error('AR Engine init failed:', e);
      return false;
    }
  }

  async detectFaces(videoElement) {
    if (!this.faceMesh) return [];
    try {
      const results = await this.faceMesh.send({ image: videoElement });
      this.faces = results.multiFaceLandmarks || [];
      return this.faces;
    } catch (e) {
      console.error('Face detection error:', e);
      return [];
    }
  }

  async loadSegmentationModel() {
    if (!this.segmentationModel) {
      this.segmentationModel = await loadSegmentation();
    }
    return this.segmentationModel;
  }

  drawMask(landmarks) {
    // Draw a simple 3D mask overlay on the face
    if (!landmarks || landmarks.length === 0) return;

    const face = landmarks[0];
    const noseTip = face[1]; // Nose
    const jawline = face.slice(200, 400); // Jaw points

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 107, 53, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = 'rgba(255, 107, 53, 0.1)';

    // Simple polygon around face
    this.ctx.beginPath();
    jawline.forEach((p, i) => {
      const x = p.x * this.canvas.width;
      const y = p.y * this.canvas.height;
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawHalo(landmarks) {
    if (!landmarks || landmarks.length === 0) return;

    const face = landmarks[0];
    const topHead = face[10]; // Top of head
    const x = topHead.x * this.canvas.width;
    const y = topHead.y * this.canvas.height;
    const radius = 80;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y - radius / 2, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner glow
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(x, y - radius / 2, radius + 5, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawBigEyes(landmarks) {
    if (!landmarks || landmarks.length === 0) return;

    const face = landmarks[0];
    const leftEye = face[33]; // Left eye
    const rightEye = face[263]; // Right eye

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;

    [leftEye, rightEye].forEach((eye) => {
      const x = eye.x * this.canvas.width;
      const y = eye.y * this.canvas.height;
      const radius = 25;

      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });
    this.ctx.restore();
  }

  drawBeauty(landmarks, intensity = 0.5) {
    // Subtle beauty filter: under-eye brightening + slight smoothing
    if (!landmarks || landmarks.length === 0) return;

    const face = landmarks[0];
    const leftUndereye = face[33]; // Approximate
    const rightUndereye = face[263];

    this.ctx.save();
    this.ctx.globalAlpha = intensity * 0.5;
    this.ctx.fillStyle = 'rgba(255, 200, 150, 0.3)';

    [leftUndereye, rightUndereye].forEach((p) => {
      const x = p.x * this.canvas.width;
      const y = p.y * this.canvas.height;
      this.ctx.beginPath();
      this.ctx.ellipse(x, y + 10, 30, 15, 0, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  drawParticles(landmarks, type = 'sparkles') {
    if (!landmarks || landmarks.length === 0) return;

    const face = landmarks[0];
    const noseTip = face[1];
    const originX = noseTip.x * this.canvas.width;
    const originY = noseTip.y * this.canvas.height;

    // Initialize particles if needed
    if (this.particles.length === 0) {
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: originX,
          y: originY,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 2,
          life: 1,
        });
      }
    }

    this.ctx.save();

    // Update and draw particles
    this.particles = this.particles.filter((p) => p.life > 0);
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gravity
      p.life -= 0.02;

      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = type === 'sparkles' ? '#FFD700' : '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Spawn new particles
    if (Math.random() > 0.7) {
      this.particles.push({
        x: originX + (Math.random() - 0.5) * 20,
        y: originY + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        life: 1,
      });
    }

    this.ctx.restore();
  }

  drawLensFlare(landmarks) {
    if (!landmarks || landmarks.length === 0) return;

    const face = landmarks[0];
    const leftEye = face[33];
    const x = leftEye.x * this.canvas.width + 20;
    const y = leftEye.y * this.canvas.height - 30;

    this.ctx.save();
    this.ctx.globalAlpha = 0.4;

    // Main flare
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 20, 0, Math.PI * 2);
    this.ctx.fill();

    // Surrounding halo
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 35, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  async drawEffect(videoElement, effectId, intensity = 0.5) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const faces = await this.detectFaces(videoElement);

      // Clear canvas and draw video
      this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);

      // Apply effect
      switch (effectId) {
        case 'mask':
          faces.forEach((f) => this.drawMask([f]));
          break;
        case 'halo':
          faces.forEach((f) => this.drawHalo([f]));
          break;
        case 'bigEyes':
          faces.forEach((f) => this.drawBigEyes([f]));
          break;
        case 'beauty':
          faces.forEach((f) => this.drawBeauty([f], intensity));
          break;
        case 'particles':
          faces.forEach((f) => this.drawParticles([f], 'sparkles'));
          break;
        case 'lensFlare':
          faces.forEach((f) => this.drawLensFlare([f]));
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('Effect render error:', e);
    } finally {
      this.isProcessing = false;
    }
  }

  cleanup() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.particles = [];
  }
}

export default AREffectsEngine;