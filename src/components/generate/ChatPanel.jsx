import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Sparkles, Loader2, Image as ImageIcon, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from 'react-markdown';

import { Copy, ArrowLeftCircle, Check } from "lucide-react";

export default function ChatPanel({ isOpen, onClose, messages, setMessages, onApplyPrompt, currentPrompt, currentStyle, currentImages }) {
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
    const currentImages = chatImages;
    
    setInput("");
    setChatImages([]);
    setIsTyping(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a creative AI art assistant named FLIK. The user is talking to you about image generation.
        
        CONTEXT:
        - Current Prompt in Editor: "${currentPrompt || '(empty)'}"
        - Current Style Selected: "${currentStyle || 'None'}"
        - Context Images (Main Editor): ${currentImages?.length || 0} images attached.
        
        Current conversation history:
        ${messages.map(m => `${m.role}: ${m.content} ${m.images?.length ? `[${m.images.length} Images Attached]` : ''}`).join('\n')}
        
        User input: ${currentInput}
        ${currentImages.length > 0 ? `User also uploaded ${currentImages.length} image(s) within chat for analysis/reference.` : ''}

        INSTRUCTIONS:
        1. Analyze the user's request, the current prompt context, and any images.
        2. Provide helpful, creative, and concise advice or answers.
        3. If the user asks to improve the prompt, generate ideas, or create something, provide a 'suggested_prompt' field in the JSON response.
        4. If the user asks for general info, just answer in 'message'.
        5. Use Markdown for the 'message' field (bold, lists, etc.).

        Output JSON format: { "message": "your helpful response...", "suggested_prompt": "optional optimized prompt string if relevant" }`,
        file_urls: currentImages.length > 0 ? currentImages.map(img => img.url) : undefined,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            suggested_prompt: { type: "string" }
          },
          required: ["message"]
        }
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.message, 
        suggested_prompt: response.suggested_prompt 
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

          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
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
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="flex gap-2 px-1">
                      <button
                        onClick={() => onApplyPrompt(msg.content)}
                        className="text-[10px] flex items-center gap-1 text-[#FF6B35] hover:text-[#FF8B55] transition-colors bg-[#FF6B35]/10 px-2 py-1 rounded-full border border-[#FF6B35]/20"
                      >
                        <ArrowLeftCircle className="w-3 h-3" />
                        Apply to Prompt
                      </button>
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