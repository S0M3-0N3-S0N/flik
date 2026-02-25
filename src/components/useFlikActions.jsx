import { useEffect, useRef } from 'react';

// Global registry for page actions and context - namespaced to avoid conflicts
if (!window.__FLIK_REGISTRY__) {
  window.__FLIK_REGISTRY__ = {
    actions: {},
    context: {}
  };
}

export function useFlikActions(pageName, actions, getContext = null) {
  const actionsRef = useRef(actions);
  const getContextRef = useRef(getContext);
  
  // Keep refs updated without triggering effect
  actionsRef.current = actions;
  getContextRef.current = getContext;
  
  useEffect(() => {
    // Register actions when page mounts
    window.__FLIK_REGISTRY__.actions[pageName] = actionsRef.current;
    if (getContextRef.current) {
      window.__FLIK_REGISTRY__.context[pageName] = getContextRef.current;
    }
    
    // Cleanup when page unmounts
    return () => {
      delete window.__FLIK_REGISTRY__.actions[pageName];
      delete window.__FLIK_REGISTRY__.context[pageName];
    };
  }, [pageName]); // Only pageName in deps - actions/getContext via refs
}

export function getFlikActions(pageName) {
  return window.__FLIK_REGISTRY__?.actions[pageName] || {};
}

export function getFlikContext(pageName) {
  const getContext = window.__FLIK_REGISTRY__?.context[pageName];
  return getContext ? getContext() : {};
}