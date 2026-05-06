import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Check, X, Users, Clock, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function Avatar({ user, size = "sm" }) {
  const dim = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden`}>
      {user?.profile_picture ? (
        <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
      ) : (
        (user?.full_name || user?.email || "?")[0].toUpperCase()
      )}
    </div>
  );
}

export default function FriendsPanel({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("friends"); // friends | requests | search

  const { data: allFriendRecords = [] } = useQuery({
    queryKey: ["friendRecords", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const [sent, received] = await Promise.all([
        base44.entities.Friend.filter({ requester_email: currentUser.email }),
        base44.entities.Friend.filter({ recipient_email: currentUser.email }),
      ]);
      return [...sent, ...received];
    },
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const acceptedFriends = allFriendRecords.filter(r => r.status === "accepted");
  const pendingIncoming = allFriendRecords.filter(
    r => r.status === "pending" && r.recipient_email === currentUser?.email
  );
  const pendingOutgoing = allFriendRecords.filter(
    r => r.status === "pending" && r.requester_email === currentUser?.email
  );

  const getFriendUser = (record) => {
    const friendEmail =
      record.requester_email === currentUser?.email
        ? record.recipient_email
        : record.requester_email;
    return allUsers.find(u => u.email === friendEmail);
  };

  const getRelationship = (targetEmail) => {
    return allFriendRecords.find(
      r =>
        (r.requester_email === currentUser?.email && r.recipient_email === targetEmail) ||
        (r.recipient_email === currentUser?.email && r.requester_email === targetEmail)
    );
  };

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const results = allUsers.filter(
      u =>
        u.email !== currentUser?.email &&
        (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    );
    setSearchResults(results);
  }, [searchQuery, allUsers, currentUser]);

  const sendRequestMutation = useMutation({
    mutationFn: (recipientEmail) =>
      base44.entities.Friend.create({
        requester_email: currentUser.email,
        recipient_email: recipientEmail,
        status: "pending",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRecords"] });
      toast.success("Friend request sent!");
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Friend.update(id, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["friendRecords"] });
      toast.success(vars.status === "accepted" ? "Friend added!" : "Request declined");
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (id) => base44.entities.Friend.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRecords"] });
      toast.success("Friend removed");
    },
  });

  const tabClass = (tab) =>
    `flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
      activeTab === tab
        ? "bg-gradient-to-r from-[#FF6B35] to-[#F72C25] text-white"
        : "text-white/50 hover:text-white"
    }`;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-2xl">
        <button onClick={() => setActiveTab("friends")} className={tabClass("friends")}>
          <span className="flex items-center justify-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            Friends {acceptedFriends.length > 0 && `(${acceptedFriends.length})`}
          </span>
        </button>
        <button onClick={() => setActiveTab("requests")} className={tabClass("requests")}>
          <span className="flex items-center justify-center gap-1 relative">
            <Clock className="w-3.5 h-3.5" />
            Requests
            {pendingIncoming.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF6B35] text-white text-[9px] flex items-center justify-center font-bold">
                {pendingIncoming.length}
              </span>
            )}
          </span>
        </button>
        <button onClick={() => setActiveTab("search")} className={tabClass("search")}>
          <span className="flex items-center justify-center gap-1">
            <UserPlus className="w-3.5 h-3.5" />
            Add
          </span>
        </button>
      </div>

      {/* Friends List */}
      {activeTab === "friends" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="friends"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {acceptedFriends.length === 0 ? (
              <div className="text-center py-10 text-white/30">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No friends yet. Search and add some!</p>
              </div>
            ) : (
              acceptedFriends.map(record => {
                const friend = getFriendUser(record);
                if (!friend) return null;
                return (
                  <div key={record.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                    <Avatar user={friend} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{friend.full_name || friend.email}</p>
                      <p className="text-xs text-white/40 truncate">{friend.email}</p>
                    </div>
                    <button
                      onClick={() => removeFriendMutation.mutate(record.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      title="Remove friend"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Requests */}
      {activeTab === "requests" && (
        <AnimatePresence mode="wait">
          <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {pendingIncoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Incoming</p>
                <div className="space-y-2">
                  {pendingIncoming.map(record => {
                    const requester = allUsers.find(u => u.email === record.requester_email);
                    return (
                      <div key={record.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <Avatar user={requester} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{requester?.full_name || record.requester_email}</p>
                          <p className="text-xs text-white/40">Wants to be friends</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => respondMutation.mutate({ id: record.id, status: "accepted" })}
                            className="w-8 h-8 rounded-xl bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/40 flex items-center justify-center transition-all"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => respondMutation.mutate({ id: record.id, status: "declined" })}
                            className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:bg-red-400/20 hover:text-red-400 flex items-center justify-center transition-all"
                          >
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
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Sent</p>
                <div className="space-y-2">
                  {pendingOutgoing.map(record => {
                    const recipient = allUsers.find(u => u.email === record.recipient_email);
                    return (
                      <div key={record.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <Avatar user={recipient} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{recipient?.full_name || record.recipient_email}</p>
                          <p className="text-xs text-[#FFB800]/70">Pending...</p>
                        </div>
                        <button
                          onClick={() => removeFriendMutation.mutate(record.id)}
                          className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Cancel request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
              <div className="text-center py-10 text-white/30">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No pending requests</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Search / Add */}
      {activeTab === "search" && (
        <AnimatePresence mode="wait">
          <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl h-11 focus:border-[#FF6B35]/40"
              />
            </div>
            <div className="space-y-2">
              {searchResults.length === 0 && searchQuery.trim() && (
                <p className="text-center text-sm text-white/30 py-6">No users found</p>
              )}
              {searchResults.length === 0 && !searchQuery.trim() && (
                <p className="text-center text-sm text-white/30 py-6">Type a name or email to search</p>
              )}
              {searchResults.map(u => {
                const rel = getRelationship(u.email);
                const isAccepted = rel?.status === "accepted";
                const isPendingOut = rel?.status === "pending" && rel?.requester_email === currentUser?.email;
                const isPendingIn = rel?.status === "pending" && rel?.recipient_email === currentUser?.email;
                return (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <Avatar user={u} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-white/40 truncate">{u.email}</p>
                    </div>
                    {isAccepted ? (
                      <span className="text-xs text-[#FF6B35] font-semibold px-2 py-1 rounded-lg bg-[#FF6B35]/10">Friends</span>
                    ) : isPendingOut ? (
                      <span className="text-xs text-[#FFB800]/70 font-semibold px-2 py-1 rounded-lg bg-[#FFB800]/10">Sent</span>
                    ) : isPendingIn ? (
                      <button
                        onClick={() => respondMutation.mutate({ id: rel.id, status: "accepted" })}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35]/40 transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                    ) : (
                      <button
                        onClick={() => sendRequestMutation.mutate(u.email)}
                        disabled={sendRequestMutation.isPending}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-[#FF6B35]/20 hover:text-[#FF6B35] transition-all flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}