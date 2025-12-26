import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from 'react-markdown';
import { useAssistant } from "@/components/context/AssistantContext";

import { ArrowLeft, Wand2 } from "lucide-react";

export default function ChatPanel() {
  const { isOpen, closeAssistant, activeContext } = useAssistant();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm FLIK, your unified creative assistant. I'm here to help you in the Studio, Generator, or Gallery. How can I assist you today?" }
  ]);

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
    const userUploadedImages = chatImages; 
    
    setInput("");
    setChatImages([]);
    setIsTyping(true);

    try {
      let recentCreations = [];
      try {
        recentCreations = await base44.entities.Creation.list('-created_date', 5);
      } catch (e) {
        console.warn("Failed to fetch creations", e);
      }

      // Gather Context from Active Page
      const { page, data = {}, actionHandler } = activeContext;
      
      const contextImages = [
        ...(data.currentImages || []), // From page context
        ...userUploadedImages.map(img => img.url)
      ];

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are FLIK ASSISTANT, the intelligent companion for the FLIK AI Creative Suite.
        
        CURRENT LOCATION: User is currently on the "${page ? page.toUpperCase() : 'UNKNOWN'}" page.
        
        PAGE CONTEXT:
        ${JSON.stringify(data, null, 2)}
        
        YOUR MISSION:
        Assist users seamlessly across the app. You persist as they navigate.
        - If on EDITOR: Help with brushes, adjustments, filters.
        - If on GENERATE: Help with prompts, styles.
        - If on GALLERY: Help find or manage creations.

        USER INPUT: ${currentInput}
        
        RECENT CREATIONS:
        ${recentCreations.map(c => `- ${c.title} (${c.type})`).join('\n')}

        INSTRUCTIONS:
        1. tailored advice based on CURRENT LOCATION.
        2. Suggest actions if applicable (only if on Editor/Generate).
        3. Be concise and friendly.

        Available Actions (Only valid if on Editor):
        - tool, adjustment, filter, crop
        
        Output JSON: { "message": "...", "suggested_prompt": "...", "suggested_actions": [] }`,
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
                  type: { type: "string" },
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
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const executeAction = (action) => {
    if (activeContext.actionHandler) {
      activeContext.actionHandler(action);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: "I can't perform that action on this page." }]);
    }
  };

  const applyPrompt = (text) => {
    if (activeContext.data.onApplyPrompt) {
        activeContext.data.onApplyPrompt(text);
    } else {
        // Fallback: Copy to clipboard?
        navigator.clipboard.writeText(text);
        setMessages(prev => [...prev, { role: 'assistant', content: "I copied the prompt to your clipboard since I can't apply it directly here." }]);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#141414] border-l border-white/10 shadow-2xl z-[60] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#FF6B35]" />
              <h3 className="font-semibold text-white">FLIK Assistant</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={closeAssistant} className="text-white/60 hover:text-white">
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
                    {msg.images && (
                         <div className="flex gap-1 mb-2">
                            {msg.images.map((url, idx) => <img key={idx} src={url} className="w-12 h-12 rounded object-cover" />)}
                         </div>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="flex flex-col gap-2 mt-2">
                      {msg.suggested_prompt && (
                        <button
                          onClick={() => applyPrompt(msg.suggested_prompt)}
                          className="text-[10px] flex items-center gap-1 text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-1 rounded-full border border-[#FF6B35]/20 w-fit hover:bg-[#FF6B35]/20"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Use Prompt: "{msg.suggested_prompt.slice(0, 20)}..."
                        </button>
                      )}
                      
                      {msg.suggested_actions && (
                         <div className="flex flex-wrap gap-2">
                           {msg.suggested_actions.map((action, idx) => (
                             <button
                               key={idx}
                               onClick={() => executeAction(action)}
                               className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-[11px] px-3 py-1.5 rounded-lg transition-all"
                             >
                               <Wand2 className="w-3 h-3 text-[#FF6B35]" />
                               <span>{action.label}</span>
                             </button>
                           ))}
                         </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
                <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-[#FF6B35]/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-[#FF6B35]" />
                     </div>
                     <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none">
                        <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                     </div>
                </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-[#1a1a1a]">
             {chatImages.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {chatImages.map((img) => (
                      <div key={img.id} className="relative w-12 h-12 rounded overflow-hidden">
                        <img src={img.url} className="w-full h-full object-cover" />
                        <button onClick={() => setChatImages(prev => prev.filter(i => i.id !== img.id))} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100"><X className="w-3 h-3 text-white" /></button>
                      </div>
                    ))}
                  </div>
             )}
             <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <button type="button" onClick={() => chatFileRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">
                    {isUploadingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </button>
                <input ref={chatFileRef} type="file" accept="image/*" multiple onChange={handleChatImageUpload} className="hidden" />
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask FLIK..." className="bg-black/20 border-white/10 text-white" />
                <Button type="submit" size="icon" className="bg-[#FF6B35] text-white"><Send className="w-4 h-4" /></Button>
             </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}