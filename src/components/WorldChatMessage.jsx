import React, { useState } from "react";
import { X, MessageCircle, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "✨", "🎉"];

export default function WorldChatMessage({
  message,
  reactions,
  userEmail,
  onReact,
  onReply,
  onDelete,
  parentMessage,
  isDeletable,
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userReactions, setUserReactions] = useState(new Set());

  const groupedReactions = reactions.reduce((acc, r) => {
    if (r.message_id === message.id) {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    }
    return acc;
  }, {});

  const handleReaction = (emoji) => {
    if (!userEmail) {
      toast.error("You must be logged in to react");
      return;
    }
    onReact(message.id, emoji, userEmail);
    setShowEmojiPicker(false);
  };

  const handleReply = () => {
    onReply(message);
  };

  return (
    <div className="mb-3 sm:mb-4 break-inside-avoid">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors group cursor-default"
      >
        {/* Parent message preview if this is a reply */}
        {parentMessage && (
          <div className="mb-3 pb-3 border-b border-white/10 pl-3 border-l-2 border-l-[#FF6B35]/50">
            <p className="text-xs text-white/60 mb-1">Replying to {parentMessage.sender_name}</p>
            <p className="text-xs text-white/70 line-clamp-2">{parentMessage.content}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          {message.sender_profile_picture ? (
            <img
              src={message.sender_profile_picture}
              alt={message.sender_name}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold text-xs">
              {message.sender_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{message.sender_name}</p>
            <p className="text-xs text-white/40">{new Date(message.created_date).toLocaleTimeString()}</p>
          </div>
          {isDeletable && (
            <button
              onClick={() => onDelete(message.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 flex-shrink-0 disabled:opacity-50"
              title="Delete message"
              disabled={false}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Image */}
        {message.image_url && (
          <img
            src={message.image_url}
            alt="Message"
            className="rounded-lg w-full mb-3 border border-white/10"
          />
        )}

        {/* Content */}
        {message.content && <p className="text-sm text-white/90 break-words mb-3">{message.content}</p>}

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs transition-colors flex items-center gap-1"
              >
                <span>{emoji}</span>
                <span className="text-white/60">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <Smile className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute bottom-full left-0 mb-2 bg-[#141414] border border-white/10 rounded-lg p-2 flex flex-wrap gap-1 w-48 z-10"
                >
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleReply}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}