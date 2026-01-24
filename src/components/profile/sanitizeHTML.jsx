// Safe HTML sanitization to prevent XSS
export const sanitizeText = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const highlightTextSafe = (text, query) => {
  if (!query || !text) return sanitizeText(text);
  
  const escapedQuery = sanitizeText(query);
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? `<mark style="background-color: rgba(255, 107, 53, 0.3);">${sanitizeText(part)}</mark>`
      : sanitizeText(part)
  ).join('');
};