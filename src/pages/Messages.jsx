import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, ArrowLeft, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.User.list().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedUser || !user) return;
    loadMessages();
    const unsub = base44.entities.Message.subscribe((event) => {
      if (
        (event.data?.sender_email === selectedUser.email && event.data?.recipient_email === user.email) ||
        (event.data?.sender_email === user.email && event.data?.recipient_email === selectedUser.email)
      ) {
        setMessages((prev) => {
          if (event.type === "create") return [...prev, event.data];
          if (event.type === "update") return prev.map((m) => (m.id === event.id ? event.data : m));
          if (event.type === "delete") return prev.filter((m) => m.id !== event.id);
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
    reader.onload = (ev) => setImagePreview(ev.target.result);
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
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const otherUsers = users.filter((u) => u.email !== user?.email);

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Sidebar: user list */}
      <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-white/5 bg-[#0f0f0f]`}>
        <div className="px-4 py-4 border-b border-white/5">
          <h1 className="text-lg font-bold gradient-text">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {otherUsers.length === 0 && (
            <p className="text-white/30 text-sm text-center py-8">No users found</p>
          )}
          {otherUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                selectedUser?.id === u.id ? "bg-white/5 border-r-2 border-[#FF6B35]" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden">
                {u.profile_picture ? (
                  <img src={u.profile_picture} alt={u.full_name} className="w-full h-full object-cover" />
                ) : (
                  u.full_name?.charAt(0).toUpperCase() || "?"
                )}
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{u.full_name || u.email}</p>
                <p className="text-xs text-white/40 truncate">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      {selectedUser ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0f0f0f]">
            <button onClick={() => setSelectedUser(null)} className="md:hidden text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold text-xs overflow-hidden flex-shrink-0">
              {selectedUser.profile_picture ? (
                <img src={selectedUser.profile_picture} alt={selectedUser.full_name} className="w-full h-full object-cover" />
              ) : (
                selectedUser.full_name?.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{selectedUser.full_name || selectedUser.email}</p>
              <p className="text-xs text-white/40">{selectedUser.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => {
              const isMe = msg.sender_email === user?.email;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMe ? "bg-gradient-to-br from-[#FF6B35] to-[#F72C25] text-white" : "bg-white/8 text-white/90 border border-white/5"}`}>
                    {msg.image_url && (
                      <img src={msg.image_url} alt="sent" className="rounded-xl mb-1 max-w-full max-h-64 object-cover" />
                    )}
                    {msg.content?.trim() && msg.content !== " " && (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${isMe ? "text-white/70" : "text-white/30"}`}>
                      {new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="px-4 pb-2 flex items-center gap-2">
              <div className="relative">
                <img src={imagePreview} alt="preview" className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/20"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors flex-shrink-0">
              <ImageIcon className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Message..."
              className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF6B35]/40 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isSending || (!text.trim() && !imageFile)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#FF6B35,#F72C25)" }}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-white/20 text-sm">
          Select a conversation
        </div>
      )}
    </div>
  );
}