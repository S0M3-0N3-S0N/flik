import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Loader2, Search, Flame, Sparkles, Zap, Heart, Gift, AlertCircle, Smile, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

const POPULAR_SEARCHES = [
  { icon: Flame, label: "fire" },
  { icon: Smile, label: "laugh" },
  { icon: Heart, label: "love" },
  { icon: Gift, label: "celebrate" },
  { icon: AlertCircle, label: "shock" },
  { icon: Zap, label: "energy" },
  { icon: Smile, label: "cool" },
  { icon: ThumbsUp, label: "clap" }
];
const TRENDING_TERMS = ["trending", "viral", "funny", "cute", "amazing"];

export default function GifSearchModal({ onSelectGif, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState([]);
  const [trendingGifs, setTrendingGifs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTrending, setShowTrending] = useState(true);

  useEffect(() => {
    loadTrendingGifs();
  }, []);

  const loadTrendingGifs = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('searchGiphy', {
        searchTerm: "trending"
      });
      setTrendingGifs(response.data.gifs?.slice(0, 8) || []);
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  };

  const handleSearch = async (term = searchTerm) => {
    if (!term.trim()) return;

    setIsLoading(true);
    setShowTrending(false);
    try {
      const response = await base44.functions.invoke('searchGiphy', {
        searchTerm: term.trim()
      });
      setGifs(response.data.gifs || []);
    } catch (error) {
      toast.error("Failed to search GIFs");
      console.error(error);
    }
    setIsLoading(false);
  };

  const handleQuickSearch = (label) => {
    setSearchTerm(label);
    handleSearch(label);
  };

  const handleSelectGif = (gifUrl) => {
    onSelectGif(gifUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-3xl border border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">GIF Library</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search GIFs..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6B35]/70 focus:bg-white/10 transition-all"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!searchTerm.trim() || isLoading}
              className="btn-gradient px-6 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Quick Search Tags */}
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleQuickSearch(label)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-[#FF6B35]/30 border border-white/10 hover:border-[#FF6B35]/50 text-white text-xs font-medium transition-all hover:scale-105"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </form>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showTrending && trendingGifs.length > 0 ? (
            <div className="space-y-6">
              {/* Trending Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-[#FF6B35]" />
                  <h3 className="text-lg font-semibold text-white">Trending Now</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {trendingGifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => handleSelectGif(gif.url)}
                      className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-[#FF6B35]/50 transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#FF6B35]/20"
                      title={gif.title}
                    >
                      <img
                        src={gif.url}
                        alt={gif.title}
                        className="w-full h-40 object-cover group-hover:opacity-75 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                        <span className="text-white text-xs font-medium truncate px-2">{gif.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : gifs.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Results for "{searchTerm}"</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelectGif(gif.url)}
                    className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-[#FF6B35]/50 transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#FF6B35]/20"
                    title={gif.title}
                  >
                    <img
                      src={gif.url}
                      alt={gif.title}
                      className="w-full h-40 object-cover group-hover:opacity-75 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                      <span className="text-white text-xs font-medium truncate px-2">{gif.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white/50">
              {searchTerm ? "No GIFs found, try another search" : "Browse trending or search for GIFs"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}