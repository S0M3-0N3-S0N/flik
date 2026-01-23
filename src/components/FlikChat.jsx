import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User, Loader2, Image as ImageIcon, ExternalLink, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from 'react-markdown';
import { Play, SlidersHorizontal, Wand2, Layers, Crop, ArrowLeft } from "lucide-react";
import { useFlik } from "./FlikContext";

export default function FlikChat() {
  const { isOpen, setIsOpen, messages, setMessages, clearHistory } = useFlik();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatImages, setChatImages] = useState([]);
  const [isUploadingChat, setIsUploadingChat] = useState(false);
  const scrollRef = useRef(null);
  const chatFileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('Editor') || path.includes('editor')) return 'Editor';
    if (path.includes('Generate') || path.includes('generate')) return 'Generate';
    if (path.includes('Profile') || path.includes('profile')) return 'Profile';
    return 'Unknown';
  };

  const handleChatImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setIsUploadingChat(true);
    try {
      const newImages = await Promise.all(validFiles.map(async (file) => {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        return { url: uploadResult.file_url, file, id: Date.now() + Math.random() };
      }));
      setChatImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error("Chat upload error:", err);
    } finally {
      setIsUploadingChat(false);
      if (chatFileRef.current) chatFileRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && chatImages.length === 0) return;
    
    const userMsg = { 
      role: 'user', 
      content: input,
      images: chatImages.map(img => img.url),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    const userUploadedImages = chatImages;
    
    setInput("");
    setChatImages([]);
    setIsTyping(true);

    try {
      let userProfile = null;
      let allCreations = [];
      try {
        userProfile = await base44.auth.me();
        allCreations = await base44.entities.Creation.filter({ created_by: userProfile.email }, '-created_date', 50);
      } catch (e) {
        console.warn("Failed to fetch user data", e);
      }

      const contextImages = userUploadedImages.map(img => img.url);
      const currentPage = getCurrentPage();

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

RECENT CREATIONS (${Math.min(allCreations.length, 15)} shown):
${allCreations.slice(0, 15).map((c, i) => 
  `${i + 1}. [${c.type}] "${c.title || 'Untitled'}" - "${c.prompt || 'N/A'}" (${new Date(c.created_date).toLocaleDateString()})`
).join('\n') || "No creations yet. Let's make something amazing!"}

CONVERSATION HISTORY:
${messages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'FLIK'}: ${m.content}`).join('\n')}

User: ${currentInput}

YOUR RESPONSE STYLE:
- Speak as FLIK (use "I", never "the assistant")
- Be enthusiastic and creative ✨
- Use emojis naturally but don't overdo it
- Keep responses concise but complete
- Reference their work when relevant
- Guide to the right tools/pages

ACTIONS YOU CAN PERFORM:

**NAVIGATION** (Switch pages):
{ "type": "navigate", "label": "Open Photo Studio", "payload": { "page": "Editor", "loadUrl": "optional_image_url" } }
{ "type": "navigate", "label": "Go to Imagine AI", "payload": { "page": "Generate" } }
{ "type": "navigate", "label": "View My Gallery", "payload": { "page": "Profile" } }

**PROMPT SUGGESTIONS**:
When user needs creative ideas, provide enhanced prompts in the 'suggested_prompt' field.

NAVIGATION EXAMPLES:
- "Let me open Photo Studio for you" → { navigate to Editor }
- "I'll take you to the Generator" → { navigate to Generate }
- "Let's check your gallery" → { navigate to Profile }
- "I'll open that image in the editor" → { navigate to Editor with loadUrl }

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
            suggested_prompt: { type: "string" },
            suggested_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  type: { type: "string", enum: ["navigate"] },
                  payload: { 
                    type: "object",
                    properties: {
                      page: { type: "string" },
                      loadUrl: { type: "string" }
                    },
                    required: ["page"]
                  }
                },
                required: ["label", "type", "payload"]
              }
            }
          },
          required: ["message"]
        }
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.message, 
        suggested_prompt: response.suggested_prompt,
        suggested_actions: response.suggested_actions,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error("FLIK error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Oops! I'm having trouble connecting right now. Try again in a moment? 🔌",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = (action) => {
    if (action.type === 'navigate') {
      let url = createPageUrl(action.payload.page);
      if (action.payload.loadUrl) {
        url += '?load=' + encodeURIComponent(action.payload.loadUrl);
      }
      navigate(url);
      setIsOpen(false);
    }
  };

  return (
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

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                  <div
                    className={`p-3 rounded-2xl text-sm space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white rounded-tr-none shadow-lg'
                        : 'bg-white/10 text-white/90 rounded-tl-none backdrop-blur-sm border border-white/5'
                    }`}
                  >
                    {msg.images && msg.images.length > 0 && (
                      <div className={`grid gap-2 mb-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {msg.images.map((imgUrl, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden border border-white/20 aspect-square">
                            <img src={imgUrl} alt="Uploaded" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 last:[&>*]:mb-0 [&>p]:leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="flex flex-col gap-2 mt-2">
                      {msg.suggested_prompt && (
                        <div className="flex flex-col gap-1">
                          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-xs text-white/60 italic border-l-2 border-l-[#FF6B35]">
                            "{msg.suggested_prompt}"
                          </div>
                        </div>
                      )}
                      
                      {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                         <div className="flex flex-wrap gap-2">
                           {msg.suggested_actions.map((action, idx) => (
                             <button
                               key={idx}
                               onClick={() => handleAction(action)}
                               className="flex items-center gap-2 bg-gradient-to-r from-white/5 to-white/10 hover:from-[#FF6B35]/20 hover:to-[#FFB800]/20 border border-white/10 hover:border-[#FF6B35]/50 text-white/90 text-[11px] px-3 py-1.5 rounded-lg transition-all group shadow-sm hover:shadow-md"
                             >
                               <ExternalLink className="w-3 h-3 text-[#FF6B35]" />
                               <span>{action.label}</span>
                               <Play className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 group-hover:text-[#FF6B35] transition-all" />
                             </button>
                           ))}
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
            ))}
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
            {chatImages.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {chatImages.map((img) => (
                  <div key={img.id} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
                    <img src={img.url} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setChatImages(prev => prev.filter(i => i.id !== img.id))} 
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
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
                handleSend();
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
              >
                {isUploadingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
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
                disabled={(!input.trim() && chatImages.length === 0) || isTyping || isUploadingChat}
                className="bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white shadow-lg"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}