import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

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
  const [attachedImages, setAttachedImages] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Persist messages with limit
  useEffect(() => {
    const limited = messages.slice(-50); // Keep only last 50
    localStorage.setItem('flik_messages', JSON.stringify(limited));
  }, [messages]);

  const clearHistory = () => {
    setMessages([]);
    setAttachedImages([]);
    setCurrentConversationId(null);
    localStorage.removeItem('flik_messages');
  };

  const saveCurrentConversation = async () => {
    if (messages.length === 0) {
      toast.error('No messages to save');
      return null;
    }

    try {
      // Generate title from first user message
      const firstUserMsg = messages.find(m => m.role === 'user')?.content || '';
      const title = firstUserMsg.slice(0, 50) + (firstUserMsg.length > 50 ? '...' : '') || `Chat ${new Date().toLocaleDateString()}`;
      
      if (currentConversationId) {
        // Update existing conversation
        await base44.entities.FlikConversation.update(currentConversationId, {
          title,
          messages,
          last_message_at: new Date().toISOString()
        }, { data_env: "prod" });
        toast.success('Conversation updated!');
        return currentConversationId;
      } else {
        // Create new conversation
        const newConversation = await base44.entities.FlikConversation.create({
          title,
          messages,
          last_message_at: new Date().toISOString()
        }, { data_env: "prod" });
        setCurrentConversationId(newConversation.id);
        toast.success('Conversation saved!');
        return newConversation.id;
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
      toast.error('Failed to save conversation');
      return null;
    }
  };

  const startNewConversation = async () => {
    // Save current conversation if there are messages
    if (messages.length > 0) {
      await saveCurrentConversation();
    }
    
    // Clear state for new conversation
    setMessages([]);
    setAttachedImages([]);
    setCurrentConversationId(null);
    localStorage.removeItem('flik_messages');
    toast.success('Started new conversation');
  };

  const loadConversation = (conversation) => {
    setMessages(conversation.messages || []);
    setCurrentConversationId(conversation.id);
    setAttachedImages([]);
  };

  return (
    <FlikContext.Provider value={{
      isOpen,
      setIsOpen,
      messages,
      setMessages,
      clearHistory,
      attachedImages,
      setAttachedImages,
      currentConversationId,
      setCurrentConversationId,
      saveCurrentConversation,
      startNewConversation,
      loadConversation
    }}>
      {children}
    </FlikContext.Provider>
  );
}