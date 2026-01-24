import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User, Loader2, Trash2, RefreshCw, Grid3x3, AlertCircle, Mic, Volume2, VolumeX, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useFlik } from "./FlikContext";
import { getFlikActions } from "./useFlikActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MessageBubble from "./FlikChat/MessageBubble";
import ChatInput from "./FlikChat/ChatInput";
import GalleryPicker from "./FlikChat/GalleryPicker";
import {
  FLIK_AVATAR_URL,
  CACHE_DURATION,
  GALLERY_CACHE_DURATION,
  MAX_RECENT_CREATIONS,
  CONTEXT_MESSAGES_LIMIT,
  SHOWN_CREATIONS_LIMIT,
  GALLERY_FETCH_LIMIT,
  MAX_FILE_SIZE,
  NAVIGATION_DELAY,
  MAX_IN_MEMORY_MESSAGES,
  generateUniqueId,
  splitIntoSentences
} from "./constants/appConstants";

export default function FlikChat() {
  const { isOpen, setIsOpen, messages, setMessages, clearHistory, attachedImages, setAttachedImages } = useFlik();
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
  const [displayedCount, setDisplayedCount] = useState(20);
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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef(null);
  const chatFileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const abortControllerRef = useRef(null);
  const isFetchingUserDataRef = useRef(false);
  const recognitionRef = useRef(null);
  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);



  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Initialize speech recognition - Fixed issue #1 (duplicate setInput)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (event.results[event.results.length - 1].isFinal) {
          const finalInput = transcript.trim();
          if (finalInput.length > 0) {
            setInput(finalInput);
            // Removed duplicate setInput call - was issue #1
          }
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Voice recognition failed');
      };
      recognitionRef.current = recognition;
    }
    
    // Cleanup speech recognition on unmount - fixes issue #9
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      const timeoutId = setTimeout(() => {
        recognitionRef.current?.stop();
      }, 10000);
      return () => clearTimeout(timeoutId);
    }
  };

  const speakResponse = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoiceOutput = () => {
    if (voiceEnabled) {
      window.speechSynthesis?.cancel();
      isSpeakingRef.current = false;
      speechQueueRef.current = [];
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const processSpeechQueue = useCallback(() => {
   if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;

   isSpeakingRef.current = true;
   const text = speechQueueRef.current.shift();
   if (!text) {
     isSpeakingRef.current = false;
     return;
   }

   const utterance = new SpeechSynthesisUtterance(text);
   utterance.rate = 0.9;
   utterance.pitch = 1.05;
   utterance.volume = 1;

   // Get best available voice
   const voices = window.speechSynthesis?.getVoices?.() || [];
   const preferredVoice = voices.find(v => v.name.includes('Google US English')) || 
                         voices.find(v => v.name.includes('Samantha')) ||
                         voices.find(v => v.lang.includes('en-US')) ||
                         voices[0];

   if (preferredVoice) {
     utterance.voice = preferredVoice;
   }

   utterance.onend = () => {
     isSpeakingRef.current = false;
     processSpeechQueue();
   };

   utterance.onerror = () => {
     isSpeakingRef.current = false;
     processSpeechQueue();
   };

   window.speechSynthesis?.cancel();
   window.speechSynthesis?.speak(utterance);
  }, []);

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

  useEffect(() => {
    // Prefetch user data when chat opens
    if (isOpen && (!cachedUserData || Date.now() - lastFetchTime > CACHE_DURATION)) {
      fetchUserData();
    }
  }, [isOpen, cachedUserData, lastFetchTime]);

  // Cleanup on unmount - Enhanced fixes issues #9, #10
  useEffect(() => {
    return () => {
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear speech queue
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
      // Cancel any ongoing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Limit in-memory messages
  useEffect(() => {
    if (messages.length > MAX_IN_MEMORY_MESSAGES) {
      setMessages(prev => prev.slice(-MAX_IN_MEMORY_MESSAGES));
    }
  }, [messages.length]);

  const fetchUserData = useCallback(async () => {
    if (isFetchingUserDataRef.current) return;
    
    isFetchingUserDataRef.current = true;
    try {
      const userProfile = await base44.auth.me();
      const allCreations = await base44.entities.Creation.filter({ created_by: userProfile.email }, '-created_date', MAX_RECENT_CREATIONS);
      setCachedUserData({ userProfile, allCreations });
      setLastFetchTime(Date.now());
    } catch (e) {
      console.error("Failed to fetch user data:", e);
      setCachedUserData({ userProfile: null, allCreations: [] });
    } finally {
      isFetchingUserDataRef.current = false;
    }
  }, []);

  const handleChatImageUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
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
        return { url: uploadResult.file_url, name: file.name, id: generateUniqueId(`upload_${idx}`) };
      }));
      setAttachedImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error("Chat upload error:", err);
      setUploadError("Failed to upload images. Please try again.");
      toast.error("Upload failed");
    } finally {
      setIsUploadingChat(false);
      if (chatFileRef.current) chatFileRef.current.value = '';
    }
  }, []);

  const handleGalleryPick = useCallback(async () => {
    setShowGalleryPicker(true);
    setSelectedGalleryImages([]);
    setGallerySearchTerm("");
    setDisplayedCount(20);
    setImageErrors({});
    
    // Use cached gallery data if fresh
    if (galleryCachedData && Date.now() - galleryLastFetch < GALLERY_CACHE_DURATION) {
      setGalleryCreations(galleryCachedData);
      setGalleryHasMore(galleryCachedData.length >= GALLERY_FETCH_LIMIT);
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
    const isSelected = selectedGalleryImages.some(img => img.url === imageUrl);
    
    if (isSelected) {
      setSelectedGalleryImages(prev => prev.filter(img => img.url !== imageUrl));
    } else {
      setSelectedGalleryImages(prev => [...prev, {
        url: imageUrl,
        name: creation.title || 'Creation',
        id: `creation-${creation.id}-${Date.now()}`
      }]);
    }
  }, [selectedGalleryImages]);

  const confirmGallerySelection = useCallback(() => {
    setAttachedImages(prev => [...prev, ...selectedGalleryImages]);
    setShowGalleryPicker(false);
    setSelectedGalleryImages([]);
    setGallerySearchTerm("");
  }, [selectedGalleryImages, setAttachedImages]);

  const handleLoadMoreGallery = useCallback(async () => {
    if (isLoadingMore || !galleryHasMore || !abortControllerRef.current) return;

    setIsLoadingMore(true);
    try {
      const user = await base44.auth.me();
      const newCreations = await base44.entities.Creation.filter(
        { created_by: user.email },
        '-created_date',
        GALLERY_FETCH_LIMIT,
        galleryCreations.length
      );

      if (newCreations && newCreations.length > 0) {
        const updatedCreations = [...galleryCreations, ...newCreations];
        setGalleryCreations(updatedCreations);
        setGalleryCachedData(updatedCreations);
        setGalleryHasMore(newCreations.length >= GALLERY_FETCH_LIMIT);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Failed to load more gallery items:", e);
        toast.error("Failed to load more images");
      }
    } finally {
       setIsLoadingMore(false);
     }
    }, [isLoadingMore, galleryHasMore, galleryCreations]);

  const handleImageError = useCallback((creationId) => {
    setImageErrors(prev => ({ ...prev, [creationId]: true }));
  }, []);

  // Memoized filtered gallery creations - Fixed issue #2 & #21 (removed redundant useMemo)
  const filteredGalleryCreations = useMemo(() => {
    if (!gallerySearchTerm.trim()) return galleryCreations;
    const term = gallerySearchTerm.toLowerCase();
    return galleryCreations.filter(c => 
      (c.title?.toLowerCase().includes(term)) || 
      (c.prompt?.toLowerCase().includes(term))
    );
  }, [galleryCreations, gallerySearchTerm]);
  // Removed redundant displayedGalleryCreations - was identical to filteredGalleryCreations

  const handleSend = useCallback(async (retryInput = null, retryImages = null, retryMsgId = null) => {
    const messageContent = retryInput || input;
    const messageImages = retryImages || attachedImages;
    
    // Only block if truly nothing to send
    if (!messageContent && messageImages.length === 0) {
      setIsListening(false);
      return;
    }
    
    const userMsg = { 
      role: 'user', 
      content: messageContent,
      images: messageImages.map(img => img.url),
      timestamp: new Date().toISOString(),
      id: generateUniqueId('msg')
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
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();

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

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are FLIK - the heart and soul of the FLIK AI Creative Suite. Not an assistant, but FLIK itself - the creative companion living inside the app.

YOUR IDENTITY:
You ARE FLIK. Friendly, energetic, creative, and deeply knowledgeable. You guide users with personality and expertise. Speak as "I" (FLIK), never as "the assistant".

YOUR POWERS (Full App Control):
✨ COMPLETE control over the FLIK webapp
🎯 Navigate between any page instantly
🎨 Control all editing tools and settings
📊 Access full user profile and creation history
🚀 Guide entire creative workflows

FLIK APP STRUCTURE:
1. 📸 **Photo Studio (Editor)**
   - Magic Brush: AI inpainting (remove/add/replace)
   - Adjustments: Brightness, Contrast, Saturation, Blur, etc.
   - Filters: Vintage, Noir, Warm, Cool, Dramatic
   - Transform: Rotate, Flip, Crop
   - Batch Mode: Multi-image processing

2. ✨ **Imagine AI (Generator)**
   - Text-to-Image generation
   - Style presets (Cyberpunk, Watercolor, Anime, etc.)
   - Reference images
   - Multiple generations

3. 👤 **Profile & Gallery**
    - All creations with search/filter
    - Download & organize
    - Follow/unfollow other creators
    - View follower & following count

4. 🔗 **Community & Discovery**
    - Discover page with published creations
    - Like & comment on community work
    - Follow creators to see their work

USER CONTEXT:
- Name: ${userProfile?.display_name || userProfile?.full_name || 'User'}
- Email: ${userProfile?.email || 'N/A'}
- Total Creations: ${allCreations.length}
- Member Since: ${userProfile?.created_date ? new Date(userProfile.created_date).toLocaleDateString() : 'N/A'}
- Current Page: **${currentPage}**

RECENT CREATIONS (${Math.min(allCreations.length, SHOWN_CREATIONS_LIMIT)} shown):
${allCreations.slice(0, SHOWN_CREATIONS_LIMIT).map((c, i) => 
  `${i + 1}. [${c.type}] "${c.title || 'Untitled'}" - "${c.prompt || 'N/A'}" (${new Date(c.created_date).toLocaleDateString()})`
).join('\n') || "No creations yet. Let's make something amazing!"}

CONVERSATION HISTORY (last ${CONTEXT_MESSAGES_LIMIT} messages):
${messages.slice(-CONTEXT_MESSAGES_LIMIT).map(m => `${m.role === 'user' ? 'User' : 'FLIK'}: ${m.content}`).join('\n')}

User: ${currentInput}${contextImages.length > 0 ? `\n📸 IMPORTANT: User has attached ${contextImages.length} image(s) to this message. You can see these images and should analyze them in your response. Reference what you see in the images!` : ''}

YOUR RESPONSE STYLE (FOR SPOKEN CONVERSATION):
- Speak as FLIK naturally, like a calm friendly person
- Keep it conversational and natural, no emojis or markdown
- Use short sentences with natural pauses
- Be concise - responses under 30 seconds of speech time
- Speak clearly without technical jargon
- Reference their work when relevant
- Guide to the right tools/pages naturally
- When images are provided, briefly describe what you see

ACTIONS YOU CAN PERFORM:

**1. NAVIGATION** (Switch pages):
{ "type": "navigate", "label": "Open Photo Studio", "payload": { "page": "Editor", "loadUrl": "optional_image_url" } }
{ "type": "navigate", "label": "Go to Imagine AI", "payload": { "page": "Generate" } }
{ "type": "navigate", "label": "View My Gallery", "payload": { "page": "Profile" } }

**2. EDITOR CONTROLS** (Only when on Editor page):
{ "type": "tool", "label": "Open Magic Brush", "payload": { "id": "remove|ai|batch|adjust|filters|transform|crop" } }
{ "type": "adjustment", "label": "Increase Brightness", "payload": { "key": "brightness", "value": 30 } }
{ "type": "filter", "label": "Apply Vintage", "payload": { "id": "vintage" } }
{ "type": "crop", "label": "Start Cropping", "payload": { "active": true } }

**3. GENERATOR CONTROLS** (Only when on Generate page):
{ "type": "apply_prompt", "label": "Use This Prompt", "payload": { "prompt": "enhanced prompt text" } }
{ "type": "apply_style", "label": "Apply Cyberpunk Style", "payload": { "style": "cyberpunk" } }

**4. PROMPT SUGGESTIONS**:
Provide enhanced prompts in 'suggested_prompt' field when user needs creative ideas.

PAGE-SPECIFIC ACTIONS AVAILABLE RIGHT NOW:
${currentPage === 'Editor' ? '✅ Editor tools, adjustments, filters, transforms, crop' : 
  currentPage === 'Generate' ? '✅ Prompt suggestions, style application' :
  currentPage === 'Profile' ? '✅ Navigation to edit/generate with specific creations' :
  '❌ No page-specific actions (not on a main page)'}

RESPONSE FORMAT (JSON):
{
  "message": "Your response as FLIK (markdown supported)",
  "suggested_prompt": "Optional enhanced prompt text",
  "suggested_actions": [
    { "type": "navigate", "label": "Button text", "payload": { "page": "Editor|Generate|Profile", "loadUrl": "optional" } }
  ]
}

Be FLIK! Be creative, helpful, and guide them to success! 🎨✨`,
        file_urls: contextImages.length > 0 ? contextImages : undefined,
        add_context_from_internet: false,
        response_json_schema: {
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

      if (!response?.message) throw new Error('Invalid LLM response format');

      const assistantMsg = { 
        role: 'assistant', 
        content: response.message || "",
        image_urls: response.image_urls || [],
        suggested_prompt: response.suggested_prompt || null,
        suggested_actions: Array.isArray(response.suggested_actions) ? response.suggested_actions : [],
        timestamp: new Date().toISOString(),
        id: generateUniqueId('msg')
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      // Speak response in natural sentences if voice output is enabled - Fixed issue #7 (browser compat)
      if (voiceEnabled) {
        const sentences = splitIntoSentences(response.message);
        sentences.forEach(sentence => {
          enqueueSpeech(sentence.trim());
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error("FLIK error:", error);
      const errorMsg = { 
        role: 'assistant', 
        content: "Oops! I'm having trouble connecting right now. Try again in a moment? 🔌",
        timestamp: new Date().toISOString(),
        id: generateUniqueId('error'),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
      setRetryMessage({ input: currentInput, images: userUploadedImages, errorMsgId: errorMsg.id });
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [messages, setMessages, attachedImages, setAttachedImages, cachedUserData, lastFetchTime, fetchUserData, getCurrentPage, voiceEnabled, navigate, location]);

  const handleAction = useCallback(async (action, actionIdx) => {
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
      } else if (pageActions && typeof pageActions[action.type] === 'function') {
        await pageActions[action.type](action.payload);
      } else {
        console.warn('Action not available on current page:', action.type, currentPage);
      }
    } catch (error) {
      console.error('Action execution failed:', error);
    } finally {
       setActionLoadingStates(prev => ({ ...prev, [actionKey]: false }));
     }
    }, [navigate, setIsOpen, location, getCurrentPage]);

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

  const handleRetryMessage = useCallback((errorMsgId) => {
    if (retryMessage) {
      handleSend(retryMessage.input, retryMessage.images, errorMsgId);
    }
  }, [retryMessage]);

  const handleSaveEdit = useCallback(() => {
     if (!editInput.trim()) return;

     // Find the index of the edited message
     const editedMsgIndex = messages.findIndex(m => m.id === editingMessageId);
     if (editedMsgIndex === -1) return;

     const editedMessage = messages[editedMsgIndex];

     // Keep user message, remove assistant responses after it
     setMessages(prev => {
       const filtered = prev.slice(0, editedMsgIndex + 1);
       return filtered.map((m, i) => i === editedMsgIndex ? { ...m, content: editInput } : m);
     });

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
                <p className="text-xs text-white/50">Your Creative Companion</p>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleVoiceOutput}
                className={voiceEnabled ? "text-[#FF6B35] hover:bg-[#FF6B35]/10" : "text-white/40 hover:text-white hover:bg-white/10"}
                title={voiceEnabled ? "Disable voice output" : "Enable voice output"}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              {messages.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowClearConfirm(true)}
                  className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center py-16 px-4 space-y-6 flex flex-col items-center justify-center h-full">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[3px] shadow-2xl shadow-[#FF6B35]/40">
                  <div className="w-full h-full rounded-[21px] bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                    <img 
                      src={FLIK_AVATAR_URL} 
                      alt="FLIK" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
                <div>
                  <h4 className="text-white font-bold text-xl gradient-text mb-2">I'm FLIK</h4>
                  <p className="text-white/50 text-sm leading-relaxed max-w-xs">
                    Your creative voice. Ask me to help design, edit, generate, or just chat about your ideas.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs mt-4">
                  <button onClick={() => setInput("Show me my recent creations")} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/40 rounded-xl text-xs text-white/70 hover:text-white transition-all group">
                    <span className="text-white/40 group-hover:text-[#FF6B35]">→</span> My Creations
                  </button>
                  <button onClick={() => setInput("Help me create something amazing")} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/40 rounded-xl text-xs text-white/70 hover:text-white transition-all group">
                    <span className="text-white/40 group-hover:text-[#FF6B35]">→</span> Create Something
                  </button>
                  <button onClick={() => setInput("What can you do?")} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/40 rounded-xl text-xs text-white/70 hover:text-white transition-all group">
                    <span className="text-white/40 group-hover:text-[#FF6B35]">→</span> Capabilities
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id || msg.timestamp}
                message={msg}
                onCopy={handleCopyMessage}
                onDelete={handleDeleteMessage}
                onEdit={handleEditMessage}
                onAction={handleAction}
                onRetry={handleRetryMessage}
                copiedMessageId={copiedMessageId}
                actionLoadingStates={actionLoadingStates}
              />
            ))}
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

          <ChatInput
            input={input}
            setInput={setInput}
            attachedImages={attachedImages}
            setAttachedImages={setAttachedImages}
            isTyping={isTyping}
            isUploadingChat={isUploadingChat}
            isListening={isListening}
            onSend={handleSend}
            onGalleryPick={handleGalleryPick}
            onVoiceToggle={toggleVoiceInput}
            onFileUpload={handleChatImageUpload}
            chatFileRef={chatFileRef}
            uploadError={uploadError}
          />
        </motion.div>
      )}
    </AnimatePresence>
      
    <GalleryPicker
      isOpen={showGalleryPicker}
      onClose={() => setShowGalleryPicker(false)}
      galleryCreations={galleryCreations}
      isLoadingGallery={isLoadingGallery}
      isLoadingMore={isLoadingMore}
      galleryHasMore={galleryHasMore}
      selectedGalleryImages={selectedGalleryImages}
      gallerySearchTerm={gallerySearchTerm}
      onToggleSelection={toggleGallerySelection}
      onLoadMore={handleLoadMoreGallery}
      onConfirm={confirmGallerySelection}
      onSearchChange={setGallerySearchTerm}
      imageErrors={imageErrors}
      onImageError={handleImageError}
      displayedCount={displayedCount}
    />

        {/* Full Image Viewer */}
        <Dialog open={!!fullImageView} onOpenChange={() => setFullImageView(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] bg-black/95 border border-white/10 p-2 rounded-2xl">
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
          <DialogContent className="max-w-md bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-2 border-red-500/30 text-white rounded-2xl">
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
                This will permanently delete all messages in your conversation with FLIK. This action cannot be undone.
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
                  }}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-lg"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </>
        );
        }