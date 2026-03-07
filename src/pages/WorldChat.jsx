import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send, Loader2, X, Image as ImageIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

export default function WorldChat() {
  const navigate = useNavigate();
  const [messageInput, setMessageInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["worldChatMessages"],
    queryFn: () => base44.entities.WorldChatMessage.list("-created_date", 100),
    refetchInterval: 2000,
    staleTime: 1000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = base44.entities.WorldChatMessage.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["worldChatMessages"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Get current user
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      return base44.entities.WorldChatMessage.create(messageData);
    },
    onSuccess: () => {
      setMessageInput("");
      setSelectedImage(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ["worldChatMessages"] });
      toast.success("Message sent!");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error(error);
    },
  });

  // Delete message mutation (admin only)
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => base44.entities.WorldChatMessage.delete(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worldChatMessages"] });
    },
    onError: (error) => {
      if (error?.status !== 404) {
        toast.error("You don't have permission to delete this message");
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !selectedImage) {
      toast.error("Please enter a message or select an image");
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

    createMessageMutation.mutate({
      content: messageInput,
      sender_name: user.userProfile?.username || user.full_name,
      sender_profile_picture: user.userProfile?.profile_picture || user.profile_picture || "",
      image_url: imageUrl || "",
    });
  };

  return (
    <div className="fixed inset-0 overflow-y-auto px-4 sm:px-6 pt-8 pb-12 md:pt-16 md:pb-16 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 md:mb-14"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="gradient-text">World Chat</span>
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto">Global real-time conversations</p>
        </motion.div>

        {/* Messages Container */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="w-10 h-10 text-[#FF6B35] animate-spin" />
            </div>
          ) : messages.length === 0 ? (
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
                {[...messages].reverse().map((message, index) => (
                  <div key={message.id} className="mb-3 sm:mb-4 break-inside-avoid">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors group cursor-default"
                    >
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
                        {(user?.role === "admin" || user?.email === message.created_by) && (
                          <button
                            onClick={() => deleteMessageMutation.mutate(message.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 flex-shrink-0"
                            title="Delete message"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {message.image_url && (
                        <img
                          src={message.image_url}
                          alt="Message"
                          className="rounded-lg w-full mb-3 border border-white/10"
                        />
                      )}

                      {message.content && (
                        <p className="text-sm text-white/90 break-words">{message.content}</p>
                      )}
                    </motion.div>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-white/5 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {imagePreview && (
            <div className="relative inline-block mb-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-24 rounded-lg border border-white/10"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <label className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors">
              <ImageIcon className="w-5 h-5 text-white/60" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isUploading || createMessageMutation.isPending}
              />
            </label>

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
              disabled={isUploading || createMessageMutation.isPending || (!messageInput.trim() && !selectedImage)}
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
    </div>
  );
}