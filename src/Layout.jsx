import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Sparkles, Image, Wand2, Video, Grid3x3 } from "lucide-react";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const isEditor = ["Editor", "VideoEditor"].includes(currentPageName);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#FF6B35]/30">
      <style>{`
        :root {
          --primary: #FF6B35;
          --gradient-primary: linear-gradient(135deg, #FF6B35 0%, #F72C25 100%);
        }
        
        .gradient-text {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .btn-gradient {
          background: var(--gradient-primary);
          transition: all 0.2s ease;
        }
        
        .btn-gradient:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        /* Scrollbar Polish */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
      
      {/* Header - Conditional based on page type */}
      {!isEditor && (
        <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to={createPageUrl("Editor")} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB800] flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">FLIK</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
              {[
                { name: 'Editor', icon: Image, path: 'Editor' },
                { name: 'Video', icon: Video, path: 'VideoEditor' },
                { name: 'Generate', icon: Wand2, path: 'Generate' },
                { name: 'Gallery', icon: Grid3x3, path: 'Gallery' },
              ].map((item) => (
                <Link 
                  key={item.name}
                  to={createPageUrl(item.path)} 
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                    currentPageName === item.path 
                      ? "bg-white text-black shadow-sm" 
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
            
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 ring-2 ring-black" />
            </div>
          </div>
        </header>
      )}
      
      {/* Main Content */}
      <main className={cn(
        "min-h-[calc(100vh-64px)]",
        isEditor ? "h-screen overflow-hidden" : "pt-8"
      )}>
        {children}
      </main>
      
      <KeyboardShortcuts />
    </div>
  );
}