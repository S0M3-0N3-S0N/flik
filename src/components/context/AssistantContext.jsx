import React, { createContext, useContext, useState, useCallback } from 'react';

const AssistantContext = createContext();

export function AssistantProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeContext, setActiveContext] = useState({
    page: 'home',
    data: {},
    actionHandler: null
  });

  const toggleOpen = () => setIsOpen(prev => !prev);
  const openAssistant = () => setIsOpen(true);
  const closeAssistant = () => setIsOpen(false);

  // Pages call this to register their state and capabilities
  const setPageContext = useCallback((info) => {
    setActiveContext(prev => ({ ...prev, ...info }));
  }, []);

  return (
    <AssistantContext.Provider value={{
      isOpen,
      toggleOpen,
      openAssistant,
      closeAssistant,
      activeContext,
      setPageContext
    }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  return useContext(AssistantContext);
}