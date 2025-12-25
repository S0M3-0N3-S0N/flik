import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Sparkles, Image, Wand2, Settings, Sun, Moon, User, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { translations } from "@/components/translations";

export const LanguageContext = React.createContext();

export default function Layout({ children, currentPageName }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'en');

  const t = (key) => translations[language]?.[key] || translations['en'][key] || key;

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
    <div className={`min-h-screen bg-[#0A0A0A] text-white transition-all duration-300 ${!isDarkMode ? 'light-mode-theme' : ''}`}>
      <style>{`
        .light-mode-theme {
          filter: invert(1) hue-rotate(180deg);
        }
        .light-mode-theme img, 
        .light-mode-theme video,
        .light-mode-theme canvas,
        .light-mode-theme [style*="background-image"],
        .light-mode-theme .no-invert {
          filter: invert(1) hue-rotate(180deg);
        }
        
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
          background: var(--gradient-primary) !important;
          color: white !important;
          border: none !important;
          transition: all 0.3s ease;
        }

        .btn-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(255, 107, 53, 0.4);
          opacity: 0.9;
        }

        button, .button {
          color: white;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
              {t("nav.photo_studio")}
            </Link>

            <Link 
              to={createPageUrl("Generate")} 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPageName === "Generate" ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              {t("nav.imagine_ai")}
              </Link>
            <Link 
              to={createPageUrl("Gallery")} 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPageName === "Gallery" ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {t("nav.my_creations")}
            </Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link 
              to={createPageUrl("Profile")}
              className={`hidden md:flex p-2 rounded-full transition-colors border border-white/5 ${
                currentPageName === "Profile" ? "bg-white/20 text-white" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
              title="My Profile"
            >
              <User className="w-5 h-5" />
            </Link>

            <button
              onClick={toggleTheme}
              className="group relative p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 overflow-hidden"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <div className="relative z-10">
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-white transition-transform duration-500 group-hover:rotate-90" />
                ) : (
                  <Moon className="w-5 h-5 text-white transition-transform duration-500 group-hover:-rotate-12" />
                )}
              </div>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 bg-[#0A0A0A]/95 backdrop-blur-xl overflow-hidden"
            >
              <nav className="flex flex-col p-4 gap-2">
                <Link 
                  to={createPageUrl("Editor")} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    currentPageName === "Editor" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Image className="w-5 h-5" />
                  {t("nav.photo_studio")}
                </Link>

                <Link 
                  to={createPageUrl("Generate")} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    currentPageName === "Generate" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Wand2 className="w-5 h-5" />
                  {t("nav.imagine_ai")}
                </Link>

                <Link 
                  to={createPageUrl("Gallery")} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    currentPageName === "Gallery" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  {t("nav.my_creations")}
                </Link>

                <Link 
                  to={createPageUrl("Profile")} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    currentPageName === "Profile" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <User className="w-5 h-5" />
                  {t("nav.profile")}
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
    </LanguageContext.Provider>
  );
}