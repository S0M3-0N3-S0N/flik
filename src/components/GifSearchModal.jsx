import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export default function GifSearchModal({ onSelectGif, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('searchGiphy', {
        searchTerm: searchTerm.trim()
      });
      setGifs(response.data.gifs || []);
    } catch (error) {
      toast.error("Failed to search GIFs");
      console.error(error);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Search GIFs</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="p-6 border-b border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search GIFs..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6B35]/50"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!searchTerm.trim() || isLoading}
              className="btn-gradient px-4"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>

        {/* GIFs Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {gifs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/50">
              {searchTerm ? "No GIFs found" : "Search for GIFs to get started"}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    onSelectGif(gif.url);
                    onClose();
                  }}
                  className="group relative rounded-lg overflow-hidden border border-white/10 hover:border-[#FF6B35]/50 transition-all"
                  title={gif.title}
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    className="w-full h-32 object-cover group-hover:opacity-75 transition-opacity"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}