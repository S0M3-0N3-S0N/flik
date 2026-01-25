import { useEffect } from 'react';

// Global registry for page actions and context
window.flikActionsRegistry = {};
window.flikContextRegistry = {};

export function useFlikActions(pageName, actions, getContext = null) {
  useEffect(() => {
    // Register actions when page mounts
    window.flikActionsRegistry[pageName] = actions;
    if (getContext) {
      window.flikContextRegistry[pageName] = getContext;
    }
    
    // Cleanup when page unmounts
    return () => {
      delete window.flikActionsRegistry[pageName];
      delete window.flikContextRegistry[pageName];
    };
  }, [pageName, actions, getContext]);
}

export function getFlikActions(pageName) {
  return window.flikActionsRegistry[pageName] || {};
}

export function getFlikContext(pageName) {
  const getContext = window.flikContextRegistry[pageName];
  return getContext ? getContext() : {};
}