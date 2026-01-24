import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp, Calendar } from "lucide-react";

export default function ProfileStats({ user, stats }) {
  const [showStatsExpanded, setShowStatsExpanded] = useState(() => {
    return localStorage.getItem("profile_stats_expanded") === "true";
  });

  useEffect(() => {
    localStorage.setItem("profile_stats_expanded", showStatsExpanded.toString());
  }, [showStatsExpanded]);

  return (
    <div className="group p-4 sm:p-5 bg-white/5 hover:bg-white/[0.07] rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF6B35]" />
          </div>
          <span className="text-white/60 text-xs sm:text-sm font-medium">Statistics</span>
        </div>
        <button
          onClick={() => setShowStatsExpanded(!showStatsExpanded)}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle statistics"
          aria-expanded={showStatsExpanded}
        >
          <ChevronDown
            className={`w-4 h-4 text-white/40 transition-transform ${
              showStatsExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
      <div className="space-y-2">
        <p className="text-2xl sm:text-3xl font-bold gradient-text">{stats.total}</p>
        <AnimatePresence>
          {showStatsExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-white/50 space-y-1 pt-2 border-t border-white/10"
            >
              <div className="flex justify-between">
                <span>Today:</span>
                <span className="text-white/70">{stats.today}</span>
              </div>
              <div className="flex justify-between">
                <span>This Week:</span>
                <span className="text-white/70">{stats.thisWeek}</span>
              </div>
              <div className="flex justify-between">
                <span>This Month:</span>
                <span className="text-white/70">{stats.thisMonth}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}