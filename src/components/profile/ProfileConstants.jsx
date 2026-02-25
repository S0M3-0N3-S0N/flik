
// Profile Page Constants

export const ITEMS_PER_PAGE = 20;
export const MAX_CREATIONS_FETCH = 500; // Increased from 100
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title', label: 'By Title' },
  { value: 'prompt_length', label: 'By Prompt Length' }
];

export const DATE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' }
];

export const FILTER_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' }
];

// Accessibility - Minimum touch target size
export const MIN_TOUCH_TARGET = 44; // 44x44px

// Batch operations
export const BATCH_DELETE_WARNING_THRESHOLD = 50;
export const BATCH_DELETE_TOAST_DURATION = 5000;
