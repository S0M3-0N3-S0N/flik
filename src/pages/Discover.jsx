import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Sparkles, UserPlus, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
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
    queryFn: async () => {
      const all = await base44.entities.Creation.list("-created_date", 100);
      return all.filter(c => c.published_to_discover === true);
    },
  });

  const { data: allLikes = [] } = useQuery({
    queryKey: ["likes"],
    queryFn: () => base44.entities.Like.list(),
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ["comments"],
    queryFn: () => base44.entities.Comment.list("-created_date"),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allFollows = [] } = useQuery({
    queryKey: ["follows"],
    queryFn: () => base44.entities.Follow.list(),
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

  const followMutation = useMutation({
    mutationFn: async (creatorEmail) => {
      const existingFollow = allFollows.find(
        (f) => f.follower_email === user?.email && f.following_email === creatorEmail
      );
      if (existingFollow) {
        await base44.entities.Follow.delete(existingFollow.id);
      } else {
        await base44.entities.Follow.create({
          follower_email: user?.email,
          following_email: creatorEmail,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["follows"]);
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

  const getUserByEmail = (email) =>
    allUsers.find((u) => u.email === email);

  const isFollowing = (creatorEmail) =>
    allFollows.some(
      (f) => f.follower_email === user?.email && f.following_email === creatorEmail
    );

  const getFollowerCount = (creatorEmail) =>
    allFollows.filter((f) => f.following_email === creatorEmail).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF6B35]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFB800]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8 overflow-x-hidden">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">
            Discover
          </h1>
          <p className="text-white/50 text-sm md:text-base">
            Explore amazing creations from the FLIK community
          </p>
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {creations.map((creation) => (
            <CreationCard
              key={creation.id}
              creation={creation}
              creator={getUserByEmail(creation.created_by)}
              user={user}
              likesCount={getLikesCount(creation.id)}
              isLiked={isLikedByUser(creation.id)}
              comments={getComments(creation.id)}
              isFollowing={isFollowing(creation.created_by)}
              followerCount={getFollowerCount(creation.created_by)}
              onLike={() => likeMutation.mutate(creation.id)}
              onFollow={() => followMutation.mutate(creation.created_by)}
              onComment={(text) =>
                commentMutation.mutate({
                  creation_id: creation.id,
                  text,
                  user_name: user?.display_name || user?.full_name || "Anonymous",
                  user_email: user?.email,
                })
              }
              onDelete={() => deleteCreationMutation.mutate(creation.id)}
              onDeleteComment={(commentId) =>
                deleteCommentMutation.mutate(commentId)
              }
            />
          ))}
        </div>

        {creations.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-[#FF6B35]" />
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">No public creations yet</h3>
            <p className="text-white/40">Be the first to share your amazing work!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreationCard({
  creation,
  creator,
  user,
  likesCount,
  isLiked,
  comments,
  isFollowing,
  followerCount,
  onLike,
  onFollow,
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="break-inside-avoid mb-4 group"
    >
      <div className="relative bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all">
        {/* Image */}
        <div className="relative">
          <img
            src={creation.url}
            alt={creation.title || "Creation"}
            className="w-full h-auto object-cover"
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
              {/* User info */}
                  <div className="flex items-center gap-3 justify-between">
                    <Link 
                      to={createPageUrl("Profile")}
                      onClick={(e) => {
                        if (creation.created_by) {
                          sessionStorage.setItem('profile_email', creation.created_by);
                        }
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                        {creator?.profile_picture ? (
                          <img src={creator.profile_picture} alt={creator.full_name} className="w-full h-full object-cover" />
                        ) : (
                          creation.created_by?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">
                          {creator?.full_name || creation.created_by?.split("@")[0]}
                        </p>
                        <p className="text-xs text-white/60">
                          {followerCount} follower{followerCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </Link>
                    {!isOwner && user && (
                      <button
                        onClick={onFollow}
                        disabled={!user}
                        className={`ml-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          isFollowing
                            ? 'bg-white/10 text-white hover:bg-white/20'
                            : 'bg-[#FF6B35] text-white hover:bg-[#F72C25]'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Follow
                          </>
                        )}
                      </button>
                    )}
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-white/80" />
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

              {/* Title & Prompt */}
              {(creation.title || creation.prompt) && (
                <div className="space-y-1">
                  {creation.title && (
                    <p className="text-white font-semibold text-sm line-clamp-2">{creation.title}</p>
                  )}
                  {creation.prompt && (
                    <p className="text-white/70 text-xs line-clamp-2">{creation.prompt}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="p-4 space-y-3">
        <div className="flex items-center gap-6">
          <button
            onClick={onLike}
            className="flex items-center gap-2 group"
            disabled={!user}
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                isLiked
                  ? "fill-red-500 text-red-500"
                  : "text-white/60 group-hover:text-red-500 group-hover:scale-110"
              }`}
            />
            <span className="text-white/80 text-sm font-medium">{likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 group"
          >
            <MessageCircle className="w-5 h-5 text-white/60 group-hover:text-[#FF6B35] group-hover:scale-110 transition-all" />
            <span className="text-white/80 text-sm font-medium">{comments.length}</span>
          </button>
        </div>

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
      </div>
    </motion.div>
  );
}