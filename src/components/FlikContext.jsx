import React, { createContext, useContext, useState, useEffect } from 'react';

const FlikContext = createContext();

export function useFlik() {
  const context = useContext(FlikContext);
  if (!context) {
    throw new Error('useFlik must be used within FlikProvider');
  }
  return context;
}

export function FlikProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('flik_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist messages
  useEffect(() => {
    localStorage.setItem('flik_messages', JSON.stringify(messages));
  }, [messages]);

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('flik_messages');
  };

  return (
    <FlikContext.Provider value={{
      isOpen,
      setIsOpen,
      messages,
      setMessages,
      clearHistory
    }}>
      {children}
    </FlikContext.Provider>
  );
}