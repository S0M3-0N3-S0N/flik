import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, Loader2, Zap, Upload, X, Send, Bot, User, 
  Settings2, RectangleHorizontal, RectangleVertical, Square, Image as ImageIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import StyleSelector, { stylePresets } from "@/components/generate/StyleSelector";
import ImageUploader from "@/components/editor/ImageUploader";
import ReactMarkdown from 'react-markdown';

export default function Generate() {
  // Chat State
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hi! I'm FLIK's AI. Describe an image you want to create, or just chat with me!" 
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // Generation Settings State
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [aiModel, setAiModel] = useState("default");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [imageStrength, setImageStrength] = useState(0.5);
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Load image from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadUrl = params.get('load');
    if (loadUrl) {
      setUploadedImages([{ url: loadUrl, id: Date.now() }]);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I see you've loaded an image. How would you like me to modify it?" 
      }]);
    }
  }, []);

  const handleImageUpload = async (filesOrEvent) => {
    let validFiles = [];
    if (filesOrEvent.target) {
       validFiles = Array.from(filesOrEvent.target.files).filter(f => f.type.startsWith('image/'));
    } else if (Array.isArray(filesOrEvent)) {
       validFiles = filesOrEvent;
    } else if (filesOrEvent.file) {
       validFiles = [filesOrEvent.file];
    }

    if (validFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      const newUploads = await Promise.all(validFiles.map(async (file) => {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        return { url: uploadResult.file_url, file, id: Date.now() + Math.random() };
      }));
      setUploadedImages(prev => [...prev, ...newUploads]);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const generateImage = async (promptText, enhancedPrompt) => {
    try {
      const selectedStyleObjects = selectedStyles.map(id => stylePresets.find(s => s.id === id)).filter(Boolean);
      const styleInstruction = selectedStyleObjects.map(s => s.prompt).join(", ");
      
      let fullPrompt = selectedStyleObjects.length > 0
        ? `((${styleInstruction})), ${enhancedPrompt}, ${styleInstruction}, masterpiece, high quality, detailed`
        : `${enhancedPrompt}, masterpiece, high quality, detailed`;
      
      if (aspectRatio === "16:9") fullPrompt += ", wide cinematic shot, 16:9 aspect ratio";
      else if (aspectRatio === "9:16") fullPrompt += ", tall portrait shot, 9:16 aspect ratio";
      
      if (negativePrompt.trim()) {
        fullPrompt += ` --no ${negativePrompt.trim()}`;
      }

      const imageResult = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt,
        existing_image_urls: uploadedImages.length > 0 ? uploadedImages.map(u => u.url) : undefined
      });

      // Save to DB
      await base44.entities.Creation.create({
        title: promptText.slice(0, 100) || 'AI Generated Image',
        type: 'image',
        url: imageResult.url,
        thumbnail_url: imageResult.url,
        prompt: promptText,
        metadata: { 
          style: selectedStyles, 
          model: aiModel, 
          enhancedPrompt: enhancedPrompt, 
          aspectRatio,
          negativePrompt
        }
      });

      return imageResult.url;
    } catch (e) {
      console.error("Generation failed:", e);
      throw e;
    }
  };

  const handleSend = async () => {
    if (!input.trim() && uploadedImages.length === 0) return;

    const userMsg = { 
      role: 'user', 
      content: input,
      images: uploadedImages.map(img => img.url)
    };
    
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    const currentUploads = uploadedImages;
    
    setInput("");
    setUploadedImages([]); // Clear uploads after sending
    setIsTyping(true);

    try {
      // Analyze intent and enhance prompt
      const styleLabels = selectedStyles.map(id => stylePresets.find(s => s.id === id)?.label).join(", ");
      
      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are FLIK AI, an expert visual assistant.
        
        USER REQUEST: "${currentInput}"
        ATTACHED IMAGES: ${currentUploads.length}
        ACTIVE STYLES: ${styleLabels || "None"}
        
        TASK:
        Determine if the user wants to GENERATE an image or just CHAT.
        
        1. If GENERATE (e.g., "draw a cat", "make it cyberpunk", or if images attached without question):
           - Create a highly detailed, professional Enhanced Prompt for image generation.
           - Return JSON: { "type": "generate", "enhanced_prompt": "..." }
           
        2. If CHAT (e.g., "how are you", "what is this app", "help"):
           - Answer helpfuly.
           - Return JSON: { "type": "chat", "response": "..." }

        3. If AMBIGUOUS but likely visual:
           - Assume GENERATE.
           
        JSON SCHEMA ONLY.`,
        file_urls: currentUploads.map(u => u.url),
        response_json_schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["generate", "chat"] },
            enhanced_prompt: { type: "string" },
            response: { type: "string" }
          },
          required: ["type"]
        }
      });

      if (llmResponse.type === 'generate') {
        // Inform user we are generating
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Creating that for you... \n\n*Prompt: ${llmResponse.enhanced_prompt}*` 
        }]);
        
        const imageUrl = await generateImage(currentInput, llmResponse.enhanced_prompt);
        
        // Add image message
        setMessages(prev => {
          const newMsgs = [...prev];
          // Remove the "Creating..." message or update it? Let's just append result.
          // Or strictly speaking, we can update the last message to include the image.
          // But appending is safer for state.
          newMsgs.push({
            role: 'assistant',
            content: "Here is your image:",
            image: imageUrl,
            actions: ['download', 'edit']
          });
          return newMsgs;
        });
      } else {
        // Chat response
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: llmResponse.response 
        }]);
      }

    } catch (err) {
      console.error("Error:", err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDownload = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `flik_generated_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col bg-[#0A0A0A]">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex gap-3 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-[#FF6B35]" />
              </div>
            )}
            
            <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[#FF6B35] text-white rounded-tr-none' 
                    : 'bg-white/10 text-white/90 rounded-tl-none'
                }`}
              >
                {/* User uploaded images in chat bubble */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {msg.images.map((img, idx) => (
                      <img key={idx} src={img} alt="User upload" className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                    ))}
                  </div>
                )}
                
                <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* Generated Image Result */}
              {msg.image && (
                <div className="relative group rounded-2xl overflow-hidden border border-white/10 max-w-md shadow-2xl">
                  <img src={msg.image} alt="Generated" className="w-full h-auto" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button 
                      size="sm" 
                      onClick={() => handleDownload(msg.image)}
                      className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/10"
                    >
                      <Upload className="w-4 h-4 mr-2 rotate-180" /> Download
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => navigate(`/Editor?load=${encodeURIComponent(msg.image)}`)}
                      className="bg-[#FF6B35] hover:bg-[#FF8B55] text-white border border-white/10"
                    >
                      <Wand2 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  </div>
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
           <div className="flex gap-3 max-w-3xl mx-auto">
             <div className="w-8 h-8 rounded-full bg-[#FF6B35]/20 flex items-center justify-center">
               <Bot className="w-4 h-4 text-[#FF6B35]" />
             </div>
             <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5 h-12">
               <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
               <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
               <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
             </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Upload Preview */}
          {uploadedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-2">
              {uploadedImages.map((img) => (
                <div key={img.id} className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 group">
                  <img src={img.url} alt="Upload" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadedImages(prev => prev.filter(i => i.id !== img.id))}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
             <Popover>
              <PopoverTrigger asChild>
                <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedStyles.length > 0 
                    ? 'bg-[#FF6B35]/10 border-[#FF6B35]/30 text-[#FF6B35]' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}>
                  <Wand2 className="w-3.5 h-3.5" />
                  {selectedStyles.length > 0 ? `${selectedStyles.length} Styles` : 'Styles'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-[#141414] border-white/10" side="top" align="start">
                <StyleSelector 
                  selectedStyles={selectedStyles} 
                  onSelect={setSelectedStyles} 
                  onClear={() => setSelectedStyles([])} 
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  aspectRatio !== "1:1" 
                    ? 'bg-[#FF6B35]/10 border-[#FF6B35]/30 text-[#FF6B35]' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}>
                  <Settings2 className="w-3.5 h-3.5" />
                  Settings
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 bg-[#141414] border-white/10" side="top" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-white/50 uppercase">Aspect Ratio</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "1:1", icon: Square, label: "Square" },
                        { id: "16:9", icon: RectangleHorizontal, label: "Wide" },
                        { id: "9:16", icon: RectangleVertical, label: "Tall" }
                      ].map((ratio) => (
                        <button
                          key={ratio.id}
                          onClick={() => setAspectRatio(ratio.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                            aspectRatio === ratio.id 
                              ? 'bg-[#FF6B35]/10 border-[#FF6B35] text-[#FF6B35]' 
                              : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'
                          }`}
                        >
                          <ratio.icon className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">{ratio.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-white/50 uppercase">Negative Prompt</Label>
                    <Input 
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="e.g. blurry, ugly..."
                      className="h-8 text-xs bg-black/20 border-white/10"
                    />
                  </div>
                  {uploadedImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/50">Image Strength</span>
                        <span className="text-white">{Math.round(imageStrength * 100)}%</span>
                      </div>
                      <Slider 
                        value={[imageStrength]} 
                        min={0.1} max={0.9} step={0.1} 
                        onValueChange={(v) => setImageStrength(v[0])}
                        className="[&_.relative]:bg-white/10 [&_.absolute]:bg-[#FF6B35]"
                      />
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-white/10 bg-white/5 text-xs text-white/60 hover:text-white px-3">
                <Zap className={`w-3.5 h-3.5 ${aiModel === 'gemini' ? 'text-[#FF6B35]' : ''}`} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Standard Model</SelectItem>
                <SelectItem value="gemini">Gemini Enhanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Input */}
          <div className="relative flex items-end gap-2 bg-[#141414] border border-white/10 rounded-2xl p-2 focus-within:border-[#FF6B35]/50 transition-colors">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              title="Upload Image"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
            </button>
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe what you want to create..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/30 resize-none py-2 max-h-32 min-h-[44px]"
              rows={1}
              style={{ height: 'auto', minHeight: '44px' }}
            />
            
            <Button
              size="icon"
              onClick={handleSend}
              disabled={(!input.trim() && uploadedImages.length === 0) || isTyping}
              className="mb-0.5 rounded-xl bg-[#FF6B35] hover:bg-[#FF8B55] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}