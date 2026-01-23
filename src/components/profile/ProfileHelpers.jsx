import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from './ProfileConstants';

export const validateEmail = (email) => {
  if (!email || !email.trim() || email !== email.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
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

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const highlightText = (text, query) => {
  if (!query || !text) return escapeHtml(text);
  
  const escapedText = escapeHtml(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const parts = escapedText.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? `<mark class="bg-[#FF6B35]/30 text-white">${part}</mark>`
      : part
  ).join('');
};

export const getTimeframeStats = (creations) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const stats = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: creations.length
  };
  
  creations.forEach(creation => {
    try {
      if (!creation.created_date) return;
      
      const createdDate = new Date(creation.created_date);
      
      // Check if date is valid
      if (isNaN(createdDate.getTime())) return;
      
      if (createdDate >= todayStart) stats.today++;
      if (createdDate >= weekStart) stats.thisWeek++;
      if (createdDate >= monthStart) stats.thisMonth++;
    } catch (error) {
      console.warn('Invalid date for creation:', creation.id, error);
    }
  });
  
  return stats;
};