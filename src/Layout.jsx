import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Sparkles, Image, Wand2, Settings } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <style>{`
        :root {
          --gradient-primary: linear-gradient(135deg, #FF6B35 0%, #F72C25 50%, #FFB800 100%);
          --gradient-secondary: linear-gradient(135deg, #FFB800 0%, #FF6B35 100%);
          --gradient-accent: linear-gradient(135deg, #F72C25 0%, #FF6B35 50%, #FFB800 100%);
        }
        
        .gradient-text {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .gradient-border {
          position: relative;
          background: #141414;
          border-radius: 16px;
        }
        
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: 16px;
          background: var(--gradient-primary);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
        
        .glow-effect {
          box-shadow: 0 0 60px rgba(255, 107, 53, 0.15), 0 0 100px rgba(247, 44, 37, 0.1);
        }
        
        .btn-gradient {
          background: var(--gradient-primary);
          transition: all 0.3s ease;
        }
        
        .btn-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(255, 107, 53, 0.4);
        }
        
        .glass-card {
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={createPageUrl("Editor")} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">FLIK</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to={createPageUrl("Editor")} 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPageName === "Editor" ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              <Image className="w-4 h-4" />
              Editor
            </Link>
            <Link 
              to={createPageUrl("VideoEditor")} 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPageName === "VideoEditor" ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Video
            </Link>
            <Link 
              to={createPageUrl("Generate")} 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPageName === "Generate" ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              Generate
            </Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs text-white/40 px-3 py-1 rounded-full border border-white/10">
              AI-Powered
            </span>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}