import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User, Loader2, Image as ImageIcon, ExternalLink, Trash2, RefreshCw, Upload, Grid3x3, Play, SlidersHorizontal, Wand2, Layers, Crop, ArrowLeft, AlertCircle, Copy, Edit2, Check } from "lucide-react";
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
  const [fullImageView, setFullImageView] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [actionLoadingStates, setActionLoadingStates] = useState({});
  const scrollRef = useRef(null);
  const chatFileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const abortControllerRef = useRef(null);
  const isFetchingUserDataRef = useRef(false);

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
    
    // Use cached gallery data if fresh
    if (galleryCachedData && Date.now() - galleryLastFetch < GALLERY_CACHE_DURATION) {
      setGalleryCreations(galleryCachedData);
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
    } catch (e) {
      console.error("Failed to load gallery:", e);
      setGalleryCreations([]);
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
  };

  const handleSend = async (retryInput = null, retryImages = null, retryMsgId = null) => {
    const messageContent = retryInput || input;
    const messageImages = retryImages || attachedImages;
    
    if (!messageContent.trim() && messageImages.length === 0) return;
    
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

User: ${currentInput}

YOUR RESPONSE STYLE:
- Speak as FLIK (use "I", never "the assistant")
- Be enthusiastic and creative ✨
- Use emojis naturally but don't overdo it
- Keep responses concise but complete
- Reference their work when relevant
- Guide to the right tools/pages

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
    
    setMessages(prev => prev.map(m => 
      m.id === editingMessageId ? { ...m, content: editInput, edited: true } : m
    ));
    setEditingMessageId(null);
    setEditInput("");
  }, [editingMessageId, editInput, setMessages]);

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
          className="fixed inset-y-0 right-0 w-full md:w-[420px] bg-[#0a0a0a] border-l border-white/10 shadow-2xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a] to-[#1a1a1a] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#FFB800]/5" />
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
              {messages.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={clearHistory}
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

          <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[3px] mx-auto shadow-lg shadow-[#FF6B35]/30">
                  <div className="w-full h-full rounded-[21px] bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg" 
                      alt="FLIK" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg gradient-text mb-2">Hey! I'm FLIK ✨</h4>
                  <p className="text-white/60 text-sm max-w-xs mx-auto">
                    I'm here to help you create, edit, and explore. I can navigate the app, suggest ideas, and guide you through any creative journey!
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  <button onClick={() => setInput("Show me my recent creations")} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/80 transition-colors">
                    My Creations
                  </button>
                  <button onClick={() => setInput("Help me create something amazing")} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/80 transition-colors">
                    Create Something
                  </button>
                  <button onClick={() => setInput("What can you do?")} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/80 transition-colors">
                    What can you do?
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
                    <div className="flex gap-2 bg-white/10 p-3 rounded-2xl border border-white/20">
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
                        className="bg-black/20 border-white/10 text-white"
                        autoFocus
                      />
                      <Button size="icon" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                  <div
                    className={`p-3 rounded-2xl text-sm space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white rounded-tr-none shadow-lg'
                        : 'bg-white/10 text-white/90 rounded-tl-none backdrop-blur-sm border border-white/5'
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

          <div className="p-4 border-t border-white/10 bg-[#1a1a1a]">
            {uploadError && (
              <div className="mb-2 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {uploadError}
              </div>
            )}
            {attachedImages.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {attachedImages.map((img) => (
                  <div key={img.id} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
                    <img src={img.url} alt={img.name || 'Attached'} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setAttachedImages(prev => prev.filter(i => i.id !== img.id))} 
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      title="Remove image"
                    >
                      <X className="w-4 h-4 text-white" />
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
              className="flex gap-2"
            >
              <button
                type="button"
                onClick={() => chatFileRef.current?.click()}
                className={`p-2 rounded-lg transition-colors ${
                  isUploadingChat ? 'bg-white/10 cursor-wait' : 'hover:bg-white/10 text-white/60 hover:text-white'
                }`}
                disabled={isUploadingChat}
                title="Upload images"
              >
                {isUploadingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={handleGalleryPick}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Pick from gallery"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <input
                ref={chatFileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleChatImageUpload}
                className="hidden"
              />
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hey! What can I help you create? ✨"
                className="bg-black/20 border-white/10 text-white focus-visible:ring-[#FF6B35] placeholder:text-white/40"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={(!input.trim() && attachedImages.length === 0) || isTyping || isUploadingChat}
                className="bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white shadow-lg"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
      
    <Dialog open={showGalleryPicker} onOpenChange={setShowGalleryPicker}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] border border-white/10 text-white flex flex-col shadow-2xl">
        <DialogHeader className="pb-4 border-b border-white/5">
          <DialogTitle className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Grid3x3 className="w-6 h-6 text-[#FF6B35]" />
            Pick from Your Creations
          </DialogTitle>
          <p className="text-sm text-white/50 mt-1">Select images to add to your conversation</p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {isLoadingGallery ? (
            <>
              {Array.from({ length: 15 }).map((_, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-white/5 border-2 border-white/10 animate-pulse"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
                </div>
              ))}
            </>
          ) : galleryCreations.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <ImageIcon className="w-10 h-10 text-white/20" />
              </div>
              <p className="text-white/40 text-sm">No creations yet</p>
            </div>
          ) : (
            galleryCreations.map((creation) => {
              const imageUrl = creation.thumbnail_url || creation.url;
              const isSelected = selectedGalleryImages.some(img => img.url === imageUrl);

              return (
              <button
                key={creation.id}
                onClick={() => toggleGallerySelection(creation)}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 group hover:scale-105 bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 ${
                  isSelected 
                    ? 'border-[#FF6B35] shadow-[0_0_30px_rgba(255,107,53,0.5)]' 
                    : 'border-white/10 hover:border-[#FF6B35]/50'
                }`}
                aria-label={`${isSelected ? 'Remove' : 'Add'} ${creation.title || 'Untitled'}`}
              >
                <img 
                  src={imageUrl}
                  alt={creation.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-all duration-300 ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`} />
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/20 via-transparent to-[#FFB800]/20 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
                  isSelected 
                    ? 'bg-[#FF6B35] opacity-100 scale-100' 
                    : 'bg-white/10 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                }`}>
                  <Check className="w-3 h-3 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-xs text-white font-semibold truncate drop-shadow-lg">{creation.title || 'Untitled'}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">{new Date(creation.created_date).toLocaleDateString()}</p>
                </div>
                </button>
                )})
                )}
        </div>
        {selectedGalleryImages.length > 0 && (
          <div className="sticky bottom-0 p-4 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl flex items-center justify-between">
            <span className="text-white text-sm">
              {selectedGalleryImages.length} image{selectedGalleryImages.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedGalleryImages([])}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Clear
              </Button>
              <Button
                onClick={confirmGallerySelection}
                className="bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white"
              >
                Add to Chat
              </Button>
            </div>
          </div>
        )}
        </DialogContent>
        </Dialog>

        {/* Full Image Viewer */}
        <Dialog open={!!fullImageView} onOpenChange={() => setFullImageView(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] bg-black/95 border border-white/10 p-2">
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
        </>
        );
        }