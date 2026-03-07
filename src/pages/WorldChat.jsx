import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send, Loader2, X, Image as ImageIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

export default function WorldChat() {
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
    base44.auth.me()
      .then(async (u) => {
        if (u?.email) {
          const profile = await base44.entities.UserProfile.filter({ email: u.email });
          setUser({ ...u, profile: profile?.[0] });
        }
      })
      .catch(() => {});
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
      toast.success("Message deleted");
    },
    onError: () => {
      toast.error("Failed to delete message");
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
      sender_name: user.profile?.username || user.full_name,
      sender_profile_picture: user.profile?.profile_picture || user.profile_picture || "",
      image_url: imageUrl || "",
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col pt-20 md:pt-24">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-white/5 backdrop-blur-xl md:mt-16">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold gradient-text">World Chat</h1>
          <p className="text-xs text-white/60 mt-1">Global real-time conversations</p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 space-y-4 pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-white/60">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {[...messages].reverse().map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-3 group"
              >
                {message.sender_profile_picture ? (
                  <img
                    src={message.sender_profile_picture}
                    alt={message.sender_name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                    {message.sender_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">
                      {message.sender_name}
                    </span>
                    <span className="text-xs text-white/40">
                      {new Date(message.created_date).toLocaleTimeString()}
                    </span>

                    {user?.role === "admin" && (
                      <button
                        onClick={() => deleteMessageMutation.mutate(message.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400"
                        title="Delete message"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {message.image_url && (
                    <img
                      src={message.image_url}
                      alt="Message image"
                      className="rounded-lg max-w-xs mb-2 border border-white/10"
                    />
                  )}

                  {message.content && (
                    <p className="text-sm text-white/90 break-words">{message.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
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