import React, { createContext, useContext, useState, useEffect } from 'react';
import { MAX_IN_MEMORY_MESSAGES } from './constants/appConstants';

const FlikContext = createContext();

// Fixed issue #28 - consistent message limits (50 in localStorage, 100 in memory)
const LOCAL_STORAGE_LIMIT = 50;

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
      return parsed.slice(-LOCAL_STORAGE_LIMIT);
    } catch (e) {
      console.error('Failed to load messages:', e);
      return [];
    }
  });
  const [attachedImages, setAttachedImages] = useState([]);

  // Persist messages with limit - using consistent constant
  useEffect(() => {
    try {
      const limited = messages.slice(-LOCAL_STORAGE_LIMIT);
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