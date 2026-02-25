// Generate Page Constants

export const MAX_PROMPTS_PER_GENERATION = 5;
export const GALLERY_FETCH_LIMIT = 50;
export const PROMPT_HISTORY_LIMIT = 10;
export const MAX_IMAGE_COUNT = 5;
export const DEFAULT_IMAGE_COUNT = 1;
export const DEFAULT_ASPECT_RATIO = "1:1";
export const DEFAULT_IMAGE_STRENGTH = 0.5;

// Image count options
export const IMAGE_COUNT_OPTIONS = [1, 3, 5];

// Aspect ratio options
export const ASPECT_RATIO_OPTIONS = [
  { id: "1:1", label: "Square" },
  { id: "16:9", label: "Landscape" },
  { id: "9:16", label: "Portrait" }
];

// AI Model options
export const AI_MODEL_OPTIONS = {
  DEFAULT: "default",
  GEMINI: "gemini"
};