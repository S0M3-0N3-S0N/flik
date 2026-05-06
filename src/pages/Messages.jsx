import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, ArrowLeft, Loader2, X, Search, Lock, Users } from "lucide-react";
import { toast } from "sonner";

function Avatar({ user, size = "md" }) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden`}>
      {user?.profile_picture ? (
        <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
      ) : (
        (user?.full_name || user?.email || "?")[0].toUpperCase()
      )}
    </div>
  );
}

export default function Messages() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Load all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  // Load friend relationships
  const { data: friendRecords = [] } = useQuery({
    queryKey: ["friendRecords", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const [sent, received] = await Promise.all([
        base44.entities.Friend.filter({ requester_email: user.email, status: "accepted" }),
        base44.entities.Friend.filter({ recipient_email: user.email, status: "accepted" }),
      ]);
      return [...sent, ...received];
    },
    enabled: !!user?.email,
    initialData: [],
  });

  // Derive friends list
  const friends = friendRecords.map(record => {
    const friendEmail =
      record.requester_email === user?.email ? record.recipient_email : record.requester_email;
    return allUsers.find(u => u.email === friendEmail);
  }).filter(Boolean);

  const filteredFriends = searchQuery.trim()
    ? friends.filter(
        f =>
          f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedUser || !user) return;
    loadMessages();
    const unsub = base44.entities.Message.subscribe((event) => {
      const d = event.data;
      if (
        (d?.sender_email === selectedUser.email && d?.recipient_email === user.email) ||
        (d?.sender_email === user.email && d?.recipient_email === selectedUser.email)
      ) {
        setMessages(prev => {
          if (event.type === "create") return [...prev, d];
          if (event.type === "update") return prev.map(m => m.id === event.id ? d : m);
          if (event.type === "delete") return prev.filter(m => m.id !== event.id);
          return prev;
        });
      }
    });
    return unsub;
  }, [selectedUser, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    if (!user || !selectedUser) return;
    const [sent, received] = await Promise.all([
      base44.entities.Message.filter({ sender_email: user.email, recipient_email: selectedUser.email }),
      base44.entities.Message.filter({ sender_email: selectedUser.email, recipient_email: user.email }),
    ]);
    const all = [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    setMessages(all);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!text.trim() && !imageFile) return;
    if (!selectedUser || !user) return;
    setIsSending(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const result = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = result.file_url;
      }
      await base44.entities.Message.create({
        sender_email: user.email,
        recipient_email: selectedUser.email,
        content: text.trim() || " ",
        image_url: imageUrl || undefined,
      });
      setText("");
      setImageFile(null);
      setImagePreview(null);
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = new Date(msg.created_date).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-[#0A0A0A] flex text-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* ── Sidebar ── */}
      <div
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-72 border-r border-white/5 bg-[#0d0d0d]`}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 flex-shrink-0">
          <h1 className="text-lg font-bold gradient-text mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
            />
          </div>
        </div>

        {/* Friend List */}
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <Lock className="w-7 h-7 text-white/20" />
              </div>
              <p className="text-white/40 text-sm font-medium">No friends yet</p>
              <p className="text-white/20 text-xs">Add friends from your Profile to start messaging</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">No results</div>
          ) : (
            filteredFriends.map(friend => (
              <button
                key={friend.id}
                onClick={() => setSelectedUser(friend)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                  selectedUser?.id === friend.id
                    ? "bg-white/5 border-r-2 border-[#FF6B35]"
                    : ""
                }`}
              >
                <Avatar user={friend} />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {friend.full_name || friend.email}
                  </p>
                  <p className="text-xs text-white/40 truncate">{friend.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Panel ── */}
      {selectedUser ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0d0d0d] flex-shrink-0">
            <button
              onClick={() => setSelectedUser(null)}
              className="md:hidden text-white/60 hover:text-white p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Avatar user={selectedUser} size="sm" />
            <div>
              <p className="text-sm font-semibold">
                {selectedUser.full_name || selectedUser.email}
              </p>
              <p className="text-xs text-white/40">{selectedUser.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-40">
                <Users className="w-12 h-12" />
                <p className="text-sm">Start the conversation!</p>
              </div>
            )}
            {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-[11px] text-white/30 font-medium px-2">
                    {formatDate(msgs[0].created_date)}
                  </span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                <div className="space-y-1.5">
                  {msgs.map((msg, idx) => {
                    const isMe = msg.sender_email === user?.email;
                    const prevMsg = msgs[idx - 1];
                    const showAvatar = !isMe && (!prevMsg || prevMsg.sender_email !== msg.sender_email);
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        {!isMe && (
                          <div className="w-6 flex-shrink-0">
                            {showAvatar && <Avatar user={selectedUser} size="sm" />}
                          </div>
                        )}
                        <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="attachment"
                              className={`rounded-2xl max-w-full max-h-56 object-cover mb-1 ${
                                isMe ? "rounded-br-sm" : "rounded-bl-sm"
                              }`}
                            />
                          )}
                          {msg.content?.trim() && msg.content !== " " && (
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                isMe
                                  ? "bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white rounded-br-sm"
                                  : "bg-white/8 border border-white/5 text-white/90 rounded-bl-sm"
                              }`}
                            >
                              {msg.content}
                            </div>
                          )}
                          <span className="text-[10px] text-white/25 px-1">
                            {formatTime(msg.created_date)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-2 flex items-center gap-2"
              >
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded-xl border border-white/10"
                  />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Bar */}
          <div
            className="px-4 py-3 border-t border-white/5 flex items-center gap-2 bg-[#0d0d0d] flex-shrink-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors flex-shrink-0"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Message..."
              className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isSending || (!text.trim() && !imageFile)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 flex-shrink-0 active:scale-95"
              style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-white/20">
          <Users className="w-14 h-14 opacity-30" />
          <p className="text-sm">Select a friend to start chatting</p>
        </div>
      )}
    </div>
  );
}