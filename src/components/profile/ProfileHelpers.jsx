import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from './ProfileConstants';

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateImageFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }
  
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }
  
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const getFileExtension = (url, type) => {
  if (type === 'video') return '.mp4';
  
  // Try to extract from URL
  const urlExt = url.split('.').pop()?.split('?')[0];
  if (urlExt && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(urlExt.toLowerCase())) {
    return `.${urlExt}`;
  }
  
  return '.png'; // Fallback
};

export const highlightText = (text, query) => {
  if (!query || !text) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? `<mark class="bg-[#FF6B35]/30 text-white">${part}</mark>`
      : part
  ).join('');
};

export const getTimeframeStats = (creations) => {
  const now = new Date();
  const stats = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: creations.length
  };
  
  creations.forEach(creation => {
    const createdDate = new Date(creation.created_date);
    const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 1) stats.today++;
    if (daysDiff < 7) stats.thisWeek++;
    if (daysDiff < 30) stats.thisMonth++;
  });
  
  return stats;
};