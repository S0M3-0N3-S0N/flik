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
      const parsed = saved ? JSON.parse(saved) : [];
      // Limit to last 50 messages to prevent bloat
      return parsed.slice(-50);
    } catch {
      return [];
    }
  });

  // Persist messages with limit
  useEffect(() => {
    const limited = messages.slice(-50); // Keep only last 50
    localStorage.setItem('flik_messages', JSON.stringify(limited));
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