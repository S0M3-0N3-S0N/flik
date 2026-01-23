import { useEffect } from 'react';

// Global registry for page actions
window.flikActionsRegistry = {};

export function useFlikActions(pageName, actions) {
  useEffect(() => {
    // Register actions when page mounts
    window.flikActionsRegistry[pageName] = actions;
    
    // Cleanup when page unmounts
    return () => {
      delete window.flikActionsRegistry[pageName];
    };
  }, [pageName, actions]);
}

export function getFlikActions(pageName) {
  return window.flikActionsRegistry[pageName] || {};
}