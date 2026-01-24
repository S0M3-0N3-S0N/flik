// Centralized App Constants - Fixes issues #34, #35, #36

// FLIK Avatar URL (single source of truth)
export const FLIK_AVATAR_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg";

// File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_BATCH_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Cache durations
export const CACHE_DURATION = 30000; // 30 seconds
export const GALLERY_CACHE_DURATION = 60000; // 1 minute

// Limits
export const MAX_RECENT_CREATIONS = 30;
export const CONTEXT_MESSAGES_LIMIT = 15;
export const SHOWN_CREATIONS_LIMIT = 20;
export const GALLERY_FETCH_LIMIT = 50;
export const MAX_IN_MEMORY_MESSAGES = 100;
export const MAX_UNDO_HISTORY = 50;

// Timing
export const NAVIGATION_DELAY = 800;
export const DEBOUNCE_DELAY = 300;

// Batch processing
export const BATCH_COUNT_OPTIONS = [1, 3, 5];

// ID generation utility - fixes issues #91, #92, #93
let idCounter = 0;
export const generateUniqueId = (prefix = 'id') => {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}_${Math.random().toString(36).substr(2, 9)}`;
};

// Date formatting utility - fixes issue #56
export const formatDate = (date, options = {}) => {
  if (!date) return 'Unknown';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric',
      ...options 
    });
  } catch {
    return 'Invalid date';
  }
};

export const formatDateTime = (date) => {
  if (!date) return 'Unknown';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

// Input validation utilities - fixes issues #61-65
export const validateCropArea = (cropArea, bounds = { width: 100, height: 100 }) => {
  return {
    x: Math.max(0, Math.min(bounds.width - 10, cropArea.x || 0)),
    y: Math.max(0, Math.min(bounds.height - 10, cropArea.y || 0)),
    width: Math.max(10, Math.min(bounds.width - (cropArea.x || 0), cropArea.width || 80)),
    height: Math.max(10, Math.min(bounds.height - (cropArea.y || 0), cropArea.height || 80))
  };
};

export const validateBrushSize = (size, min = 1, max = 200) => {
  return Math.max(min, Math.min(max, size || 30));
};

export const sanitizePrompt = (prompt, maxLength = 10000) => {
  if (!prompt || typeof prompt !== 'string') return '';
  // Remove HTML tags to prevent injection
  const sanitized = prompt.replace(/<[^>]*>/g, '').trim();
  return sanitized.substring(0, maxLength);
};

export const validateUrlParam = (param, allowedValues = null) => {
  if (!param || typeof param !== 'string') return null;
  const sanitized = param.replace(/[<>'"]/g, '');
  if (allowedValues && !allowedValues.includes(sanitized)) return null;
  return sanitized;
};

// Sentence splitting that works in all browsers - fixes issue #7
export const splitIntoSentences = (text) => {
  if (!text || typeof text !== 'string') return [];
  // Compatible version without lookbehind
  return text
    .replace(/([.!?])\s+/g, '$1|SPLIT|')
    .split('|SPLIT|')
    .filter(s => s.trim().length > 0);
};

// Throttle function for performance - fixes issue #69
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};