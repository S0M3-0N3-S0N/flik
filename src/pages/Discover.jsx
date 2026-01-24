import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, MoreVertical, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function DiscoverPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: creations = [], isLoading } = useQuery({
    queryKey: ["creations"],
    queryFn: () => base44.entities.Creation.list("-created_date", 50),
  });

  const { data: allLikes = [] } = useQuery({
    queryKey: ["likes"],
    queryFn: () => base44.entities.Like.list(),
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ["comments"],
    queryFn: () => base44.entities.Comment.list("-created_date"),
  });

  const likeMutation = useMutation({
    mutationFn: async (creationId) => {
      const existingLike = allLikes.find(
        (l) => l.creation_id === creationId && l.user_email === user?.email
      );
      if (existingLike) {
        await base44.entities.Like.delete(existingLike.id);
      } else {
        await base44.entities.Like.create({
          creation_id: creationId,
          user_email: user?.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["likes"]);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (data) => base44.entities.Comment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["comments"]);
    },
  });

  const deleteCreationMutation = useMutation({
    mutationFn: (id) => base44.entities.Creation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["creations"]);
      toast.success("Creation deleted");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["comments"]);
      toast.success("Comment deleted");
    },
  });

  const getLikesCount = (creationId) =>
    allLikes.filter((l) => l.creation_id === creationId).length;

  const isLikedByUser = (creationId) =>
    allLikes.some(
      (l) => l.creation_id === creationId && l.user_email === user?.email
    );

  const getComments = (creationId) =>
    allComments.filter((c) => c.creation_id === creationId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold gradient-text mb-8 text-center">
          Discover
        </h1>

        <div className="space-y-8">
          {creations.map((creation) => (
            <CreationCard
              key={creation.id}
              creation={creation}
              user={user}
              likesCount={getLikesCount(creation.id)}
              isLiked={isLikedByUser(creation.id)}
              comments={getComments(creation.id)}
              onLike={() => likeMutation.mutate(creation.id)}
              onComment={(text) =>
                commentMutation.mutate({
                  creation_id: creation.id,
                  text,
                  user_name: user?.full_name || "Anonymous",
                  user_email: user?.email,
                })
              }
              onDelete={() => deleteCreationMutation.mutate(creation.id)}
              onDeleteComment={(commentId) =>
                deleteCommentMutation.mutate(commentId)
              }
            />
          ))}

          {creations.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/40">No creations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreationCard({
  creation,
  user,
  likesCount,
  isLiked,
  comments,
  onLike,
  onComment,
  onDelete,
  onDeleteComment,
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const handleComment = () => {
    if (!commentText.trim()) return;
    onComment(commentText);
    setCommentText("");
  };

  const isOwner = creation.created_by === user?.email;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold">
            {creation.created_by?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">
              {creation.created_by?.split("@")[0]}
            </p>
            <p className="text-xs text-white/40">
              {new Date(creation.created_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-white/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1a1a] border-white/10">
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Image */}
      <div className="relative aspect-square bg-black">
        <img
          src={creation.url}
          alt={creation.title || "Creation"}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onLike}
            className="flex items-center gap-2 group"
            disabled={!user}
          >
            <Heart
              className={`w-6 h-6 transition-all ${
                isLiked
                  ? "fill-red-500 text-red-500"
                  : "text-white/60 group-hover:text-white"
              }`}
            />
            <span className="text-white/60">{likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 group"
          >
            <MessageCircle className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
            <span className="text-white/60">{comments.length}</span>
          </button>
        </div>

        {/* Title & Prompt */}
        {creation.title && (
          <p className="text-white font-medium">{creation.title}</p>
        )}
        {creation.prompt && (
          <p className="text-white/60 text-sm">{creation.prompt}</p>
        )}

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-3 border-t border-white/5"
            >
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2 group">
                  <div className="flex-1">
                    <span className="text-white font-medium text-sm mr-2">
                      {comment.user_name}
                    </span>
                    <span className="text-white/80 text-sm">
                      {comment.text}
                    </span>
                  </div>
                  {comment.user_email === user?.email && (
                    <button
                      onClick={() => onDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-white/40 hover:text-red-400" />
                    </button>
                  )}
                </div>
              ))}

              {user && (
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button
                    onClick={handleComment}
                    size="icon"
                    className="btn-gradient"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {!user && (
                <p className="text-white/40 text-sm text-center">
                  Sign in to comment
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}