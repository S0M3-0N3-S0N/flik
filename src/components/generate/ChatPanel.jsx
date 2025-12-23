import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { base44 } from "@/api/base44Client";

export default function ChatPanel({ isOpen, onClose, onGenerateTrigger }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your creative assistant. I can help you refine your prompts or brainstorm ideas. What would you like to create today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a creative AI art assistant. The user is talking to you about image generation.
        
        Current conversation history:
        ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
        User: ${input}

        If the user is explicitly asking to generate an image (e.g., "generate a cat", "create an image of...", "I want to see..."), 
        you can suggest a prompt but also explain you can help refine it. 
        
        If the user asks a question, answer it.
        Be helpful, creative, and concise.`,
        response_json_schema: null
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
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
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#FF6B35] text-white rounded-tr-none'
                      : 'bg-white/10 text-white/90 rounded-tl-none'
                  }`}
                >
                  {msg.content}
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="bg-black/20 border-white/10 text-white focus-visible:ring-[#FF6B35]"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isTyping}
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