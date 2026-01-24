import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Trash2, MoreVertical } from "lucide-react";
import { toast } from "react-hot-toast";
import { createPageUrl } from "../utils";
import { useNavigate } from "react-router-dom";

export default function FollowFeed() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: follows = [] } = useQuery({
    queryKey: ["follows"],
    queryFn: () => base44.entities.Follow.list(),
  });

  const { data: creations = [] } = useQuery({
    queryKey: ["creations"],
    queryFn: () => base44.entities.Creation.list(),
  });

  const { data: likes = [] } = useQuery({
    queryKey: ["likes"],
    queryFn: () => base44.entities.Like.list(),
  });

  const followedUserEmails = useMemo(
    () => follows
      .filter((f) => f.follower_email === currentUser?.email)
      .map((f) => f.following_email),
    [follows, currentUser?.email]
  );

  const feedCreations = useMemo(
    () => creations
      .filter((c) => followedUserEmails.includes(c.created_by))
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
    [creations, followedUserEmails]
  );

  const likeMutation = useMutation({
    mutationFn: async (creationId) => {
      const existing = await base44.entities.Like.filter({
        creation_id: creationId,
        user_email: currentUser.email,
      });

      if (existing.length > 0) {
        await base44.entities.Like.delete(existing[0].id);
      } else {
        await base44.entities.Like.create({
          creation_id: creationId,
          user_email: currentUser.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Creation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creations"] });
      toast.success("Creation deleted");
    },
  });

  const isLiked = (creationId) =>
    likes.some((l) => l.creation_id === creationId && l.user_email === currentUser?.email);

  const getLikeCount = (creationId) =>
    likes.filter((l) => l.creation_id === creationId).length;

  if (!currentUser) return null;

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto bg-[#0A0A0A] px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Follow Feed</h1>
          <p className="text-white/40">
            {feedCreations.length === 0
              ? "Follow users to see their creations here"
              : `${feedCreations.length} creation${feedCreations.length !== 1 ? "s" : ""} from creators you follow`}
          </p>
        </div>

        <AnimatePresence>
          {feedCreations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-white/40"
            >
              <p className="mb-4">You're not following anyone yet.</p>
              <Button
                onClick={() => navigate(createPageUrl("Discover"))}
                className="btn-gradient text-white"
              >
                Discover Creators
              </Button>
            </motion.div>
          ) : (
            feedCreations.map((creation) => (
              <motion.div
                key={creation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#FF6B35]/30 transition-all"
              >
                {/* Creation Image */}
                {creation.url && (
                  <div className="aspect-video overflow-hidden bg-black">
                    <img
                      src={creation.thumbnail_url || creation.url}
                      alt={creation.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{creation.title || "Untitled"}</h3>
                      <p className="text-xs text-white/40">
                        by {creation.created_by}
                      </p>
                    </div>
                    {creation.created_by === currentUser.email && (
                      <button
                        onClick={() => deleteMutation.mutate(creation.id)}
                        className="text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {creation.prompt && (
                    <p className="text-sm text-white/60">"{creation.prompt}"</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                    <button
                      onClick={() => likeMutation.mutate(creation.id)}
                      className={`flex items-center gap-1 text-sm transition-colors ${
                        isLiked(creation.id)
                          ? "text-red-400"
                          : "text-white/40 hover:text-red-400"
                      }`}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={isLiked(creation.id) ? "currentColor" : "none"}
                      />
                      {getLikeCount(creation.id)}
                    </button>
                    <button className="flex items-center gap-1 text-sm text-white/40 hover:text-blue-400 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      0
                    </button>
                    <button className="flex items-center gap-1 text-sm text-white/40 hover:text-green-400 transition-colors ml-auto">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}