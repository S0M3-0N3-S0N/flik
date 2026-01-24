import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Search, Plus, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { createPageUrl } from "../utils";
import { useNavigate } from "react-router-dom";

export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newConversationEmail, setNewConversationEmail] = useState("");
  const [showNewConversation, setShowNewConversationModal] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['messages', currentUser?.email],
    queryFn: () => {
      if (!currentUser?.email) return [];
      return base44.entities.Message.list();
    },
    enabled: !!currentUser?.email,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageInput("");
    },
  });

  const conversations = React.useMemo(() => {
    if (!currentUser?.email) return [];
    const userMessages = allMessages.filter(
      (m) => m.sender_email === currentUser.email || m.recipient_email === currentUser.email
    );

    const convMap = new Map();
    userMessages.forEach((msg) => {
      const otherEmail =
        msg.sender_email === currentUser.email ? msg.recipient_email : msg.sender_email;
      if (!convMap.has(otherEmail)) {
        convMap.set(otherEmail, []);
      }
      convMap.get(otherEmail).push(msg);
    });

    return Array.from(convMap.entries())
      .map(([email, messages]) => ({
        email,
        messages: messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
        lastMessage: messages[messages.length - 1],
        unreadCount: messages.filter((m) => !m.is_read && m.recipient_email === currentUser.email).length,
      }))
      .sort((a, b) => new Date(b.lastMessage?.created_date) - new Date(a.lastMessage?.created_date));
  }, [allMessages, currentUser?.email]);

  const selectedMessages = selectedConversation
    ? conversations.find((c) => c.email === selectedConversation)?.messages || []
    : [];

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      sender_email: currentUser.email,
      recipient_email: selectedConversation,
      content: messageInput,
    });
  };

  const handleStartConversation = async () => {
    if (!newConversationEmail.trim()) {
      toast.error("Please enter an email");
      return;
    }
    setSelectedConversation(newConversationEmail);
    setNewConversationEmail("");
    setShowNewConversationModal(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMessages]);

  if (!currentUser) return null;

  return (
    <div className="h-[calc(100dvh-4rem)] flex overflow-hidden bg-[#0A0A0A]">
      {/* Conversations List */}
      <div className="w-full md:w-80 border-r border-white/10 flex flex-col bg-[#0A0A0A]">
        <div className="p-4 border-b border-white/10 space-y-3">
          <h2 className="text-xl font-bold text-white">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <Button
            onClick={() => setShowNewConversationModal(true)}
            className="w-full btn-gradient text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 p-2">
          <AnimatePresence>
            {conversations
              .filter((c) => !searchQuery || c.email.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((conv) => (
                <motion.button
                  key={conv.email}
                  onClick={() => setSelectedConversation(conv.email)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedConversation === conv.email
                      ? "bg-[#FF6B35]/20 border border-[#FF6B35]/50"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium truncate text-sm">{conv.email}</span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-[#FF6B35] text-white text-xs rounded-full px-2 py-0.5">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-xs truncate">{conv.lastMessage?.content}</p>
                </motion.button>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Area */}
      <div className="hidden md:flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-medium">{selectedConversation}</h3>
              <button
                onClick={() => setSelectedConversation(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender_email === currentUser.email ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      msg.sender_email === currentUser.email
                        ? "bg-[#FF6B35] text-white"
                        : "bg-white/10 text-white/90"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {new Date(msg.created_date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !messageInput.trim()}
                  className="btn-gradient text-white px-4"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="text-xl font-bold text-white">Start New Conversation</h3>
            <Input
              value={newConversationEmail}
              onChange={(e) => setNewConversationEmail(e.target.value)}
              placeholder="Enter user email..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setShowNewConversationModal(false)}
                variant="outline"
                className="flex-1 border-white/10 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartConversation}
                className="flex-1 btn-gradient text-white"
              >
                Start
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}