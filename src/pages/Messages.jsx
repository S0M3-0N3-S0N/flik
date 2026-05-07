import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Image as ImageIcon, ArrowLeft, Loader2, X, Search,
  Lock, Users, UserPlus, Check, Clock, UserCheck, ChevronRight,
  MoreVertical, Trash2, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ── Avatar ────────────────────────────────────────────────────────
function Avatar({ user, size = "md" }) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden`}>
      {user?.profile_picture ? (
        <img src={user.profile_picture} alt={user?.full_name} className="w-full h-full object-cover" />
      ) : (
        (user?.full_name || user?.email || "?")[0].toUpperCase()
      )}
    </div>
  );
}

// ── GalleryPicker for messages ────────────────────────────────────
function GalleryImagePicker({ currentUser, onSelect, onClose }) {
  const { data: creations = [], isLoading } = useQuery({
    queryKey: ["msgGallery", currentUser?.email],
    queryFn: () =>
      currentUser?.email
        ? base44.entities.Creation.filter({ created_by: currentUser.email, type: "image" }, "-created_date", 40)
        : [],
    enabled: !!currentUser?.email,
    initialData: [],
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full sm:max-w-lg bg-[#141414] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <h3 className="font-semibold text-white text-sm">Send from Gallery</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
            </div>
          ) : creations.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">No images in your gallery</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {creations.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.thumbnail_url || c.url)}
                  className="aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-[#FF6B35]/50 transition-all active:scale-95 group"
                >
                  <img src={c.thumbnail_url || c.url} alt={c.title} className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Friend Request Mini-Panel ────────────────────────────────────
function FriendRequestBanner({ record, onAccept, onDecline, requesterUser }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#FF6B35]/10 border-b border-[#FF6B35]/20">
      <Avatar user={requesterUser} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">
          {requesterUser?.full_name || record.requester_email}
        </p>
        <p className="text-[10px] text-white/50">wants to be friends</p>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => onAccept(record)} className="w-7 h-7 rounded-lg bg-[#FF6B35] text-white flex items-center justify-center text-xs">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDecline(record)} className="w-7 h-7 rounded-lg bg-white/10 text-white/60 flex items-center justify-center text-xs">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // { url, file? }
  const [searchQuery, setSearchQuery] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chats"); // chats | requests
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const selectedUserRef = useRef(null);

  // keep ref in sync
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // ── Data Fetching ────────────────────────────────────────────────
  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    staleTime: 60000,
  });

  const { data: allFriendRecords = [], refetch: refetchFriends } = useQuery({
    queryKey: ["friendRecords", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const [sent, received] = await Promise.all([
        base44.entities.Friend.filter({ requester_email: user.email }),
        base44.entities.Friend.filter({ recipient_email: user.email }),
      ]);
      return [...sent, ...received];
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const acceptedFriends = allFriendRecords
    .filter(r => r.status === "accepted")
    .map(r => {
      const email = r.requester_email === user?.email ? r.recipient_email : r.requester_email;
      return allUsers.find(u => u.email === email);
    })
    .filter(Boolean);

  const pendingIncoming = allFriendRecords.filter(
    r => r.status === "pending" && r.recipient_email === user?.email
  );
  const pendingOutgoing = allFriendRecords.filter(
    r => r.status === "pending" && r.requester_email === user?.email
  );

  const getRelationship = useCallback((targetEmail) => {
    return allFriendRecords.find(
      r =>
        (r.requester_email === user?.email && r.recipient_email === targetEmail) ||
        (r.recipient_email === user?.email && r.requester_email === targetEmail)
    );
  }, [allFriendRecords, user?.email]);

  const filteredFriends = searchQuery.trim()
    ? acceptedFriends.filter(
        f =>
          f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : acceptedFriends;

  // Search results for add friend
  const addFriendResults = friendSearchQuery.trim()
    ? allUsers.filter(
        u =>
          u.email !== user?.email &&
          (u.full_name?.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(friendSearchQuery.toLowerCase()))
      )
    : [];

  // ── Real-time messages ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedUser || !user) return;
    loadMessages();

    const unsub = base44.entities.Message.subscribe((event) => {
      const d = event.data;
      const cur = selectedUserRef.current;
      if (!cur) return;
      const relevant =
        (d?.sender_email === cur.email && d?.recipient_email === user.email) ||
        (d?.sender_email === user.email && d?.recipient_email === cur.email);
      if (!relevant) return;

      setMessages(prev => {
        if (event.type === "create") {
          if (prev.find(m => m.id === d.id)) return prev;
          return [...prev, d].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        }
        if (event.type === "delete") return prev.filter(m => m.id !== event.id);
        return prev;
      });
    });
    return unsub;
  }, [selectedUser?.email, user?.email]);

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

  // ── Send Message ─────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() && !imagePreview) return;
    if (!selectedUser || !user) return;
    setIsSending(true);
    try {
      let imageUrl = imagePreview?.url || null;

      // If it's a local file (not gallery URL), upload it
      if (imagePreview?.file) {
        const result = await base44.integrations.Core.UploadFile({ file: imagePreview.file });
        imageUrl = result.file_url;
      }

      await base44.entities.Message.create({
        sender_email: user.email,
        recipient_email: selectedUser.email,
        content: text.trim() || " ",
        ...(imageUrl ? { image_url: imageUrl } : {}),
      });
      setText("");
      setImagePreview(null);
      inputRef.current?.focus();
    } catch (err) {
      toast.error("Failed to send message. Note: file uploads require integration credits.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = ev => setImagePreview({ url: ev.target.result, file });
    reader.readAsDataURL(file);
  };

  const handleGallerySelect = (url) => {
    setImagePreview({ url, file: null }); // gallery URL, no upload needed
    setShowGallery(false);
  };

  // ── Friend Actions ───────────────────────────────────────────────
  const sendFriendRequest = async (recipientEmail) => {
    await base44.entities.Friend.create({
      requester_email: user.email,
      recipient_email: recipientEmail,
      status: "pending",
    });
    refetchFriends();
    toast.success("Friend request sent!");
  };

  const acceptRequest = async (record) => {
    await base44.entities.Friend.update(record.id, { status: "accepted" });
    refetchFriends();
    toast.success("Friend added!");
  };

  const declineRequest = async (record) => {
    await base44.entities.Friend.update(record.id, { status: "declined" });
    refetchFriends();
  };

  const cancelRequest = async (record) => {
    await base44.entities.Friend.delete(record.id);
    refetchFriends();
  };

  const deleteMessage = async (id) => {
    await base44.entities.Message.delete(id);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  // ── Helpers ──────────────────────────────────────────────────────
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

  const groupedMessages = messages.reduce((groups, msg) => {
    const key = new Date(msg.created_date).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
    return groups;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-[#0A0A0A] flex text-white overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* ── Sidebar ── */}
      <div className={`${selectedUser ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 lg:w-80 border-r border-white/5 bg-[#0d0d0d] flex-shrink-0`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold gradient-text">Messages</h1>
            <div className="flex items-center gap-1">
              {pendingIncoming.length > 0 && (
                <button
                  onClick={() => setActiveTab(activeTab === "requests" ? "chats" : "requests")}
                  className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "requests"
                      ? "bg-[#FF6B35] text-white"
                      : "bg-[#FF6B35]/15 text-[#FF6B35]"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {pendingIncoming.length}
                </button>
              )}
              <button
                onClick={() => setShowAddFriend(true)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
                title="Add friend"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/5 p-0.5 rounded-xl gap-0.5">
            {[
              { key: "chats", label: "Chats", icon: MessageSquare },
              { key: "requests", label: `Requests${pendingIncoming.length > 0 ? ` (${pendingIncoming.length})` : ""}`, icon: Clock },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search (chats tab only) */}
        {activeTab === "chats" && (
          <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/8 rounded-xl text-xs text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Chats Tab */}
        {activeTab === "chats" && (
          <div className="flex-1 overflow-y-auto">
            {acceptedFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-white/40 text-sm font-medium">No friends yet</p>
                <p className="text-white/20 text-xs">Add friends to start messaging</p>
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Friends
                </button>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">No results</div>
            ) : (
              filteredFriends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => setSelectedUser(friend)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${
                    selectedUser?.id === friend.id ? "bg-white/5 border-r-2 border-[#FF6B35]" : ""
                  }`}
                >
                  <Avatar user={friend} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{friend.full_name || friend.email}</p>
                    <p className="text-xs text-white/40 truncate">{friend.email}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pendingIncoming.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2 px-1">Incoming</p>
                <div className="space-y-2">
                  {pendingIncoming.map(record => {
                    const requester = allUsers.find(u => u.email === record.requester_email);
                    return (
                      <div key={record.id} className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/8">
                        <Avatar user={requester} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{requester?.full_name || record.requester_email}</p>
                          <p className="text-xs text-white/40">Friend request</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => acceptRequest(record)} className="w-8 h-8 rounded-xl bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/40 flex items-center justify-center transition-all">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => declineRequest(record)} className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:bg-red-400/20 hover:text-red-400 flex items-center justify-center transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {pendingOutgoing.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2 px-1">Sent</p>
                <div className="space-y-2">
                  {pendingOutgoing.map(record => {
                    const recipient = allUsers.find(u => u.email === record.recipient_email);
                    return (
                      <div key={record.id} className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/8">
                        <Avatar user={recipient} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{recipient?.full_name || record.recipient_email}</p>
                          <p className="text-xs text-[#FFB800]/70">Pending...</p>
                        </div>
                        <button onClick={() => cancelRequest(record)} className="w-8 h-8 rounded-xl bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <Clock className="w-10 h-10 text-white/15" />
                <p className="text-sm text-white/30">No pending requests</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Chat Panel ── */}
      {selectedUser ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0d0d0d] flex-shrink-0">
            <button onClick={() => setSelectedUser(null)} className="md:hidden text-white/60 hover:text-white p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Avatar user={selectedUser} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{selectedUser.full_name || selectedUser.email}</p>
              <p className="text-xs text-white/40">{selectedUser.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-40 pt-20">
                <Users className="w-12 h-12" />
                <p className="text-sm">Say hello! 👋</p>
              </div>
            )}
            {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-[10px] text-white/25 font-medium">{formatDate(msgs[0].created_date)}</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                <div className="space-y-1">
                  {msgs.map((msg, idx) => {
                    const isMe = msg.sender_email === user?.email;
                    const prevMsg = msgs[idx - 1];
                    const nextMsg = msgs[idx + 1];
                    const isFirst = !prevMsg || prevMsg.sender_email !== msg.sender_email;
                    const isLast = !nextMsg || nextMsg.sender_email !== msg.sender_email;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-end gap-2 group ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        {/* Avatar for others */}
                        {!isMe && (
                          <div className="w-7 flex-shrink-0 self-end mb-0.5">
                            {isLast && <Avatar user={selectedUser} size="sm" />}
                          </div>
                        )}

                        <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                          {/* Image attachment */}
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="attachment"
                              className={`max-w-full max-h-60 object-cover rounded-2xl ${
                                isMe ? "rounded-br-sm" : "rounded-bl-sm"
                              } border border-white/10`}
                            />
                          )}
                          {/* Text bubble */}
                          {msg.content?.trim() && msg.content !== " " && (
                            <div className={`relative px-4 py-2.5 text-sm leading-relaxed select-text ${
                              isMe
                                ? "bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white rounded-2xl rounded-br-sm"
                                : "bg-white/8 border border-white/8 text-white/90 rounded-2xl rounded-bl-sm"
                            }`}>
                              {msg.content}
                              {/* Delete button on hover */}
                              {isMe && (
                                <button
                                  onClick={() => deleteMessage(msg.id)}
                                  className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-white/30 hover:text-red-400 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {/* Timestamp */}
                          {isLast && (
                            <span className="text-[10px] text-white/20 px-1">{formatTime(msg.created_date)}</span>
                          )}
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
                className="px-4 py-2 border-t border-white/5 flex items-center gap-2 bg-[#0d0d0d] flex-shrink-0"
              >
                <div className="relative">
                  <img src={imagePreview.url} alt="preview" className="w-14 h-14 object-cover rounded-xl border border-white/10" />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center border border-white/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-white/40">{imagePreview.file ? "Upload on send" : "From gallery"}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Bar */}
          <div
            className="px-3 py-3 border-t border-white/5 bg-[#0d0d0d] flex-shrink-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <div className="flex items-center gap-2">
              {/* Camera / Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors flex-shrink-0"
                title="Upload image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              {/* Gallery picker */}
              <button
                onClick={() => setShowGallery(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors flex-shrink-0"
                title="Send from Gallery"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

              {/* Text input */}
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message..."
                className="flex-1 min-w-0 bg-white/5 border border-white/8 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
              />

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={isSending || (!text.trim() && !imagePreview)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-white disabled:opacity-40 flex-shrink-0 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-4 text-white/20">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 opacity-40" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white/30">Select a conversation</p>
            <p className="text-sm text-white/20 mt-1">Choose a friend to start chatting</p>
          </div>
        </div>
      )}

      {/* ── Gallery Picker Modal ── */}
      <AnimatePresence>
        {showGallery && (
          <GalleryImagePicker
            currentUser={user}
            onSelect={handleGallerySelect}
            onClose={() => setShowGallery(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Add Friend Modal ── */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowAddFriend(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="w-full sm:max-w-md bg-[#141414] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <h3 className="font-semibold text-white text-sm">Find & Add Friends</h3>
                <button onClick={() => setShowAddFriend(false)} className="text-white/40 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  <input
                    value={friendSearchQuery}
                    onChange={e => setFriendSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {!friendSearchQuery.trim() && (
                    <p className="text-center text-xs text-white/30 py-6">Type a name or email to search</p>
                  )}
                  {addFriendResults.map(u => {
                    const rel = getRelationship(u.email);
                    const isAccepted = rel?.status === "accepted";
                    const isPendingOut = rel?.status === "pending" && rel?.requester_email === user?.email;
                    const isPendingIn = rel?.status === "pending" && rel?.recipient_email === user?.email;
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <Avatar user={u} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{u.full_name || u.email}</p>
                          <p className="text-xs text-white/40 truncate">{u.email}</p>
                        </div>
                        {isAccepted ? (
                          <span className="text-xs text-[#FF6B35] font-semibold px-2 py-1 rounded-lg bg-[#FF6B35]/10 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Friends
                          </span>
                        ) : isPendingOut ? (
                          <span className="text-xs text-[#FFB800]/70 font-semibold px-2 py-1 rounded-lg bg-[#FFB800]/10">Pending</span>
                        ) : isPendingIn ? (
                          <button
                            onClick={() => acceptRequest(allFriendRecords.find(r => r.requester_email === u.email && r.recipient_email === user?.email))}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/40 transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                        ) : (
                          <button
                            onClick={() => sendFriendRequest(u.email)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-[#FF6B35]/20 hover:text-[#FF6B35] transition-all flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}