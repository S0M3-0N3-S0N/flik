import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send, Loader2, X, Plus, Upload, Grid3x3, Film } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import WorldChatMessage from "@/components/WorldChatMessage";
import GifSearchModal from "@/components/GifSearchModal";

export default function WorldChat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  // Local state
  const [messageInput, setMessageInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showGifModal, setShowGifModal] = useState(false);
  const [selectedGifUrl, setSelectedGifUrl] = useState(null);
  const [user, setUser] = useState(null);
  const [messageList, setMessageList] = useState([]);
  const [reactionList, setReactionList] = useState([]);

  // Fetch initial messages
  const { isLoading: messagesLoading } = useQuery({
    queryKey: ["worldChatMessages"],
    queryFn: async () => {
      const msgs = await base44.entities.WorldChatMessage.list("-created_date", 100);
      setMessageList(msgs);
      return msgs;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Fetch initial reactions
  const { isLoading: reactionsLoading } = useQuery({
    queryKey: ["worldChatReactions"],
    queryFn: async () => {
      const reacts = await base44.entities.WorldChatMessageReaction.list();
      setReactionList(reacts);
      return reacts;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Load user
  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        if (u?.email) {
          const profiles = await base44.entities.UserProfile.filter({ email: u.email });
          setUser({ ...u, userProfile: profiles?.[0] });
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    })();
  }, []);

  // Subscribe to message changes
  useEffect(() => {
    const unsubscribe = base44.entities.WorldChatMessage.subscribe((event) => {
      if (event.type === "create") {
        setMessageList((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        setMessageList((prev) =>
          prev.map((msg) => (msg.id === event.id ? event.data : msg))
        );
      } else if (event.type === "delete") {
        setMessageList((prev) => prev.filter((msg) => msg.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  // Subscribe to reaction changes
  useEffect(() => {
    const unsubscribe = base44.entities.WorldChatMessageReaction.subscribe((event) => {
      if (event.type === "create") {
        setReactionList((prev) => [...prev, event.data]);
      } else if (event.type === "update") {
        setReactionList((prev) =>
          prev.map((r) => (r.id === event.id ? event.data : r))
        );
      } else if (event.type === "delete") {
        setReactionList((prev) => prev.filter((r) => r.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList]);

  // Create message
  const createMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      return base44.entities.WorldChatMessage.create(messageData);
    },
    onSuccess: () => {
      setMessageInput("");
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedGifUrl(null);
      setReplyingTo(null);
      toast.success("Message sent!");
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  // Delete message
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => base44.entities.WorldChatMessage.delete(messageId),
    onSuccess: () => {
      toast.success("Message deleted");
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  // Add reaction
  const reactMutation = useMutation({
    mutationFn: async (data) => {
      const existing = reactionList.find(
        (r) =>
          r.message_id === data.messageId &&
          r.emoji === data.emoji &&
          r.reactor_email === data.reactorEmail
      );

      if (existing) {
        return base44.entities.WorldChatMessageReaction.delete(existing.id);
      } else {
        return base44.entities.WorldChatMessageReaction.create({
          message_id: data.messageId,
          emoji: data.emoji,
          reactor_email: data.reactorEmail,
        });
      }
    },
  });

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectGif = (gifUrl) => {
    setSelectedGifUrl(gifUrl);
    setMessageInput("");
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !selectedImage && !selectedGifUrl) {
      toast.error("Please enter a message, select an image, or choose a GIF");
      return;
    }

    if (!user?.full_name) {
      toast.error("User not authenticated");
      return;
    }

    let imageUrl = null;

    if (selectedImage) {
      setIsUploading(true);
      try {
        const uploadResult = await base44.integrations.Core.UploadFile({
          file: selectedImage,
        });
        imageUrl = uploadResult.file_url;
      } catch (error) {
        toast.error("Failed to upload image");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const messageData = {
      content: messageInput.trim(),
      sender_name: user.userProfile?.username || user.full_name,
      sender_profile_picture: user.userProfile?.profile_picture || user.profile_picture || "",
      image_url: selectedGifUrl || imageUrl || "",
    };

    if (replyingTo) {
      messageData.parent_message_id = replyingTo.id;
      messageData.original_message_author_email = replyingTo.created_by;
    }

    createMessageMutation.mutate(messageData);
  };

  const isLoading = messagesLoading || reactionsLoading;

  return (
    <div className="fixed inset-0 overflow-y-auto px-4 sm:px-6 pt-8 pb-20 md:pt-16 md:pb-16 bg-[#0A0A0A]" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top))' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center mb-10 md:mb-14"
        >
          <button
            onClick={() => navigate(createPageUrl("Profile"))}
            className="absolute top-0 left-0 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Back to Profile"
          >
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="gradient-text">World Chat</span>
          </h1>
        </motion.div>

        {/* Messages Container */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="w-10 h-10 text-[#FF6B35] animate-spin" />
            </div>
          ) : messageList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-40"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center mx-auto mb-8 border border-[#FF6B35]/20">
                <Send className="w-12 h-12 text-[#FF6B35]" />
              </div>
              <h3 className="text-white text-2xl font-semibold mb-3">No messages yet</h3>
              <p className="text-white/50 max-w-sm mx-auto text-base">Start the conversation with the world!</p>
            </motion.div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-3 sm:gap-4">
              <AnimatePresence mode="popLayout">
                {[...messageList].reverse().map((message) => {
                  const parentMessage = message.parent_message_id
                    ? messageList.find((m) => m.id === message.parent_message_id)
                    : null;

                  return (
                    <WorldChatMessage
                      key={message.id}
                      message={message}
                      reactions={reactionList}
                      userEmail={user?.email}
                      onReact={(messageId, emoji, reactorEmail) =>
                        reactMutation.mutate({ messageId, emoji, reactorEmail })
                      }
                      onReply={() => setReplyingTo(message)}
                      onDelete={(id) => deleteMessageMutation.mutate(id)}
                      parentMessage={parentMessage}
                      isDeletable={user?.role === "admin" || user?.email === message.created_by}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-white/5 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          {replyingTo && (
            <div className="mb-3 pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-white/60">Replying to {replyingTo.sender_name}</p>
                <p className="text-sm text-white/80 line-clamp-1">{replyingTo.content}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="ml-2 p-1 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {(imagePreview || selectedGifUrl) && (
            <div className="relative inline-block mb-3">
              <img
                src={imagePreview || selectedGifUrl}
                alt="Preview"
                className="max-h-24 rounded-lg border border-white/10"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                  setSelectedGifUrl(null);
                }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 relative">
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  const menu = document.getElementById("world-attach-menu");
                  if (menu) {
                    menu.classList.toggle("hidden");
                  }
                }}
                className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors disabled:opacity-50"
                disabled={isUploading || createMessageMutation.isPending}
                title="Add attachments"
              >
                <Plus className="w-5 h-5 text-white/60" />
              </button>

              <div
                id="world-attach-menu"
                className="hidden absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl min-w-[180px]"
              >
                <label className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-[#FF6B35]" />
                  <span className="text-sm">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleImageSelect(e);
                      document.getElementById("world-attach-menu")?.classList.add("hidden");
                    }}
                    className="hidden"
                    disabled={isUploading || createMessageMutation.isPending}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("world-attach-menu")?.classList.add("hidden");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-left border-t border-white/5"
                >
                  <Grid3x3 className="w-4 h-4 text-[#FF6B35]" />
                  <span className="text-sm">From Gallery</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGifModal(true);
                    document.getElementById("world-attach-menu")?.classList.add("hidden");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white/80 hover:text-white transition-colors text-left border-t border-white/5"
                >
                  <Film className="w-4 h-4 text-[#FF6B35]" />
                  <span className="text-sm">Search GIFs</span>
                </button>
              </div>
            </div>

            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Send a message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6B35]/50"
              disabled={isUploading || createMessageMutation.isPending}
            />

            <Button
              onClick={handleSendMessage}
              disabled={
                isUploading ||
                createMessageMutation.isPending ||
                (!messageInput.trim() && !selectedImage && !selectedGifUrl)
              }
              className="btn-gradient px-4 py-2.5 h-auto"
            >
              {isUploading || createMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* GIF Search Modal */}
      <AnimatePresence>
        {showGifModal && (
          <GifSearchModal
            onSelectGif={handleSelectGif}
            onClose={() => setShowGifModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}