import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Sparkles, Loader2, Image as ImageIcon, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { base44 } from "@/api/base44Client";
import ReactMarkdown from 'react-markdown';

import { Copy, ArrowLeft, Check, Play, SlidersHorizontal, Wand2, Layers, Crop } from "lucide-react";

export default function ChatPanel({ isOpen, onClose, messages, setMessages, onApplyPrompt, onAIAction, currentPrompt, currentStyle, currentImages }) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatImages, setChatImages] = useState([]);
  const [isUploadingChat, setIsUploadingChat] = useState(false);
  const scrollRef = useRef(null);
  const chatFileRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

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
      images: chatImages.map(img => img.url)
    };
    
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    const userUploadedImages = chatImages; // Images uploaded in chat
    
    setInput("");
    setChatImages([]);
    setIsTyping(true);

    try {
      // Fetch user profile and ALL creations for complete context
      let userProfile = null;
      let allCreations = [];
      try {
        userProfile = await base44.auth.me();
        allCreations = await base44.entities.Creation.filter({ created_by: userProfile.email }, '-created_date', 100);
      } catch (e) {
        console.warn("Failed to fetch user data for context", e);
      }

      // Combine editor context images (main image, refs) with chat uploaded images
      const contextImages = [
        ...(currentImages || []).map(img => img.url),
        ...userUploadedImages.map(img => img.url)
      ];

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are FLIK ASSISTANT, the intelligent companion for the FLIK AI Creative Suite.

        YOUR MISSION:
        Assist users in creating, editing, and transforming visuals using the FLIK webapp tools. You are an expert Visual Director and Technical Guide with FULL access to the user's profile and entire creation history.

        FLIK APP OVERVIEW (Know your tools):
        1. PHOTO STUDIO (Editor): 
           - Magic Brush: Advanced AI inpainting to Remove, Add, or Replace objects (context-aware).
           - Adjustments: Fine-tune Brightness, Contrast, Saturation, etc.
           - Filters: Apply artistic color grades (Vintage, Noir, etc.).
           - Crop & Transform: Resize, rotate, and flip images.
           - Batch Mode: Apply edits or AI transformations to multiple images at once.

        2. IMAGINE AI (Generator):
           - Text-to-Image: Generate images from scratch using prompts.
           - Style Selector: Apply presets like "Cyberpunk", "Watercolor", etc.

        3. PROFILE & GALLERY:
           - Complete access to ALL user creations and profile data
           - Full creation history with prompts and metadata

        USER PROFILE:
        - Name: ${userProfile?.display_name || userProfile?.full_name || 'User'}
        - Email: ${userProfile?.email || 'N/A'}
        - Total Creations: ${allCreations.length}
        - Member Since: ${userProfile?.created_date ? new Date(userProfile.created_date).toLocaleDateString() : 'N/A'}

        CONTEXT DATA:
        - Current Editor Prompt: "${currentPrompt || '(empty)'}"
        - Current Style: "${currentStyle || 'None'}"

        VISUAL CONTEXT (Attached Images):
        - Editor Images: ${(currentImages || []).length} (Main image being edited + Reference images).
        - Chat Images: ${userUploadedImages.length} (Uploaded just now).
        Total images sent to your vision model: ${contextImages.length}

        USER'S COMPLETE CREATION LIBRARY (${allCreations.length} total):
        ${allCreations.length > 0 ? allCreations.slice(0, 20).map((c, i) => `${i + 1}. [${c.type}] "${c.title || 'Untitled'}" - Prompt: "${c.prompt || 'N/A'}" (Created: ${new Date(c.created_date).toLocaleDateString()})`).join('\n') + (allCreations.length > 20 ? `\n... and ${allCreations.length - 20} more creations` : '') : "No creations found."}
        
        Current conversation history:
        ${messages.map(m => `${m.role}: ${m.content} ${m.images?.length ? `[${m.images.length} Images Attached]` : ''}`).join('\n')}
        
        User input: ${currentInput}

        INSTRUCTIONS:
        1. Analyze the user's request. USE THE VISUAL CONTEXT! If images are provided, refer to them explicitly (e.g., "The reference image you added has great lighting...").
        2. If the user refers to "my creations" or past work, use the Recent Creations list to answer.
        3. Provide helpful, creative, and concise advice. Guide them to specific FLIK tools.
        4. If the user asks to improve the prompt, generate ideas, or create something, provide a 'suggested_prompt' field.
        5. YOU CAN CONTROL THE EDITOR! If the user wants to adjust settings, switch tools, or apply filters, suggest actions in the 'suggested_actions' array.
        
        AVAILABLE ACTIONS:
        - Change Tool: { "type": "tool", "label": "Open Magic Brush", "payload": { "id": "remove" } } (ids: "ai", "batch", "adjust", "filters", "transform", "remove", "crop")
        - Adjust Image: { "type": "adjustment", "label": "Increase Brightness", "payload": { "key": "brightness", "value": 20 } } (value is -100 to 100 relative)
        - Apply Filter: { "type": "filter", "label": "Apply Vintage Filter", "payload": { "id": "vintage" } }
        - Crop Mode: { "type": "crop", "label": "Start Cropping", "payload": { "active": true } }

        6. Use Markdown for the 'message' field.

        Output JSON format: 
        { 
          "message": "...", 
          "suggested_prompt": "...",
          "suggested_actions": [
            { "label": "Action Name", "type": "tool|adjustment|filter|crop", "payload": object }
          ]
        }`,
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
                  type: { type: "string", enum: ["tool", "adjustment", "filter", "crop"] },
                  payload: { type: "object", additionalProperties: true }
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
        suggested_actions: response.suggested_actions 
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#141414] border-l border-white/10 shadow-2xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#FF6B35]" />
              <h3 className="font-semibold text-white">AI Assistant</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-[#FF6B35]" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={`p-3 rounded-2xl text-sm space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-[#FF6B35] text-white rounded-tr-none'
                        : 'bg-white/10 text-white/90 rounded-tl-none'
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
                    {msg.image && !msg.images && (
                      <div className="rounded-lg overflow-hidden mb-2 border border-white/20">
                        <img src={msg.image} alt="Uploaded" className="max-w-full h-auto" />
                      </div>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 last:[&>*]:mb-0">
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
                          <button
                            onClick={() => onApplyPrompt(msg.suggested_prompt)}
                            className="text-[10px] flex items-center gap-1 text-[#FF6B35] hover:text-[#FF8B55] transition-colors bg-[#FF6B35]/10 px-2 py-1 rounded-full border border-[#FF6B35]/20 w-fit"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            Use Prompt
                          </button>
                        </div>
                      )}
                      
                      {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                         <div className="flex flex-wrap gap-2">
                           {msg.suggested_actions.map((action, idx) => (
                             <button
                               key={idx}
                               onClick={() => onAIAction && onAIAction(action)}
                               className={`flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6B35]/50 text-white/90 text-[11px] px-3 py-1.5 rounded-lg transition-all group ${!onAIAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                               disabled={!onAIAction}
                             >
                               {action.type === 'tool' && <Wand2 className="w-3 h-3 text-[#FF6B35]" />}
                               {action.type === 'adjustment' && <SlidersHorizontal className="w-3 h-3 text-blue-400" />}
                               {action.type === 'filter' && <Layers className="w-3 h-3 text-purple-400" />}
                               {action.type === 'crop' && <Crop className="w-3 h-3 text-green-400" />}
                               <span>{action.label}</span>
                               <Play className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 group-hover:text-[#FF6B35]" />
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
                <div className="w-8 h-8 rounded-full bg-[#FF6B35]/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#FF6B35]" />
                </div>
                <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                placeholder="Ask me anything..."
                className="bg-black/20 border-white/10 text-white focus-visible:ring-[#FF6B35]"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={(!input.trim() && chatImages.length === 0) || isTyping || isUploadingChat}
                className="bg-[#FF6B35] hover:bg-[#FF8B55] text-white"
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