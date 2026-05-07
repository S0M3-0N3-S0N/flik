import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Image as ImageIcon, ArrowLeft, Loader2, X, Search,
  Lock, Users, UserPlus, Check, Clock, UserCheck, Trash2,
  MessageSquare, Smile, Phone, Video, Info, Grid3x3
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Avatar({ user, size = "md", online = false }) {
  const dims = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div className="relative flex-shrink-0">
      <div className={`${dims[size]} rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-bold overflow-hidden`}>
        {user?.profile_picture
          ? <img src={user.profile_picture} alt={user?.full_name} className="w-full h-full object-cover" />
          : (user?.full_name || user?.email || "?")[0].toUpperCase()
        }
      </div>
      {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#0d0d0d]" />}
    </div>
  );
}

function GalleryPicker({ currentUser, onSelect, onClose }) {
  const { data: creations = [], isLoading } = useQuery({
    queryKey: ["msgGallery", currentUser?.email],
    queryFn: () => currentUser?.email
      ? base44.entities.Creation.filter({ created_by: currentUser.email, type: "image" }, "-created_date", 60)
      : [],
    enabled: !!currentUser?.email,
    initialData: [],
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full sm:max-w-lg bg-[#141414] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <h3 className="font-bold text-white text-sm">Your Gallery</h3>
            <p className="text-xs text-white/40 mt-0.5">Tap an image to attach</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-[#FF6B35]" />
            </div>
          ) : creations.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No images in your gallery yet</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {creations.map(c => (
                <button key={c.id} onClick={() => onSelect(c.thumbnail_url || c.url)}
                  className="aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-[#FF6B35]/60 transition-all active:scale-95 group relative"
                >
                  <img src={c.thumbnail_url || c.url} alt={c.title || ""} className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <Send className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddFriendModal({ user, allUsers, allFriendRecords, onSendRequest, onAcceptRequest, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const getRelationship = useCallback((email) =>
    allFriendRecords.find(r =>
      (r.requester_email === user?.email && r.recipient_email === email) ||
      (r.recipient_email === user?.email && r.requester_email === email)
    ), [allFriendRecords, user?.email]);

  const results = query.trim()
    ? allUsers.filter(u =>
        u.email !== user?.email &&
        (u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
         u.email?.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full sm:max-w-md bg-[#141414] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <h3 className="font-bold text-white text-sm">Add Friends</h3>
            <p className="text-xs text-white/40 mt-0.5">Search by name or email</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/50 transition-colors"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {!query.trim() && (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-white/15 mx-auto mb-2" />
                <p className="text-xs text-white/30">Start typing to search</p>
              </div>
            )}
            {results.length === 0 && query.trim() && (
              <p className="text-center text-xs text-white/30 py-6">No users found for "{query}"</p>
            )}
            {results.map(u => {
              const rel = getRelationship(u.email);
              const isAccepted = rel?.status === "accepted";
              const isPendingOut = rel?.status === "pending" && rel?.requester_email === user?.email;
              const isPendingIn = rel?.status === "pending" && rel?.recipient_email === user?.email;
              return (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/5 transition-all">
                  <Avatar user={u} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-white/40 truncate">{u.email}</p>
                  </div>
                  {isAccepted ? (
                    <span className="text-xs text-[#FF6B35] font-semibold px-2.5 py-1 rounded-xl bg-[#FF6B35]/10 flex items-center gap-1 whitespace-nowrap">
                      <UserCheck className="w-3 h-3" /> Friends
                    </span>
                  ) : isPendingOut ? (
                    <span className="text-xs text-[#FFB800]/70 font-semibold px-2.5 py-1 rounded-xl bg-[#FFB800]/10 whitespace-nowrap">Sent</span>
                  ) : isPendingIn ? (
                    <button onClick={() => onAcceptRequest(rel)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all flex items-center gap-1 whitespace-nowrap"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                  ) : (
                    <button onClick={() => onSendRequest(u.email)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-[#FF6B35]/20 hover:text-[#FF6B35] transition-all flex items-center gap-1 whitespace-nowrap"
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
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const selectedFriendRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => { selectedFriendRef.current = selectedFriend; }, [selectedFriend]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // ── Data ──────────────────────────────────────────────────────────
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

  const acceptedFriends = useMemo(() =>
    allFriendRecords
      .filter(r => r.status === "accepted")
      .map(r => {
        const email = r.requester_email === user?.email ? r.recipient_email : r.requester_email;
        return allUsers.find(u => u.email === email);
      })
      .filter(Boolean),
    [allFriendRecords, allUsers, user?.email]
  );

  const pendingIncoming = useMemo(() =>
    allFriendRecords.filter(r => r.status === "pending" && r.recipient_email === user?.email),
    [allFriendRecords, user?.email]
  );

  const pendingOutgoing = useMemo(() =>
    allFriendRecords.filter(r => r.status === "pending" && r.requester_email === user?.email),
    [allFriendRecords, user?.email]
  );

  const filteredFriends = useMemo(() =>
    searchQuery.trim()
      ? acceptedFriends.filter(f =>
          f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : acceptedFriends,
    [acceptedFriends, searchQuery]
  );

  // ── Real-time messages ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFriend || !user) return;
    setLoadingMessages(true);
    const load = async () => {
      const [sent, received] = await Promise.all([
        base44.entities.Message.filter({ sender_email: user.email, recipient_email: selectedFriend.email }),
        base44.entities.Message.filter({ sender_email: selectedFriend.email, recipient_email: user.email }),
      ]);
      const sorted = [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMessages(sorted);
      setLoadingMessages(false);
    };
    load();

    const unsub = base44.entities.Message.subscribe((event) => {
      const d = event.data;
      const cur = selectedFriendRef.current;
      const me = userRef.current;
      if (!cur || !me) return;
      const relevant =
        (d?.sender_email === cur.email && d?.recipient_email === me.email) ||
        (d?.sender_email === me.email && d?.recipient_email === cur.email);
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
  }, [selectedFriend?.email, user?.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() && !imagePreview) return;
    if (!selectedFriend || !user) return;
    setIsSending(true);
    try {
      let imageUrl = imagePreview?.galleryUrl || null;
      if (imagePreview?.file) {
        const result = await base44.integrations.Core.UploadFile({ file: imagePreview.file });
        imageUrl = result.file_url;
      }
      await base44.entities.Message.create({
        sender_email: user.email,
        recipient_email: selectedFriend.email,
        content: text.trim() || " ",
        ...(imageUrl ? { image_url: imageUrl } : {}),
      });
      setText("");
      setImagePreview(null);
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to send. Image uploads require integration credits.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = ev => setImagePreview({ previewUrl: ev.target.result, file });
    reader.readAsDataURL(file);
  };

  const handleGallerySelect = (url) => {
    setImagePreview({ previewUrl: url, galleryUrl: url, file: null });
    setShowGallery(false);
  };

  const sendFriendRequest = async (email) => {
    await base44.entities.Friend.create({ requester_email: user.email, recipient_email: email, status: "pending" });
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

  // ── Helpers ────────────────────────────────────────────────────────
  const formatTime = d => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = d => {
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  };

  const groupedMessages = useMemo(() =>
    messages.reduce((acc, msg) => {
      const key = new Date(msg.created_date).toDateString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(msg);
      return acc;
    }, {}),
    [messages]
  );

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex text-white overflow-hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>

      {/* ══ SIDEBAR ══ */}
      <div className={`${selectedFriend ? "hidden md:flex" : "flex"} flex-col w-full md:w-[300px] lg:w-[320px] border-r border-white/5 bg-[#0c0c0c] flex-shrink-0`}>

        {/* Sidebar Header */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(createPageUrl("Generate"))}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all"
                title="Back to Generate"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-bold text-white">Messages</h1>
            </div>
            <button onClick={() => setShowAddFriend(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-white"
              style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
              title="Add friend"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/5 p-0.5 rounded-2xl gap-0.5 mb-3">
            {[
              { key: "chats", label: "Chats", icon: MessageSquare },
              { key: "requests", label: "Requests", icon: Clock, badge: pendingIncoming.length },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white shadow-lg"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search (chats only) */}
          {activeTab === "chats" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-xs text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Chats Tab */}
        {activeTab === "chats" && (
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {acceptedFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 gap-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6B35]/15 to-[#F72C25]/15 flex items-center justify-center border border-[#FF6B35]/20">
                  <MessageSquare className="w-9 h-9 text-[#FF6B35]/60" />
                </div>
                <div>
                  <p className="text-white/60 text-sm font-semibold mb-1">No conversations yet</p>
                  <p className="text-white/25 text-xs">Add friends to start chatting</p>
                </div>
                <button onClick={() => setShowAddFriend(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Friends
                </button>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">No results found</div>
            ) : (
              <div className="px-2 py-1 space-y-0.5">
                {filteredFriends.map(friend => (
                  <button key={friend.id} onClick={() => setSelectedFriend(friend)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left ${
                      selectedFriend?.id === friend.id
                        ? "bg-gradient-to-r from-[#FF6B35]/15 to-[#F72C25]/10 border border-[#FF6B35]/25"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Avatar user={friend} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{friend.full_name || friend.email}</p>
                      <p className="text-xs text-white/35 truncate mt-0.5">{friend.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {pendingIncoming.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2 px-1">Incoming ({pendingIncoming.length})</p>
                <div className="space-y-2">
                  {pendingIncoming.map(record => {
                    const requester = allUsers.find(u => u.email === record.requester_email);
                    return (
                      <div key={record.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8 hover:border-white/12 transition-all">
                        <Avatar user={requester} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{requester?.full_name || record.requester_email}</p>
                          <p className="text-xs text-white/40">Wants to be friends</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => acceptRequest(record)} className="w-8 h-8 rounded-xl bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white flex items-center justify-center transition-all">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => declineRequest(record)} className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all">
                            <X className="w-3.5 h-3.5" />
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
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2 px-1">Sent ({pendingOutgoing.length})</p>
                <div className="space-y-2">
                  {pendingOutgoing.map(record => {
                    const recipient = allUsers.find(u => u.email === record.recipient_email);
                    return (
                      <div key={record.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8 transition-all">
                        <Avatar user={recipient} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{recipient?.full_name || record.recipient_email}</p>
                          <p className="text-xs text-[#FFB800]/60">Pending...</p>
                        </div>
                        <button onClick={() => cancelRequest(record)} className="w-8 h-8 rounded-xl bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all" title="Cancel">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
                <Clock className="w-10 h-10 text-white/10" />
                <p className="text-sm text-white/30">No pending requests</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ CHAT PANEL ══ */}
      {selectedFriend ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0A0A0A]">

          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0c0c0c] flex-shrink-0 backdrop-blur-xl">
            <button onClick={() => setSelectedFriend(null)} className="md:hidden text-white/60 hover:text-white p-1 -ml-1 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Avatar user={selectedFriend} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{selectedFriend.full_name || selectedFriend.email}</p>
              <p className="text-xs text-white/35 truncate">{selectedFriend.email}</p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,107,53,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(247,44,37,0.03) 0%, transparent 50%)" }}
          >
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-7 h-7 animate-spin text-[#FF6B35]/50" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6B35]/15 to-[#F72C25]/15 flex items-center justify-center border border-[#FF6B35]/20">
                  <Avatar user={selectedFriend} size="lg" />
                </div>
                <div>
                  <p className="font-bold text-white text-base">{selectedFriend.full_name || selectedFriend.email}</p>
                  <p className="text-white/40 text-sm mt-1">Say hello! 👋</p>
                </div>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-white/6" />
                    <span className="text-[10px] text-white/25 font-medium bg-white/5 px-3 py-1 rounded-full">{formatDate(msgs[0].created_date)}</span>
                    <div className="flex-1 h-px bg-white/6" />
                  </div>

                  <div className="space-y-1">
                    {msgs.map((msg, idx) => {
                      const isMe = msg.sender_email === user?.email;
                      const prevMsg = msgs[idx - 1];
                      const nextMsg = msgs[idx + 1];
                      const isGroupStart = !prevMsg || prevMsg.sender_email !== msg.sender_email;
                      const isGroupEnd = !nextMsg || nextMsg.sender_email !== msg.sender_email;
                      const showAvatar = !isMe && isGroupEnd;
                      const hasText = msg.content?.trim() && msg.content !== " ";

                      return (
                        <motion.div key={msg.id}
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.15 }}
                          className={`flex items-end gap-2 group ${isMe ? "justify-end" : "justify-start"} ${isGroupStart ? "mt-3" : "mt-0.5"}`}
                        >
                          {/* Other user avatar */}
                          {!isMe && (
                            <div className="w-8 flex-shrink-0 self-end">
                              {showAvatar && <Avatar user={selectedFriend} size="sm" />}
                            </div>
                          )}

                          <div className={`max-w-[70%] sm:max-w-[60%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                            {/* Image */}
                            {msg.image_url && (
                              <div className={`overflow-hidden rounded-2xl border border-white/10 ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                                <img src={msg.image_url} alt="attachment"
                                  className="max-w-full max-h-64 object-cover block cursor-pointer hover:brightness-90 transition-all"
                                  onClick={() => window.open(msg.image_url, "_blank")}
                                />
                              </div>
                            )}

                            {/* Text bubble */}
                            {hasText && (
                              <div className={`relative group/msg px-4 py-2.5 text-sm leading-relaxed break-words select-text ${
                                isMe
                                  ? "bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white rounded-2xl rounded-br-sm shadow-lg shadow-[#FF6B35]/20"
                                  : "bg-[#1a1a1a] border border-white/8 text-white/90 rounded-2xl rounded-bl-sm"
                              }`}>
                                {msg.content}
                                {isMe && (
                                  <button onClick={() => deleteMessage(msg.id)}
                                    className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Timestamp */}
                            {isGroupEnd && (
                              <span className="text-[10px] text-white/20 px-1 select-none">{formatTime(msg.created_date)}</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image preview */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2.5 border-t border-white/5 bg-[#0c0c0c] flex items-center gap-3 flex-shrink-0"
              >
                <div className="relative">
                  <img src={imagePreview.previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                  <button onClick={() => setImagePreview(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/90 rounded-full flex items-center justify-center border border-white/20 hover:bg-red-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div>
                  <p className="text-xs text-white/70 font-medium">{imagePreview.file ? "Image attached" : "From your gallery"}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{imagePreview.file ? "Will upload on send" : "Ready to send"}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Bar */}
          <div className="px-3 py-3 border-t border-white/5 bg-[#0c0c0c] flex-shrink-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <div className="flex items-center gap-2">
              {/* Upload from device */}
              <button onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all flex-shrink-0"
                title="Attach image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              {/* Gallery */}
              <button onClick={() => setShowGallery(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all flex-shrink-0"
                title="Send from Gallery"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

              {/* Text Input */}
              <div className="flex-1 min-w-0 relative">
                <input ref={inputRef} value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Message..."
                  className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/50 transition-colors"
                />
              </div>

              {/* Send */}
              <button onClick={handleSend}
                disabled={isSending || (!text.trim() && !imagePreview)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-white disabled:opacity-30 flex-shrink-0 active:scale-95 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-5 text-white/20"
          style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,107,53,0.04) 0%, transparent 60%)" }}
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF6B35]/10 to-[#F72C25]/10 flex items-center justify-center border border-[#FF6B35]/15">
            <MessageSquare className="w-11 h-11 text-[#FF6B35]/40" />
          </div>
          <div className="text-center">
            <p className="font-bold text-white/30 text-base">Your Messages</p>
            <p className="text-sm text-white/20 mt-1">Select a friend to start a conversation</p>
          </div>
          <button onClick={() => setShowAddFriend(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all mt-2"
            style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
          >
            <UserPlus className="w-4 h-4" /> Find Friends
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showGallery && (
          <GalleryPicker currentUser={user} onSelect={handleGallerySelect} onClose={() => setShowGallery(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddFriend && (
          <AddFriendModal
            user={user}
            allUsers={allUsers}
            allFriendRecords={allFriendRecords}
            onSendRequest={sendFriendRequest}
            onAcceptRequest={acceptRequest}
            onClose={() => setShowAddFriend(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}