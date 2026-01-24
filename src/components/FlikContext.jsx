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
      const saved = localStorage?.getItem('flik_messages');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.slice(-50);
    } catch (e) {
      console.error('Failed to load messages:', e);
      return [];
    }
  });
  const [attachedImages, setAttachedImages] = useState([]);

  // Persist messages with limit
  useEffect(() => {
    try {
      const limited = messages.slice(-50);
      localStorage?.setItem('flik_messages', JSON.stringify(limited));
    } catch (e) {
      console.error('Failed to save messages:', e);
    }
  }, [messages]);

  const clearHistory = () => {
    setMessages([]);
    setAttachedImages([]);
    try {
      localStorage?.removeItem('flik_messages');
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  return (
    <FlikContext.Provider value={{
      isOpen,
      setIsOpen,
      messages,
      setMessages,
      clearHistory,
      attachedImages,
      setAttachedImages
    }}>
      {children}
    </FlikContext.Provider>
  );
}