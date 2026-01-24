import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User, Loader2, Image as ImageIcon, ExternalLink, Trash2, RefreshCw, Upload, Grid3x3, Play, SlidersHorizontal, Wand2, Layers, Crop, ArrowLeft, AlertCircle, Copy, Edit2, Check, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from 'react-markdown';
import { useFlik } from "./FlikContext";
import { getFlikActions } from "./useFlikActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from 'date-fns';

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

  // Initialize speech recognition
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
            // Auto-send after a short delay
            setTimeout(() => {
              setInput(finalInput);
            }, 100);
          }
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Voice recognition failed');
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current?.start();
      
      // Auto-send after user stops speaking (3 second silence)
      const timeoutId = setTimeout(() => {
        if (isListening && input.trim().length > 0) {
          recognitionRef.current?.stop();
        }
      }, 3000);
      
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

  const enqueueSpeech = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    speechQueueRef.current.push(text);
    processSpeechQueue();
  };

  const processSpeechQueue = () => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;
    
    isSpeakingRef.current = true;
    const text = speechQueueRef.current.shift();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    utterance.pitch = 1.4;
    utterance.volume = 1;
    
    // Get best available voice
    const voices = window.speechSynthesis.getVoices();
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
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
    } catch (err) {
      console.error("Chat upload error:", err);
      setUploadError("Failed to upload images. Please try again.");
    } finally {
      setIsUploadingChat(false);
      if (chatFileRef.current) chatFileRef.current.value = '';
    }
  };

  const handleGalleryPick = async () => {
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
  };

  const toggleGallerySelection = (creation) => {
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
  };

  const confirmGallerySelection = () => {
    setAttachedImages(prev => [...prev, ...selectedGalleryImages]);
    setShowGalleryPicker(false);
    setSelectedGalleryImages([]);
    setGallerySearchTerm("");
  };

  const handleLoadMoreGallery = async () => {
    if (isLoadingMore || !galleryHasMore) return;
    
    setIsLoadingMore(true);
    try {
      const user = await base44.auth.me();
      const newCreations = await base44.entities.Creation.filter(
        { created_by: user.email },
        '-created_date',
        GALLERY_FETCH_LIMIT,
        galleryCreations.length
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

  // Memoized filtered and sliced gallery creations
  const filteredGalleryCreations = useMemo(() => {
    if (!gallerySearchTerm.trim()) return galleryCreations;
    const term = gallerySearchTerm.toLowerCase();
    return galleryCreations.filter(c => 
      (c.title?.toLowerCase().includes(term)) || 
      (c.prompt?.toLowerCase().includes(term))
    );
  }, [galleryCreations, gallerySearchTerm]);

  const displayedGalleryCreations = useMemo(() => {
    return filteredGalleryCreations;
  }, [filteredGalleryCreations]);

  const handleSend = async (retryInput = null, retryImages = null, retryMsgId = null) => {
    const messageContent = retryInput || input;
    const messageImages = retryImages || attachedImages;
    
    if (!messageContent.trim() && messageImages.length === 0) {
      setIsListening(false);
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
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error("FLIK error:", error);
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
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg" 
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
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg" 
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
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg" 
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
                    className={`px-4 py-3 rounded-2xl text-sm space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white rounded-tr-none shadow-lg'
                        : 'bg-white/8 text-white/90 rounded-tl-none backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors'
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
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
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
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg" 
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

          <AnimatePresence>
            {!isListening && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-4 border-t border-white/10 bg-[#1a1a1a] space-y-3"
              >
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
                  className="flex items-center gap-2"
                >
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  isListening 
                    ? 'bg-red-500/30 text-red-400 animate-pulse scale-110' 
                    : 'hover:bg-white/10 text-white/60 hover:text-white'
                }`}
                title={isListening ? "Stop listening" : "Start voice"}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What's on your mind?"
                className="bg-black/20 border-white/10 text-white focus-visible:ring-[#FF6B35] placeholder:text-white/40 flex-1"
              />

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleGalleryPick}
                  className="p-2.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0"
                  title="Pick from gallery"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={(!input.trim() && attachedImages.length === 0) || isTyping || isUploadingChat}
                  className="bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white shadow-lg rounded-xl h-10 w-10 p-0"
                >
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>

              <input
                ref={chatFileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleChatImageUpload}
                className="hidden"
              />
                </form>
              </motion.div>
            )}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 border-t border-white/10 bg-gradient-to-t from-[#FF6B35]/10 to-[#1a1a1a] flex flex-col items-center justify-center space-y-4"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white/70 text-sm font-medium">Listening...</span>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>
                <p className="text-white/50 text-xs text-center">Speak naturally. I'll respond when you're done.</p>
                <Button
                  onClick={() => {
                    recognitionRef.current?.stop();
                    setIsListening(false);
                  }}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-0 h-9 text-xs mt-2"
                >
                  Stop Listening
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </motion.div>
      )}
    </AnimatePresence>
      
    <Dialog open={showGalleryPicker} onOpenChange={setShowGalleryPicker}>
      <DialogContent className="max-w-7xl w-[96vw] h-[92vh] bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border-2 border-white/10 text-white flex flex-col shadow-2xl p-0 rounded-3xl overflow-hidden">
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
          ) : displayedGalleryCreations.length === 0 ? (
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
              {displayedGalleryCreations.map((creation) => {
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
                variant="outline"
                onClick={() => setSelectedGalleryImages([])}
                className="flex-1 sm:flex-none border-white/20 text-white hover:bg-white/10 hover:border-white/40 text-sm px-6 py-2.5 rounded-xl transition-all"
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
                  className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-xl"
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