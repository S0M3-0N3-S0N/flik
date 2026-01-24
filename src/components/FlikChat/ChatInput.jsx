import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Grid3x3, Mic } from "lucide-react";
import { motion } from "framer-motion";

const ChatInput = React.memo(function ChatInput({
  input,
  setInput,
  attachedImages,
  setAttachedImages,
  isTyping,
  isUploadingChat,
  isListening,
  onSend,
  onGalleryPick,
  onVoiceToggle,
  onFileUpload,
  chatFileRef,
  uploadError
}) {
  const handleRemoveImage = useCallback((id) => {
    setAttachedImages(prev => prev.filter(i => i.id !== id));
  }, [setAttachedImages]);

  return (
    <div className="p-4 border-t border-white/10 bg-[#1a1a1a] space-y-3">
      {uploadError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {uploadError}
        </div>
      )}
      
      {attachedImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {attachedImages.map((img) => (
            <div key={img.id} className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-white/10 group">
              <img src={img.url} alt={img.name || 'Attached'} className="w-full h-full object-cover" />
              <button 
                onClick={() => handleRemoveImage(img.id)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                title="Remove image"
              >
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isTyping && !isUploadingChat) {
            onSend();
          }
        }}
        className="flex items-center gap-2"
      >
        <motion.button
          type="button"
          onClick={onVoiceToggle}
          className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
            isListening 
              ? 'bg-red-500/30 text-red-400 animate-pulse scale-110' 
              : 'hover:bg-white/10 text-white/60 hover:text-white'
          }`}
          title={isListening ? "Stop listening" : "Start voice"}
          whileTap={{ scale: 0.95 }}
        >
          <Mic className="w-5 h-5" />
        </motion.button>

        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What's on your mind?"
          className="bg-black/20 border-white/10 text-white focus-visible:ring-[#FF6B35] placeholder:text-white/40 flex-1"
          disabled={isTyping}
        />

        <div className="flex gap-1">
          <button
            type="button"
            onClick={onGalleryPick}
            className="p-2.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0"
            title="Pick from gallery"
            disabled={isTyping}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <Button 
            type="submit" 
            size="icon"
            disabled={isTyping || isUploadingChat}
            className="bg-gradient-to-r from-[#FF6B35] to-[#F72C25] hover:from-[#FF8B55] hover:to-[#FF4C45] text-white shadow-lg rounded-xl h-10 w-10 p-0"
          >
            {isTyping ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <input
          ref={chatFileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFileUpload}
          className="hidden"
        />
      </form>
    </div>
  );
});

export default ChatInput;