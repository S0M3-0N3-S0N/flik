import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyboard = (e) => {
      // Global shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            navigate(createPageUrl('Editor'));
            break;
          case '2':
            e.preventDefault();
            navigate(createPageUrl('VideoEditor'));
            break;
          case '3':
            e.preventDefault();
            navigate(createPageUrl('Generate'));
            break;
          case '4':
            e.preventDefault();
            navigate(createPageUrl('Gallery'));
            break;
          case 'k':
            e.preventDefault();
            // TODO: Command palette
            break;
        }
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        document.dispatchEvent(new CustomEvent('closeModals'));
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [navigate]);

  return null;
}