import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function GifSearchModal({ onSelectGif, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef(null);

  const performSearch = async (term) => {
    if (!term.trim()) {
      setGifs([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('searchGiphy', {
        searchTerm: term.trim()
      });
      setGifs(response.data.gifs || []);
    } catch (error) {
      toast.error("Failed to search GIFs");
      setGifs([]);
    }
    setIsLoading(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    performSearch(searchTerm);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-3xl border border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl shadow-[#FF6B35]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FFB800] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Find GIFs</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search trending GIFs..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6B35]/50 focus:bg-white/[0.08] transition-all"
                autoFocus
              />
            </div>
            {isLoading && (
              <div className="flex items-center px-4">
                <Loader2 className="w-5 h-5 text-[#FF6B35] animate-spin" />
              </div>
            )}
          </div>
        </form>

        {/* GIFs Grid */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {isLoading && gifs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/50">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium mb-1">{searchTerm ? "No GIFs found" : "Start searching"}</p>
              <p className="text-xs">{searchTerm ? "Try another search term" : "Type to find GIFs"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    onSelectGif(gif.url);
                    onClose();
                  }}
                  className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-[#FF6B35]/50 transition-all hover:scale-105 cursor-pointer"
                  title={gif.title}
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    className="w-full h-32 object-cover group-hover:brightness-110 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}