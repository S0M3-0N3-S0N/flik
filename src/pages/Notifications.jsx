import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Heart, MessageCircle, UserPlus, Mail, Trash2, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import { createPageUrl } from "../utils";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: () => {
      if (!currentUser?.email) return [];
      return base44.entities.Notification.filter({ recipient_email: currentUser.email }, '-created_date', 100);
    },
    enabled: !!currentUser?.email,
  });

  // Real-time subscription
  React.useEffect(() => {
    if (!currentUser?.email) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data?.recipient_email === currentUser.email) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
    return unsubscribe;
  }, [currentUser?.email, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, is_read }) => base44.entities.Notification.update(id, { is_read }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.is_read);
      for (const notif of unread) {
        await base44.entities.Notification.update(notif.id, { is_read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const filteredNotifications = notifications.filter(
    (n) => filterType === "all" || n.type === filterType
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-400" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-green-400" />;
      case "message":
        return <Mail className="w-5 h-5 text-yellow-400" />;
      default:
        return <Mail className="w-5 h-5 text-white/50" />;
    }
  };

  if (!currentUser) return null;

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col overflow-hidden bg-[#0A0A0A] px-4 py-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 gap-1">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white"
            >
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger
              value="like"
              className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300"
            >
              Likes
            </TabsTrigger>
            <TabsTrigger
              value="comment"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
            >
              Comments
            </TabsTrigger>
            <TabsTrigger
              value="follow"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-300"
            >
              Follows
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <div className="space-y-2">
          <AnimatePresence>
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-white/40"
              >
                <p>No {filterType !== "all" ? filterType : ""} notifications yet</p>
              </motion.div>
            ) : (
              filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 rounded-xl border transition-all ${
                    notif.is_read
                      ? "bg-white/5 border-white/5 hover:bg-white/10"
                      : "bg-[#FF6B35]/10 border-[#FF6B35]/20 hover:bg-[#FF6B35]/15"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notif.is_read ? "text-white/60" : "text-white font-medium"}`}>
                        {notif.content}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {new Date(notif.created_date).toLocaleDateString()} at{" "}
                        {new Date(notif.created_date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          markAsReadMutation.mutate({ id: notif.id, is_read: !notif.is_read })
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          notif.is_read
                            ? "text-white/40 hover:text-white/60"
                            : "text-[#FF6B35] hover:text-[#FF6B35]/80"
                        }`}
                        title={notif.is_read ? "Mark as unread" : "Mark as read"}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteNotificationMutation.mutate(notif.id)}
                        className="p-2 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}