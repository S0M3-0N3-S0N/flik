import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, Globe } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DiscoverCard from "@/components/discover/DiscoverCard";
import DiscoverModal from "@/components/discover/DiscoverModal";

export default function Discover() {
  const [selectedCreation, setSelectedCreation] = useState(null);

  useEffect(() => {
    if (selectedCreation) {
      document.body.setAttribute("data-modal-open", "true");
    } else {
      document.body.removeAttribute("data-modal-open");
    }
    return () => document.body.removeAttribute("data-modal-open");
  }, [selectedCreation]);
  const [likeCounts, setLikeCounts] = useState({});
  const [likedByMe, setLikedByMe] = useState({});

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: creations = [], isLoading } = useQuery({
    queryKey: ["discoverCreations"],
    queryFn: () =>
      base44.entities.Creation.filter(
        { published_to_discover: true },
        "-created_date",
        100
      ),
    staleTime: 30000,
  });

  // Load like counts
  useEffect(() => {
    if (!creations.length) return;
    base44.entities.Like.list("-created_date", 500).then((likes) => {
      const counts = {};
      const myLikes = {};
      (likes || []).forEach((like) => {
        counts[like.creation_id] = (counts[like.creation_id] || 0) + 1;
        if (like.user_email === user?.email) myLikes[like.creation_id] = true;
      });
      setLikeCounts(counts);
      setLikedByMe(myLikes);
    });
  }, [creations, user?.email]);

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
            Created by the community,{" "}
            <span className="gradient-text">powered by imagination</span>
          </h1>
          <p className="text-white/50 text-base sm:text-lg max-w-xl mx-auto">
            Explore what creators are making with FLIK
          </p>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
          </div>
        ) : creations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center mx-auto mb-6 border border-[#FF6B35]/20">
              <Sparkles className="w-10 h-10 text-[#FF6B35]" />
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">
              No creations yet
            </h3>
            <p className="text-white/40 max-w-sm mx-auto">
              Be the first to publish your creations to the community
            </p>
          </motion.div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 sm:gap-4">
            {creations.map((creation, index) => (
              <div key={creation.id} className="mb-3 sm:mb-4 break-inside-avoid">
                <DiscoverCard
                  creation={creation}
                  likeCount={likeCounts[creation.id] || 0}
                  isLiked={!!likedByMe[creation.id]}
                  onClick={() => setSelectedCreation(creation)}
                  index={index}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedCreation && (
        <DiscoverModal
          creation={selectedCreation}
          creations={creations}
          onClose={() => setSelectedCreation(null)}
          currentUser={user}
        />
      )}
    </div>
  );
}