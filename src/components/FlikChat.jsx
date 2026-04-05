import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User, Loader2, Image as ImageIcon, ExternalLink, Trash2, RefreshCw, Upload, Grid3x3, Play, SlidersHorizontal, Wand2, Layers, Crop, ArrowLeft, AlertCircle, Copy, Edit2, Check, Mic, MicOff, Volume2, VolumeX, Save, History, MessageSquare, Palette, Plus, SquarePen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from 'react-markdown';
import { useFlik } from "./FlikContext";
import { getFlikActions, getFlikContext } from "./useFlikActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildFlikPrompt } from "./prompts/flikChatPrompt";

// Constants
const CACHE_DURATION = 30000; // 30 seconds
const GALLERY_CACHE_DURATION = 60000; // 1 minute
const MAX_RECENT_CREATIONS = 30;
const CONTEXT_MESSAGES_LIMIT = 15;
const SHOWN_CREATIONS_LIMIT = 20;
const GALLERY_FETCH_LIMIT = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const NAVIGATION_DELAY = 800; // ms
const MAX_IN_MEMORY_MESSAGES = 100;
const MAX_STORED_MESSAGES = 100;
const FLIK_AVATAR_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg";

export default function FlikChat() {
  const { isOpen, setIsOpen, messages, setMessages, clearHistory, attachedImages, setAttachedImages, currentConversationId, setCurrentConversationId, saveCurrentConversation, startNewConversation, loadConversation } = useFlik();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUploadingChat, setIsUploadingChat] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryCreations, setGalleryCreations] = useState([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [retryMessage, setRetryMessage] = useState(null);
  const [galleryCachedData, setGalleryCachedData] = useState(null);
  const [galleryLastFetch, setGalleryLastFetch] = useState(0);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState([]);
  const [gallerySearchTerm, setGallerySearchTerm] = useState("");
  const [displayedCount, setDisplayedCount] = useState(SHOWN_CREATIONS_LIMIT);
  const [fullImageView, setFullImageView] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [actionLoadingStates, setActionLoadingStates] = useState({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [galleryHasMore, setGalleryHasMore] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [internetEnabled, setInternetEnabled] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [normalMode, setNormalMode] = useState(true);
  const scrollRef = useRef(null);
  const chatFileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const abortControllerRef = useRef(null);
  const isFetchingUserDataRef = useRef(false);
  const recognitionRef = useRef(null);
  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const queryClient = useQueryClient();
  const attachedImageObjectURLs = useRef(new Set());
  const lastMessageTimeRef = useRef(0);
  const eventListenersRef = useRef([]);

  // Memoized ReactMarkdown components configuration
  const markdownComponents = useMemo(() => ({
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="relative group/code">
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto my-2">
            <code className={className} {...props}>{children}</code>
          </pre>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
            onClick={() => {
              navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
              toast.success('Code copied');
            }}
          >
            <Copy className="h-3 w-3 text-slate-400" />
          </Button>
        </div>
      ) : (
        <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
          {children}
        </code>
      );
    },
    a: ({ children, ...props }) => (
      <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
    li: ({ children }) => <li className="my-0.5">{children}</li>,
    h1: ({ children }) => <h1 className="text-lg font-semibold my-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-semibold my-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-600">
        {children}
      </blockquote>
    ),
  }), []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Initialize voices for speech synthesis
  useEffect(() => {
    if (window.speechSynthesis) {
      // Load voices immediately if available
      window.speechSynthesis.getVoices();
      
      // Listen for voices changed event (needed for some browsers)
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
        base44.analytics.track({ eventName: 'flik_voice_input_ended' });
      };
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (event.results[event.results.length - 1].isFinal) {
          const finalInput = transcript.trim();
          if (finalInput.length > 0) {
            setInput(finalInput);
            // Auto-send after voice input for hands-free conversation
            setTimeout(() => {
              setInput(finalInput);
              handleSend(finalInput, []);
              setIsListening(false);
            }, 500);
          }
        }
      };
      recognition.onerror = (event) => {
        try {
          recognitionRef.current?.stop();
        } catch (e) {
          // Ignore if already stopped
        }
        setIsListening(false);
        toast.error('Voice recognition failed');
        base44.analytics.track({ 
          eventName: 'flik_voice_input_error',
          properties: { error: event.error }
        });
      };
      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      try {
        recognitionRef.current?.start();
        base44.analytics.track({ eventName: 'flik_voice_input_started' });
      } catch (error) {
        // Ignore if already started
        if (error.message && error.message.includes('already started')) {
          console.log('Recognition already started');
        } else {
          console.error('Speech recognition error:', error);
          toast.error('Voice recognition failed to start');
        }
        return;
      }
    }
  }, [isListening]);

  const getPreferredVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => 
      v.name.includes('Google US English') || 
      v.name.includes('Samantha') ||
      (v.lang.startsWith('en-US') && v.name.toLowerCase().includes('female'))
    ) || voices.find(v => v.lang.startsWith('en-US')) || voices[0];
  }, []);



  const toggleVoiceOutput = useCallback(() => {
    const newState = !voiceEnabled;
    if (voiceEnabled) {
      window.speechSynthesis?.cancel();
      isSpeakingRef.current = false;
      speechQueueRef.current = [];
    }
    setVoiceEnabled(newState);
    base44.analytics.track({ 
      eventName: 'flik_voice_output_toggled',
      properties: { enabled: newState }
    });
  }, [voiceEnabled]);

  const processSpeechQueue = useCallback(function processSpeech() {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0 || !window.speechSynthesis) return;
    
    isSpeakingRef.current = true;
    const text = speechQueueRef.current.shift();
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.volume = 1;
      
      const voice = getPreferredVoice();
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.onend = () => {
        isSpeakingRef.current = false;
        processSpeech();
      };
      
      utterance.onerror = (event) => {
        isSpeakingRef.current = false;
        console.warn('Speech synthesis error:', event.error);
        processSpeech();
      };
      
      // Cancel any pending utterances
      window.speechSynthesis.cancel();
      
      // On mobile, we may need a small delay before speaking
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.error('Failed to speak:', e);
          isSpeakingRef.current = false;
          processSpeech();
        }
      }, 100);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      isSpeakingRef.current = false;
      processSpeech();
    }
  }, [getPreferredVoice]);

  const enqueueSpeech = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    speechQueueRef.current.push(text);
    processSpeechQueue();
  }, [voiceEnabled, processSpeechQueue]);

  const getCurrentPage = useCallback(() => {
    const path = location.pathname;
    if (path.includes('Editor') || path.includes('editor')) return 'Editor';
    if (path.includes('Generate') || path.includes('generate')) return 'Generate';
    if (path.includes('Profile') || path.includes('profile')) return 'Profile';
    return 'Unknown';
  }, [location.pathname]);

  // Cache user data to avoid refetching on every message
  const [cachedUserData, setCachedUserData] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchUserData = useCallback(async () => {
    if (isFetchingUserDataRef.current) return;
    
    isFetchingUserDataRef.current = true;
    try {
      const userProfile = await base44.auth.me();
      const allCreations = await base44.entities.Creation.filter({ created_by: userProfile.email }, '-created_date', MAX_RECENT_CREATIONS, { data_env: "prod" });
      setCachedUserData({ userProfile, allCreations });
      setLastFetchTime(Date.now());
    } catch (e) {
      console.error("Failed to fetch user data:", e);
      setCachedUserData({ userProfile: null, allCreations: [] });
    } finally {
      isFetchingUserDataRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Prefetch user data when chat opens
    if (isOpen && (!cachedUserData || Date.now() - lastFetchTime > CACHE_DURATION)) {
      fetchUserData();
    }
  }, [isOpen, cachedUserData, lastFetchTime, fetchUserData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Stop speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      isSpeakingRef.current = false;
      speechQueueRef.current = [];
      
      // Stop voice recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
        recognitionRef.current = null;
      }
      
      // Revoke all attached image object URLs
      attachedImageObjectURLs.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore revoke errors
        }
      });
      attachedImageObjectURLs.current.clear();
      
      // Clean up event listeners
      eventListenersRef.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      eventListenersRef.current = [];
    };
  }, []);

  // Limit in-memory messages
  useEffect(() => {
    if (messages.length > MAX_IN_MEMORY_MESSAGES) {
      setMessages(prev => prev.slice(-MAX_IN_MEMORY_MESSAGES));
    }
  }, [messages.length, setMessages]);

  const handleChatImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_FILE_SIZE) {
        setUploadError(`${f.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    setIsUploadingChat(true);
    setUploadError(null);
    try {
      const newImages = await Promise.all(validFiles.map(async (file, idx) => {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        return { url: uploadResult.file_url, name: file.name, id: `${Date.now()}-${idx}-${Math.random()}` };
      }));
      setAttachedImages(prev => [...prev, ...newImages]);
      base44.analytics.track({ 
        eventName: 'flik_images_uploaded',
        properties: { count: newImages.length }
      });
    } catch (err) {
      console.error("Chat upload error:", err);
      setUploadError("Failed to upload images. Please try again.");
      base44.analytics.track({ eventName: 'flik_image_upload_error' });
    } finally {
      setIsUploadingChat(false);
      if (chatFileRef.current) chatFileRef.current.value = '';
    }
  };

  const handleGalleryPick = useCallback(async () => {
    setShowGalleryPicker(true);
    setSelectedGalleryImages([]);
    setGallerySearchTerm("");
    setDisplayedCount(SHOWN_CREATIONS_LIMIT);
    setImageErrors({});
    
    // Use cached gallery data if fresh
    if (galleryCachedData && Date.now() - galleryLastFetch < GALLERY_CACHE_DURATION) {
      setGalleryCreations(galleryCachedData);
      setGalleryHasMore(galleryCachedData.length >= GALLERY_FETCH_LIMIT);
      base44.analytics.track({ eventName: 'flik_gallery_opened', properties: { cached: true } });
      return;
    }
    
    setIsLoadingGallery(true);
    try {
      const user = await base44.auth.me();
      const creations = await base44.entities.Creation.filter(
        { created_by: user.email },
        '-created_date',
        GALLERY_FETCH_LIMIT
      );
      setGalleryCreations(creations);
      setGalleryCachedData(creations);
      setGalleryLastFetch(Date.now());
      setGalleryHasMore(creations.length >= GALLERY_FETCH_LIMIT);
      base44.analytics.track({ eventName: 'flik_gallery_opened', properties: { cached: false } });
    } catch (e) {
      console.error("Failed to load gallery:", e);
      setGalleryCreations([]);
      setGalleryHasMore(false);
    } finally {
      setIsLoadingGallery(false);
    }
  }, [galleryCachedData, galleryLastFetch]);

  const toggleGallerySelection = useCallback((creation) => {
    const imageUrl = creation.thumbnail_url || creation.url;
    setSelectedGalleryImages(prev => {
      const isSelected = prev.some(img => img.url === imageUrl);
      if (isSelected) {
        return prev.filter(img => img.url !== imageUrl);
      } else {
        return [...prev, {
          url: imageUrl,
          name: creation.title || 'Creation',
          id: `creation-${creation.id}-${Date.now()}`
        }];
      }
    });
  }, []);

  const confirmGallerySelection = useCallback(() => {
    setAttachedImages(prev => [...prev, ...selectedGalleryImages]);
    setShowGalleryPicker(false);
    setSelectedGalleryImages([]);
    setGallerySearchTerm("");
    base44.analytics.track({ 
      eventName: 'flik_gallery_images_selected',
      properties: { count: selectedGalleryImages.length }
    });
  }, [selectedGalleryImages]);

  const handleLoadMoreGallery = async () => {
    if (isLoadingMore || !galleryHasMore) return;
    
    setIsLoadingMore(true);
    try {
      const user = await base44.auth.me();
      const newCreations = await base44.entities.Creation.filter(
        { created_by: user.email },
        '-created_date',
        GALLERY_FETCH_LIMIT,
        galleryCreations.length,
        { data_env: "prod" }
      );
      
      const updatedCreations = [...galleryCreations, ...newCreations];
      setGalleryCreations(updatedCreations);
      setGalleryCachedData(updatedCreations);
      setGalleryHasMore(newCreations.length >= GALLERY_FETCH_LIMIT);
    } catch (e) {
      console.error("Failed to load more gallery items:", e);
      toast.error("Failed to load more images");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleImageError = useCallback((creationId) => {
    setImageErrors(prev => ({ ...prev, [creationId]: true }));
  }, []);

  // Memoized filtered gallery creations for dialog
  const filteredGalleryCreations = useMemo(() => {
    if (!gallerySearchTerm.trim()) return galleryCreations;
    const term = gallerySearchTerm.toLowerCase();
    return galleryCreations.filter(c => 
      (c.title?.toLowerCase().includes(term)) || 
      (c.prompt?.toLowerCase().includes(term))
    );
  }, [galleryCreations, gallerySearchTerm]);
  
  // Memoize filtered creations to avoid duplicate filtering
  const filteredGalleryCreationsForDialog = useMemo(() => {
    if (!gallerySearchTerm.trim()) return galleryCreations;
    const term = gallerySearchTerm.toLowerCase();
    return galleryCreations.filter(c => 
      (c.title?.toLowerCase().includes(term)) || 
      (c.prompt?.toLowerCase().includes(term))
    );
  }, [galleryCreations, gallerySearchTerm]);

  const handleSend = async (retryInput = null, retryImages = null, retryMsgId = null) => {
    const messageContent = retryInput || input;
    const messageImages = retryImages || attachedImages;
    
    if (!messageContent.trim() && messageImages.length === 0) {
      setIsListening(false);
      return;
    }
    
    // Rate limiting: prevent spam (max 1 message per 2 seconds)
    const now = Date.now();
    if (now - lastMessageTimeRef.current < 2000) {
      toast.error('Please wait a moment before sending another message');
      return;
    }
    lastMessageTimeRef.current = now;
    
    // Input validation
    if (messageContent.length > 5000) {
      toast.error('Message too long (max 5000 characters)');
      return;
    }
    
    const userMsg = { 
      role: 'user', 
      content: messageContent,
      images: messageImages.map(img => img.url),
      timestamp: new Date().toISOString(),
      id: `msg-${Date.now()}-${Math.random()}`
    };
    
    if (!retryInput) {
      setMessages(prev => [...prev, userMsg]);
    } else if (retryMsgId) {
      // Remove error message when retrying
      setMessages(prev => prev.filter(m => m.id !== retryMsgId));
    }
    
    const currentInput = messageContent;
    const userUploadedImages = [...messageImages];
    
    setInput("");
    setAttachedImages([]);
    setIsTyping(true);
    setUploadError(null);
    setRetryMessage(null);

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Create new abort controller with timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsTyping(false);
      }
    }, 60000); // 60 second timeout

    try {
      // Use cached data if available
      if (!cachedUserData || Date.now() - lastFetchTime > CACHE_DURATION) {
        await fetchUserData();
      }

      const { userProfile = null, allCreations = [] } = cachedUserData || {};
      const contextImages = userUploadedImages && userUploadedImages.length > 0 
        ? userUploadedImages.map(img => img.url) 
        : [];
      const currentPage = getCurrentPage();
      const pageActions = getFlikActions(currentPage);
      const pageContext = getFlikContext(currentPage);

      // Fetch saved conversations for context
      let savedConversationsContext = '';
      try {
        const savedConvs = await base44.entities.FlikConversation.filter({ created_by: userProfile.email }, '-last_message_at', 5);
        if (savedConvs && savedConvs.length > 0) {
          savedConversationsContext = `\n\nPAST SAVED CONVERSATIONS (user has ${savedConvs.length} saved chats):\n${savedConvs.map(conv => `- "${conv.title}" (${conv.messages?.length || 0} messages)`).join('\n')}`;
        }
      } catch (e) {
        // Silently fail if can't fetch saved conversations
      }

      base44.analytics.track({ 
        eventName: 'flik_message_sent',
        properties: { 
          hasImages: contextImages.length > 0,
          internetEnabled,
          currentPage
        }
      });
      
      // Normal mode: Helpful, unrestricted AI assistant
      const normalModePrompt = `You are FLIK - a friendly, helpful AI assistant. You can help with anything the user needs: writing essays, coding, financial advice, creative projects, learning, problem-solving, brainstorming - absolutely anything. You have no restrictions.

You're also integrated into the FLIK AI Creative Suite with these features available:
📸 Photo Studio (Editor): Magic Brush, Adjustments, Filters, Transform, Batch Mode, AI Text Generator
✨ Imagine AI (Generator): Text-to-image with styles & reference images  
👤 Profile & Gallery: All creations, search, organize
🔗 Community: Like, comment, follow creators

USER INFO:
- Name: ${cachedUserData?.userProfile?.full_name || 'User'}
- Total Creations: ${cachedUserData?.allCreations?.length || 0}${savedConversationsContext}

CONVERSATION HISTORY:
${messages.slice(-CONTEXT_MESSAGES_LIMIT).map(m => `${m.role === 'user' ? 'User' : 'FLIK'}: ${m.content}`).join('\n')}

User: ${currentInput}${contextImages.length > 0 ? `\n📸 User attached ${contextImages.length} image(s)` : ''}

RESPONSE STYLE: Be a genuine, helpful friend. Be casual, warm, and thorough. Help with whatever they need - write essays, explain code, discuss finances, brainstorm ideas, anything. Match the depth they need. Use contractions and be natural. Mention app features only if relevant to their request.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: normalMode ? normalModePrompt : buildFlikPrompt({
          internetEnabled,
          userProfile,
          allCreations,
          messages,
          currentInput,
          contextImages,
          currentPage,
          pageContext,
          CONTEXT_MESSAGES_LIMIT,
          SHOWN_CREATIONS_LIMIT
        }),
        file_urls: contextImages.length > 0 ? contextImages : undefined,
        add_context_from_internet: internetEnabled,
        response_json_schema: normalMode ? {
          type: "object",
          properties: {
            message: { type: "string" }
          },
          required: ["message"]
        } : {
          type: "object",
          properties: {
            message: { type: "string" },
            image_urls: { type: "array", items: { type: "string" } },
            suggested_prompt: { type: "string" },
            suggested_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  type: { type: "string", enum: ["navigate", "tool", "adjustment", "filter", "crop", "apply_prompt", "apply_style"] },
                  payload: { type: "object", additionalProperties: true }
                },
                required: ["label", "type", "payload"]
              }
            }
          },
          required: ["message"]
        }
      });

      const assistantMsg = { 
        role: 'assistant', 
        content: response.message,
        image_urls: response.image_urls,
        suggested_prompt: response.suggested_prompt,
        suggested_actions: response.suggested_actions,
        timestamp: new Date().toISOString(),
        id: `msg-${Date.now()}-${Math.random()}`
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      clearTimeout(timeoutId);
      
      base44.analytics.track({ 
        eventName: 'flik_response_received',
        properties: { 
          hasImages: !!response.image_urls?.length,
          hasSuggestedActions: !!response.suggested_actions?.length,
          currentPage
        }
      });
      
      // Speak response in natural sentences if voice output is enabled
      if (voiceEnabled) {
        const sentences = response.message
          .split(/(?<=[.!?])\s+/)
          .filter(s => s.trim().length > 0);
        
        sentences.forEach(sentence => {
          enqueueSpeech(sentence.trim());
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        base44.analytics.track({ eventName: 'flik_request_aborted' });
        return;
      }
      console.error("FLIK error:", error);
      base44.analytics.track({ 
        eventName: 'flik_error',
        properties: { error: error.message || 'Unknown error' }
      });
      const errorMsg = { 
        role: 'assistant', 
        content: "Oops! I'm having trouble connecting right now. Try again in a moment? 🔌",
        timestamp: new Date().toISOString(),
        id: `error-${Date.now()}-${Math.random()}`,
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
      setRetryMessage({ input: currentInput, images: userUploadedImages, errorMsgId: errorMsg.id });
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleAction = async (action, actionIdx) => {
    const actionKey = `${actionIdx}`;
    setActionLoadingStates(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      const currentPage = getCurrentPage();
      const pageActions = getFlikActions(currentPage);

      if (action.type === 'navigate') {
        let url = createPageUrl(action.payload.page);
        if (action.payload.loadUrl) {
          url += '?load=' + encodeURIComponent(action.payload.loadUrl);
        }
        navigate(url);
        setTimeout(() => setIsOpen(false), NAVIGATION_DELAY);
        toast.success(`Opening ${action.payload.page}...`);
      } else if (pageActions && typeof pageActions[action.type] === 'function') {
        await pageActions[action.type](action.payload);
        toast.success('Action applied!');
      } else {
        console.warn('Action not available on current page:', action.type, currentPage);
        toast.error('This action is not available on the current page');
      }
    } catch (error) {
      console.error('Action execution failed:', error);
      toast.error('Failed to perform action');
    } finally {
      setActionLoadingStates(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleCopyMessage = useCallback((messageId, content) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  const handleDeleteMessage = useCallback((messageId) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [setMessages]);

  const handleEditMessage = useCallback((message) => {
    setEditingMessageId(message.id);
    setEditInput(message.content);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editInput.trim()) return;
    
    // Find the index of the edited message
    const editedMsgIndex = messages.findIndex(m => m.id === editingMessageId);
    if (editedMsgIndex === -1) return;
    
    const editedMessage = messages[editedMsgIndex];
    
    // Remove all messages after the edited one
    setMessages(prev => prev.slice(0, editedMsgIndex));
    
    // Clear edit state
    setEditingMessageId(null);
    setEditInput("");
    
    // Resend with the edited content and original images
    setTimeout(() => {
      handleSend(editInput, editedMessage.images?.map(url => ({ url, id: `retry-${Date.now()}-${Math.random()}` })) || []);
    }, 100);
  }, [editingMessageId, editInput, messages, setMessages, handleSend]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditInput("");
  }, []);

  // Conversations Query
  const { data: savedConversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['flikConversations'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.FlikConversation.filter({ created_by: user.email }, '-last_message_at', 50);
    },
    enabled: showConversations
  });

  const saveConversationMutation = useMutation({
    mutationFn: async ({ title, messages, conversationId }) => {
      if (conversationId) {
        // Update existing
        return base44.entities.FlikConversation.update(conversationId, {
          title,
          messages,
          last_message_at: new Date().toISOString()
        });
      } else {
        // Create new
        return base44.entities.FlikConversation.create({
          title,
          messages,
          last_message_at: new Date().toISOString()
        });
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['flikConversations'] });
      if (!currentConversationId && result?.id) {
        setCurrentConversationId(result.id);
      }
    },
    onError: () => {
      toast.error('Failed to save conversation');
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id) => base44.entities.FlikConversation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flikConversations'] });
      toast.success('Conversation deleted');
    },
    onError: () => {
      toast.error('Failed to delete conversation');
    }
  });

  const handleSaveConversation = async () => {
    setIsSavingConversation(true);
    try {
      await saveCurrentConversation();
      queryClient.invalidateQueries({ queryKey: ['flikConversations'] });
      base44.analytics.track({ eventName: 'flik_conversation_saved' });
    } finally {
      setIsSavingConversation(false);
    }
  };

  const handleLoadConversation = (conversation) => {
    loadConversation(conversation);
    setShowConversations(false);
    toast.success('Conversation loaded');
    base44.analytics.track({ eventName: 'flik_conversation_loaded' });
  };

  const handleNewConversation = async () => {
    await startNewConversation();
    queryClient.invalidateQueries({ queryKey: ['flikConversations'] });
    base44.analytics.track({ eventName: 'flik_conversation_started' });
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-full md:w-[440px] bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] border-l border-white/5 shadow-2xl z-50 flex flex-col"
          style={{
            boxShadow: 'inset 1px 0 rgba(255,255,255,0.05), 0 0 120px rgba(255,107,53,0.1)'
          }}
        >
          <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-[#141414] via-[#0f0f0f] to-[#1a1a1a] relative overflow-hidden backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/8 via-transparent to-[#FFB800]/8" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[2px] shadow-lg shadow-[#FF6B35]/30">
                <div className="w-full h-full rounded-[14px] bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                  <img 
                    src={FLIK_AVATAR_URL} 
                    alt="FLIK" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg gradient-text">FLIK</h3>
              </div>
            </div>
            <div className="flex items-center gap-1 relative z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNewConversation}
                className="text-white/60 hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 h-11 w-11 min-h-[44px] min-w-[44px]"
                title="New chat"
                aria-label="Start new conversation"
              >
                <SquarePen className="w-4 h-4" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowConversations(true)}
                className="text-white/60 hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 h-11 w-11 min-h-[44px] min-w-[44px]"
                title="Saved conversations"
                aria-label="View saved conversations"
              >
                <History className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => {
                setIsOpen(false);
                base44.analytics.track({ eventName: 'flik_chat_closed' });
              }} className="text-white/60 hover:text-white hover:bg-transparent h-11 w-11 min-h-[44px] min-w-[44px] ml-1">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center py-12 px-4 space-y-8 flex flex-col items-center justify-center h-full">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                transition={{ duration: 0.3 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[2px] shadow-2xl shadow-[#FF6B35]/40"
              >
                <div className="w-full h-full rounded-[14px] bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                  <img 
                    src={FLIK_AVATAR_URL} 
                    alt="FLIK" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
              <div>
                <h4 className="text-white font-bold text-2xl mb-1.5">Ready to create?</h4>
                <p className="text-white/40 text-sm leading-relaxed">
                  How can I help you today?
                </p>
              </div>
              <div className="flex flex-col gap-2.5 w-full max-w-sm mt-2">
                <motion.button 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => setInput("Show me my recent creations")} 
                  className="relative px-5 py-3.5 bg-[#0a0a0a] rounded-2xl text-sm text-white/80 hover:text-white transition-all group overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FF6B35] via-[#F72C25] to-[#FFB800] opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                  <div className="absolute inset-[1.5px] rounded-[15px] bg-[#0a0a0a]" />
                  <div className="absolute inset-[1.5px] rounded-[15px] border border-white/5 group-hover:border-[#FF6B35]/30 transition-colors" />
                  <span className="relative">Show me my recent creations</span>
                </motion.button>
                <motion.button 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => setInput("Help me create something amazing")} 
                  className="relative px-5 py-3.5 bg-[#0a0a0a] rounded-2xl text-sm text-white/80 hover:text-white transition-all group overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FF6B35] via-[#F72C25] to-[#FFB800] opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                  <div className="absolute inset-[1.5px] rounded-[15px] bg-[#0a0a0a]" />
                  <div className="absolute inset-[1.5px] rounded-[15px] border border-white/5 group-hover:border-[#FF6B35]/30 transition-colors" />
                  <span className="relative">Help me create something amazing</span>
                </motion.button>
                <motion.button 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => setInput("What can you do?")} 
                  className="relative px-5 py-3.5 bg-[#0a0a0a] rounded-2xl text-sm text-white/80 hover:text-white transition-all group overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FF6B35] via-[#F72C25] to-[#FFB800] opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                  <div className="absolute inset-[1.5px] rounded-[15px] bg-[#0a0a0a]" />
                  <div className="absolute inset-[1.5px] rounded-[15px] border border-white/5 group-hover:border-[#FF6B35]/30 transition-colors" />
                  <span className="relative">What can you do?</span>
                </motion.button>
                <motion.button 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={() => setInput("Give me creative tips")} 
                  className="relative px-5 py-3.5 bg-[#0a0a0a] rounded-2xl text-sm text-white/80 hover:text-white transition-all group overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FF6B35] via-[#F72C25] to-[#FFB800] opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                  <div className="absolute inset-[1.5px] rounded-[15px] bg-[#0a0a0a]" />
                  <div className="absolute inset-[1.5px] rounded-[15px] border border-white/5 group-hover:border-[#FF6B35]/30 transition-colors" />
                  <span className="relative">Give me creative tips</span>
                </motion.button>
              </div>
              </div>
            )}

            {messages.map((msg) => {
              const isEditing = editingMessageId === msg.id;

              return (
              <div
                key={msg.id || msg.timestamp}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[2px] flex-shrink-0 shadow-lg shadow-[#FF6B35]/20">
                    <div className="w-full h-full rounded-[10px] bg-[#141414] flex items-center justify-center overflow-hidden">
                      <img 
                        src={FLIK_AVATAR_URL} 
                        alt="FLIK" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  {msg.role === 'user' && (
                    <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      <button
                        onClick={() => handleEditMessage(msg)}
                        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/80"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/80"
                        title="Copy"
                      >
                        {copiedMessageId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex gap-2 bg-gradient-to-br from-white/10 to-white/5 p-3 rounded-2xl border border-[#FF6B35]/30 shadow-lg backdrop-blur-sm">
                      <Input
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit();
                          }
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="bg-black/30 border-white/20 text-white focus-visible:ring-[#FF6B35]/50 placeholder:text-white/30"
                        autoFocus
                      />
                      <Button size="icon" onClick={handleSaveEdit} className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="hover:bg-red-500/10 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm space-y-2 border ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white rounded-tr-none shadow-lg border-[#FF6B35]/30'
                        : 'bg-white/8 text-white/90 rounded-tl-none backdrop-blur-md border-white/10 hover:border-white/20 transition-colors'
                    }`}
                  >
                    {msg.role === 'user' && msg.images && msg.images.length > 0 && (
                      <div className={`grid gap-2 mb-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {msg.images.map((imgUrl, idx) => (
                          <div 
                            key={idx} 
                            className="rounded-lg overflow-hidden border border-white/20 aspect-square cursor-pointer hover:border-[#FF6B35] transition-colors"
                            onClick={() => setFullImageView(imgUrl)}
                          >
                            <img src={imgUrl} alt="Uploaded" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.image_urls && msg.image_urls.length > 0 && (
                      <div className={`grid gap-2 mb-2 ${msg.image_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {msg.image_urls.map((imgUrl, idx) => (
                          <div 
                            key={idx} 
                            className="rounded-lg overflow-hidden border border-white/10 hover:border-[#FF6B35]/50 transition-colors cursor-pointer"
                            onClick={() => setFullImageView(imgUrl)}
                          >
                            <img 
                              src={imgUrl} 
                              alt={`Response ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 last:[&>*]:mb-0 [&>p]:leading-relaxed">
                      <ReactMarkdown components={markdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                      </div>
                      {msg.timestamp && (
                      <div className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                        {msg.edited && <span className="italic">(edited)</span>}
                      </div>
                      )}
                      </div>
                      )}

                  {msg.role === 'assistant' && (
                    <div className="flex flex-col gap-2 mt-2">
                      {msg.suggested_prompt && (
                        <button
                          onClick={() => {
                            setInput(msg.suggested_prompt);
                          }}
                          className="bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 hover:border-[#FF6B35]/50 rounded-lg p-2 text-xs text-white/60 hover:text-white/80 italic border-l-2 border-l-[#FF6B35] transition-all text-left group"
                        >
                          <span className="block mb-1 text-[10px] text-white/40 group-hover:text-[#FF6B35]">💡 Click to use this prompt</span>
                          "{msg.suggested_prompt}"
                        </button>
                      )}
                      
                      {msg.isError && retryMessage && (
                        <button
                          onClick={() => handleSend(retryMessage.input, retryMessage.images, retryMessage.errorMsgId)}
                          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-all"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry Message
                        </button>
                      )}
                      
                      {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                         <div className="flex flex-wrap gap-2">
                           {msg.suggested_actions.map((action, idx) => {
                             const getIcon = () => {
                               if (action.type === 'navigate') return ExternalLink;
                               if (action.type === 'tool') return Wand2;
                               if (action.type === 'adjustment') return SlidersHorizontal;
                               if (action.type === 'filter') return Layers;
                               if (action.type === 'crop') return Crop;
                               if (action.type === 'apply_prompt') return ArrowLeft;
                               return Play;
                             };
                             const Icon = getIcon();
                             const actionKey = `${idx}`;
                             const isLoading = actionLoadingStates[actionKey];

                             return (
                               <button
                                 key={idx}
                                 onClick={() => handleAction(action, idx)}
                                 disabled={isLoading}
                                 className="flex items-center gap-2 bg-gradient-to-r from-white/5 to-white/10 hover:from-[#FF6B35]/20 hover:to-[#FFB800]/20 border border-white/10 hover:border-[#FF6B35]/50 text-white/90 text-[11px] px-3 py-1.5 rounded-lg transition-all group shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                 {isLoading ? (
                                   <Loader2 className="w-3 h-3 text-[#FF6B35] animate-spin" />
                                 ) : (
                                   <Icon className="w-3 h-3 text-[#FF6B35]" />
                                 )}
                                 <span>{action.label}</span>
                                 {!isLoading && <Play className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 group-hover:text-[#FF6B35] transition-all" />}
                               </button>
                             );
                           })}
                         </div>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg shadow-[#FF6B35]/20">
                    {cachedUserData?.userProfile?.profile_picture ? (
                      <img 
                        src={cachedUserData.userProfile.profile_picture} 
                        alt={cachedUserData.userProfile.full_name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {cachedUserData?.userProfile?.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4 text-white" />}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
            })}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[2px] shadow-lg shadow-[#FF6B35]/20">
                  <div className="w-full h-full rounded-[10px] bg-[#141414] flex items-center justify-center overflow-hidden">
                    <img 
                      src={FLIK_AVATAR_URL} 
                      alt="FLIK" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-white/10 to-white/5 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center border border-white/5">
                  <span className="text-xs text-white/60 mr-2">FLIK is thinking</span>
                  <span className="w-2 h-2 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#F72C25] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#FFB800] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-[#1a1a1a] space-y-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom) + 8px)' }}>
            {uploadError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {uploadError}
              </div>
            )}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {attachedImages.map((img) => (
                  <div key={img.id} className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-white/10 group">
                    <img src={img.url} alt={img.name || 'Attached'} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setAttachedImages(prev => prev.filter(i => i.id !== img.id))} 
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      title="Remove image"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!isTyping && !isUploadingChat) {
                  handleSend();
                }
              }}
              className="flex items-center gap-3"
            >
              {/* Attachments Menu Button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    const rect = document.getElementById('attach-menu-btn')?.getBoundingClientRect();
                    const menu = document.getElementById('attach-menu');
                    if (menu) {
                      menu.classList.toggle('hidden');
                    }
                  }}
                  id="attach-menu-btn"
                  className="w-12 h-12 min-h-[44px] min-w-[44px] rounded-full bg-[#2a2a2a] hover:bg-[#333333] flex items-center justify-center transition-all flex-shrink-0 shadow-lg"
                  title="Add attachments"
                >
                  <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                
                {/* Popup Menu */}
                <div 
                  id="attach-menu"
                  className="hidden absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl min-w-[180px]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      chatFileRef.current?.click();
                      document.getElementById('attach-menu')?.classList.add('hidden');
                    }}
                    disabled={isUploadingChat}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-left disabled:opacity-50"
                  >
                    {isUploadingChat ? <Loader2 className="w-4 h-4 animate-spin text-[#FF6B35]" /> : <Upload className="w-4 h-4 text-[#FF6B35]" />}
                    <span className="text-sm">Upload Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleGalleryPick();
                      document.getElementById('attach-menu')?.classList.add('hidden');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-left border-t border-white/5"
                  >
                    <Grid3x3 className="w-4 h-4 text-[#FF6B35]" />
                    <span className="text-sm">From Gallery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInternetEnabled(!internetEnabled);
                      document.getElementById('attach-menu')?.classList.add('hidden');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-left border-t border-white/5"
                  >
                    <svg className={`w-4 h-4 ${internetEnabled ? 'text-[#FF6B35]' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {internetEnabled ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        </>
                      )}
                    </svg>
                    <span className="text-sm">Internet {internetEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNormalMode(prev => !prev);
                      document.getElementById('attach-menu')?.classList.add('hidden');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-left border-t border-white/5"
                  >
                    <Palette className={`w-4 h-4 ${!normalMode ? 'text-[#FF6B35]' : 'text-white/40'}`} />
                    <span className="text-sm">Creative Mode {!normalMode ? '(ON)' : '(OFF)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleVoiceOutput();
                      document.getElementById('attach-menu')?.classList.add('hidden');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-left border-t border-white/5"
                  >
                    {voiceEnabled ? <Volume2 className={`w-4 h-4 text-[#FF6B35]`} /> : <VolumeX className="w-4 h-4 text-white/40" />}
                    <span className="text-sm">Voice Output {voiceEnabled ? '(ON)' : '(OFF)'}</span>
                  </button>
                </div>
              </div>

              {/* Input Field with Mic */}
              <div className="relative flex-1 flex items-center bg-[#2a2a2a] rounded-full h-12 px-5 shadow-lg">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything"
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-white/40 h-auto p-0 text-base"
                />
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`ml-2 flex-shrink-0 transition-all ${
                    isListening 
                      ? 'text-red-400 animate-pulse scale-110' 
                      : 'text-white/50 hover:text-white/80'
                  }`}
                  title={isListening ? "Stop voice input" : "Start voice input"}
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  aria-pressed={isListening}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              {/* Send Button */}
              <Button 
                type="submit" 
                size="icon"
                disabled={(!input.trim() && attachedImages.length === 0) || isTyping || isUploadingChat}
                className="w-12 h-12 min-h-[44px] min-w-[44px] rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white shadow-xl hover:shadow-2xl hover:shadow-[#FF6B35]/40 transition-all disabled:opacity-50 flex-shrink-0 p-0"
              >
                {isTyping ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </Button>

              <input
                ref={chatFileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleChatImageUpload}
                className="hidden"
              />
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
      
    <Dialog open={showGalleryPicker} onOpenChange={setShowGalleryPicker}>
      <DialogContent className="max-w-7xl w-[96vw] h-[92vh] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border-2 border-white/10 text-white flex flex-col shadow-2xl p-0 rounded-3xl overflow-hidden" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom) + 12px)' }}>
        <DialogHeader className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] flex-shrink-0 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
          <div className="relative z-10">
            <DialogTitle className="text-2xl sm:text-3xl font-bold gradient-text flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F72C25] p-[2px]">
                <div className="w-full h-full rounded-[10px] bg-[#0a0a0a] flex items-center justify-center">
                  <Grid3x3 className="w-5 h-5 text-[#FF6B35]" />
                </div>
              </div>
              Gallery Picker
            </DialogTitle>
            <p className="text-sm text-white/60 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-[#FF6B35] text-xs font-medium">
                <ImageIcon className="w-3.5 h-3.5" />
                {filteredGalleryCreations.length} image{filteredGalleryCreations.length !== 1 ? 's' : ''}
              </span>
              {selectedGalleryImages.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium animate-pulse">
                  ✓ {selectedGalleryImages.length} selected
                </span>
              )}
            </p>
            <div className="relative">
              <Input
                value={gallerySearchTerm}
                onChange={(e) => setGallerySearchTerm(e.target.value)}
                placeholder="🔍 Search by title or prompt..."
                className="bg-black/40 border-white/20 text-white text-sm focus-visible:ring-2 focus-visible:ring-[#FF6B35] placeholder:text-white/40 h-11 pl-4 pr-4 rounded-xl shadow-lg backdrop-blur-sm"
              />
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-[#FF6B35]/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#FF6B35]/60 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-full"
          style={{ 
            willChange: 'scroll-position',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {isLoadingGallery ? (
            <>
              {Array.from({ length: 18 }).map((_, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/10 via-transparent to-[#FFB800]/10 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-white/20 border-t-[#FF6B35] rounded-full animate-spin" />
                  </div>
                </div>
              ))}
            </>
          ) : filteredGalleryCreations.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center mb-5 border border-white/10 shadow-lg">
                <ImageIcon className="w-12 h-12 text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-2">
                {gallerySearchTerm ? 'No Matching Images' : 'No Creations Yet'}
              </h3>
              <p className="text-sm text-white/40 mb-4">
                {gallerySearchTerm ? 'Try a different search term' : 'Start creating amazing images to see them here'}
              </p>
              {gallerySearchTerm && (
                <button
                  onClick={() => setGallerySearchTerm("")}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white text-sm rounded-xl transition-all shadow-lg"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredGalleryCreations.map((creation) => {
                const imageUrl = creation.thumbnail_url || creation.url;
                const isSelected = selectedGalleryImages.some(img => img.url === imageUrl);
                const hasError = imageErrors[creation.id];

                return (
                  <button
                    key={creation.id}
                    onClick={() => !hasError && toggleGallerySelection(creation)}
                    disabled={hasError}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 group active:scale-95 bg-gradient-to-br from-black/40 to-black/60 focus:outline-none shadow-lg hover:shadow-2xl ${
                      isSelected 
                        ? 'border-[#FF6B35] shadow-[0_0_30px_rgba(255,107,53,0.5)] scale-105' 
                        : hasError
                        ? 'border-red-500/30 opacity-50 cursor-not-allowed'
                        : 'border-white/10 hover:border-[#FF6B35]/50 hover:scale-105'
                    }`}
                    aria-label={`${isSelected ? 'Remove' : 'Add'} ${creation.title || 'Untitled'}`}
                    style={{ 
                      willChange: 'transform',
                      transform: 'translateZ(0)'
                    }}
                  >
                    {hasError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-400">
                        <AlertCircle className="w-8 h-8" />
                        <span className="text-xs">Failed to load</span>
                      </div>
                    ) : (
                      <>
                        <img 
                          src={imageUrl}
                          alt={creation.title || 'Creation'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                          decoding="async"
                          onError={() => handleImageError(creation.id)}
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`} />
                        <div className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 shadow-lg ${
                          isSelected 
                            ? 'bg-[#FF6B35] opacity-100 scale-100 ring-2 ring-white/30' 
                            : 'bg-white/20 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100'
                        }`}>
                          <Check className="w-4 h-4 text-white font-bold" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/90 to-transparent">
                          <p className="text-xs text-white font-semibold truncate drop-shadow-lg">
                            {creation.title || 'Untitled'}
                          </p>
                          {creation.prompt && (
                            <p className="text-[10px] text-white/60 truncate mt-0.5">
                              {creation.prompt}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
              {galleryHasMore && (
                <div className="col-span-full flex justify-center py-6">
                  <Button
                    onClick={handleLoadMoreGallery}
                    disabled={isLoadingMore}
                    className="bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More Images
                        <span className="ml-2 opacity-70">↓</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
          </div>
          </div>
        {selectedGalleryImages.length > 0 && (
          <div className="px-5 sm:px-7 py-4 sm:py-5 border-t-2 border-white/10 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] backdrop-blur-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 flex-shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  {selectedGalleryImages.length} Image{selectedGalleryImages.length !== 1 ? 's' : ''} Selected
                </p>
                <p className="text-white/50 text-xs">Ready to add to conversation</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 relative z-10">
              <Button
                onClick={() => setSelectedGalleryImages([])}
                className="flex-1 sm:flex-none bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 text-sm px-6 py-2.5 rounded-xl transition-all font-medium"
              >
                Clear Selection
              </Button>
              <Button
                onClick={confirmGallerySelection}
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white text-sm px-8 py-2.5 rounded-xl shadow-xl hover:shadow-2xl transition-all font-semibold"
              >
                Add to Chat →
              </Button>
            </div>
          </div>
        )}
        </DialogContent>
        </Dialog>

        {/* Full Image Viewer */}
        <Dialog open={!!fullImageView} onOpenChange={() => setFullImageView(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] bg-black/95 border border-white/10 p-2 rounded-2xl" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom) + 12px)' }}>
            <button
              onClick={() => setFullImageView(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {fullImageView && (
              <img
                src={fullImageView}
                alt="Full view"
                className="w-full h-full object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Clear Conversation Confirmation */}
        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent className="max-w-md bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-2 border-red-500/30 text-white rounded-2xl" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom) + 12px)' }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                Clear Conversation?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-white/70 text-sm">
                This will clear the current chat. You can save it first if needed.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 border-white/20 text-white bg-white/5 hover:bg-white/10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    clearHistory();
                    setShowClearConfirm(false);
                    toast.success('Conversation cleared');
                  }}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-lg"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Saved Conversations Dialog */}
        <Dialog open={showConversations} onOpenChange={setShowConversations}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border-2 border-white/10 text-white flex flex-col" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom) + 12px)' }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold gradient-text flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F72C25] p-[2px]">
                  <div className="w-full h-full rounded-[9px] bg-[#0a0a0a] flex items-center justify-center">
                    <History className="w-4 h-4 text-[#FF6B35]" />
                  </div>
                </div>
                Saved Conversations
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoadingConversations ? (
                <div className="text-center py-16">
                  <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin mx-auto mb-4" />
                  <p className="text-white/60 text-sm">Loading conversations...</p>
                </div>
              ) : savedConversations.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-white/20" />
                  </div>
                  <p className="text-white/60 text-sm">No saved conversations yet</p>
                  <p className="text-white/40 text-xs mt-2">Save your chats to revisit them later</p>
                </div>
              ) : (
                savedConversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative p-3 rounded-lg bg-[#0a0a0a] border border-white/10 hover:border-[#FF6B35]/40 transition-all group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleLoadConversation(conv)}
                        className="flex-1 text-left min-w-0"
                      >
                        <h4 className="text-white font-medium text-sm mb-0.5 group-hover:text-[#FF6B35] transition-colors truncate">
                          {conv.title}
                        </h4>
                        <p className="text-white/40 text-[11px]">
                          {conv.messages?.length || 0} msgs • {formatDistanceToNow(new Date(conv.last_message_at || conv.created_date), { addSuffix: true })}
                        </p>
                      </button>
                      <Button
                        onClick={() => deleteConversationMutation.mutate(conv.id)}
                        variant="ghost"
                        size="icon"
                        className="text-white/40 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 flex-shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
        </>
        );
        }