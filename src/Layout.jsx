import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Image, Wand2, Settings, Sun, Moon, User, Menu, X, ArrowLeft, Video, Camera, Globe } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { translations } from "@/components/translations";
import { FlikProvider, useFlik } from "@/components/FlikContext";
import FlikChat from "@/components/FlikChat";
import FlikChatErrorBoundary from "@/components/FlikChatErrorBoundary";
import MobileHeader from "@/components/layout/MobileHeader";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import { base44 } from "@/api/base44Client";

export const LanguageContext = React.createContext();

function LayoutContent({ children, currentPageName }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    // Detect system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'en');
  const [user, setUser] = useState(null);
  const { isOpen, setIsOpen, messages } = useFlik();
  const [flikPosition, setFlikPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('flik_button_position');
      return saved ? JSON.parse(saved) : { bottom: 24, right: 24 };
    } catch {
      return { bottom: 24, right: 24 };
    }
  });
  const [isDraggingFlik, setIsDraggingFlik] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showMobileNav, setShowMobileNav] = useState(true);
  const [showDesktopNav, setShowDesktopNav] = useState(true);
  const mobileNavTimeoutRef = useRef(null);
  const desktopNavTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const t = (key) => translations[language]?.[key] || translations['en'][key] || key;

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const isChildRoute = !['Editor', 'Generate', 'Profile'].includes(currentPageName);

  // Auto-hide desktop nav after 3 seconds of inactivity
  useEffect(() => {
    if (currentPageName === 'Camera') return;
    
    const handleActivity = () => {
      setShowDesktopNav(true);
      if (desktopNavTimeoutRef.current) clearTimeout(desktopNavTimeoutRef.current);
      desktopNavTimeoutRef.current = setTimeout(() => setShowDesktopNav(false), 3000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Start initial timer
    desktopNavTimeoutRef.current = setTimeout(() => setShowDesktopNav(false), 3000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      if (desktopNavTimeoutRef.current) clearTimeout(desktopNavTimeoutRef.current);
    };
  }, [currentPageName]);

  // Auto-hide mobile nav after 3 seconds of inactivity
  useEffect(() => {
    if (currentPageName === 'Camera') return;
    
    const handleActivity = () => {
      setShowMobileNav(true);
      if (mobileNavTimeoutRef.current) clearTimeout(mobileNavTimeoutRef.current);
      mobileNavTimeoutRef.current = setTimeout(() => setShowMobileNav(false), 3000);
    };

    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('touchmove', handleActivity);

    // Start initial timer
    mobileNavTimeoutRef.current = setTimeout(() => setShowMobileNav(false), 3000);

    return () => {
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('touchmove', handleActivity);
      if (mobileNavTimeoutRef.current) clearTimeout(mobileNavTimeoutRef.current);
    };
  }, [currentPageName]);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  useEffect(() => {
    let isMounted = true;
    base44.auth.me()
      .then(u => isMounted && setUser(u))
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Global keyboard shortcut for FLIK
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save FLIK position
  useEffect(() => {
    localStorage.setItem('flik_button_position', JSON.stringify(flikPosition));
  }, [flikPosition]);

  const handleFlikDragStart = (e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top
    });
    setIsDraggingFlik(true);
  };

  const handleFlikDrag = (e) => {
    if (!isDraggingFlik) return;
    const clientX = e.touches?.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches?.length > 0 ? e.touches[0].clientY : e.clientY;
    
    const newRight = window.innerWidth - clientX - dragOffset.x;
    const newBottom = window.innerHeight - clientY - dragOffset.y;
    
    setFlikPosition({
      right: Math.max(16, Math.min(window.innerWidth - 80, newRight)),
      bottom: Math.max(16, Math.min(window.innerHeight - 80, newBottom))
    });
  };

  const handleFlikDragEnd = () => {
    setIsDraggingFlik(false);
  };

  useEffect(() => {
    if (isDraggingFlik) {
      window.addEventListener('mousemove', handleFlikDrag);
      window.addEventListener('mouseup', handleFlikDragEnd);
      window.addEventListener('touchmove', handleFlikDrag);
      window.addEventListener('touchend', handleFlikDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleFlikDrag);
        window.removeEventListener('mouseup', handleFlikDragEnd);
        window.removeEventListener('touchmove', handleFlikDrag);
        window.removeEventListener('touchend', handleFlikDragEnd);
      };
    }
  }, [isDraggingFlik, dragOffset]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div className={`min-h-screen bg-[#0A0A0A] text-white transition-all duration-300 overflow-x-hidden ${!isDarkMode ? 'light-mode-theme' : ''}`}>
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

        {/* Mobile Header */}
        <MobileHeader currentPageName={currentPageName} />

        {/* Top Desktop Navigation */}
        <nav 
          className={`fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5 backdrop-blur-xl transition-all duration-300 ${currentPageName === 'Camera' ? 'hidden' : 'hidden md:flex'} ${
            showDesktopNav ? 'translate-y-0' : '-translate-y-full'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="w-full flex items-center justify-center px-8 py-4 relative">
            <div className="absolute left-8 gradient-text font-bold text-lg tracking-wider">FLIK</div>
            
            <div className="flex items-center gap-8">
              <button
                onClick={() => navigate(currentPageName === "Editor" ? window.scrollTo({ top: 0, behavior: 'smooth' }) : createPageUrl("Editor"))}
                className={`flex items-center gap-2 transition-all ${
                  currentPageName === "Editor" 
                    ? "text-white" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Image className="w-5 h-5" />
                <span className="text-sm font-medium">Photo Studio</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate(createPageUrl("Discover"))}
                  className={`flex items-center gap-2 transition-all ${
                    currentPageName === "Discover" 
                      ? "text-white" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-sm font-medium">Discover</span>
                </button>
              )}



              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate(createPageUrl("Camera"))}
                  className={`flex items-center gap-2 transition-all ${
                    currentPageName === "Camera" 
                      ? "text-white" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Video className="w-5 h-5" />
                  <span className="text-sm font-medium">Camera</span>
                </button>
              )}

              <button
                onClick={() => navigate(currentPageName === "Generate" ? window.scrollTo({ top: 0, behavior: 'smooth' }) : createPageUrl("Generate"))}
                className={`flex items-center gap-2 transition-all ${
                  currentPageName === "Generate" 
                    ? "text-white" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Wand2 className="w-5 h-5" />
                <span className="text-sm font-medium">Imagine AI</span>
              </button>
            </div>

            <button
              onClick={() => navigate(currentPageName === "Profile" ? window.scrollTo({ top: 0, behavior: 'smooth' }) : createPageUrl("Profile"))}
              className="flex items-center gap-3 transition-all group absolute right-8"
            >
              <div className={`w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold text-xs border ${
                currentPageName === "Profile" ? "border-[#FF6B35]" : "border-white/10 group-hover:border-white/20"
              }`}>
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />
                )}
              </div>
            </button>
          </div>
        </nav>

        
        {/* Main Content */}
        <main className="pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation Bar - Mobile Only */}
        {currentPageName !== "Camera" && currentPageName !== "WorldChat" && (
          <nav 
            className={`md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/5 backdrop-blur-xl flex items-center justify-around px-3 py-2 gap-1 [body[data-modal-open]_&]:hidden transition-all duration-300 ${
              showMobileNav ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)' }}
            onMouseEnter={() => {
              setShowMobileNav(true);
              if (mobileNavTimeoutRef.current) clearTimeout(mobileNavTimeoutRef.current);
            }}
            onTouchStart={() => {
              setShowMobileNav(true);
              if (mobileNavTimeoutRef.current) clearTimeout(mobileNavTimeoutRef.current);
            }}
          >
              <button
                onClick={(e) => {
                  if (currentPageName === "Editor") {
                    if (isChildRoute) {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  } else {
                    navigate(createPageUrl("Editor"));
                  }
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-h-[44px] flex-1 ${
                  currentPageName === "Editor" 
                    ? "text-[#FF6B35] bg-[#FF6B35]/10" 
                    : "text-white/60"
                }`}
              >
                <Image className="w-5 h-5" />
                <span className="text-[9px] font-medium">Editor</span>
              </button>

              <button
                onClick={(e) => {
                  if (currentPageName === "Generate") {
                    if (isChildRoute) {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  } else {
                    navigate(createPageUrl("Generate"));
                  }
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-h-[44px] flex-1 ${
                  currentPageName === "Generate" 
                    ? "text-[#FF6B35] bg-[#FF6B35]/10" 
                    : "text-white/60"
                }`}
              >
                <Wand2 className="w-5 h-5" />
                <span className="text-[9px] font-medium">Generate</span>
              </button>



              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate(createPageUrl("Camera"))}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-h-[44px] flex-1 ${
                    currentPageName === "Camera"
                      ? "text-[#FF6B35] bg-[#FF6B35]/10"
                      : "text-white/60"
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-medium">Camera</span>
                </button>
              )}

              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate(createPageUrl("Discover"))}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-h-[44px] flex-1 ${
                    currentPageName === "Discover"
                      ? "text-[#FF6B35] bg-[#FF6B35]/10"
                      : "text-white/60"
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-[9px] font-medium">Discover</span>
                </button>
              )}

              <button
                onClick={() => setIsOpen(true)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-h-[44px] flex-1 ${
                  isOpen 
                    ? "text-[#FF6B35] bg-[#FF6B35]/10" 
                    : "text-white/60"
                }`}
              >
                <Sparkles className="w-5 h-5" />
                <span className="text-[9px] font-medium">FLIK</span>
              </button>

              <button
                onClick={(e) => {
                  if (currentPageName === "Profile") {
                    if (isChildRoute) {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  } else {
                    navigate(createPageUrl("Profile"));
                  }
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-h-[44px] flex-1 ${
                  currentPageName === "Profile" 
                    ? "text-[#FF6B35] bg-[#FF6B35]/10" 
                    : "text-white/60"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#F72C25] flex items-center justify-center text-white font-semibold text-xs border ${
                  currentPageName === "Profile" ? "border-[#FF6B35]" : "border-white/10"
                }`}>
                  {user?.profile_picture ? (
                    <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    user?.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[10px] font-medium"></span>
              </button>
            </nav>
        )}



        {/* Global FLIK Button - Draggable (Desktop Only) */}
        <motion.button
          onClick={(e) => {
            if (!isDraggingFlik) setIsOpen(true);
          }}
          onMouseDown={handleFlikDragStart}
          onTouchStart={handleFlikDragStart}
          style={{
            bottom: `calc(${flikPosition.bottom}px + env(safe-area-inset-bottom))`,
            right: `${flikPosition.right}px`,
            touchAction: 'none'
          }}
          className={`hidden md:block fixed z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#FF6B35] via-[#F72C25] to-[#FFB800] p-[2px] shadow-2xl shadow-[#FF6B35]/40 transition-shadow duration-300 ${
            isDraggingFlik ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-110'
          }`}
          whileHover={!isDraggingFlik ? { scale: 1.1 } : {}}
          whileTap={!isDraggingFlik ? { scale: 0.95 } : {}}
        >
          <div className="w-full h-full rounded-[14px] bg-[#0a0a0a] flex items-center justify-center overflow-hidden relative">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69467e23e779b599fb62c857/d58a91e16_IMG_6684.jpeg" 
              alt="Chat with FLIK" 
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
        </motion.button>

        {/* FLIK Chat Panel */}
        <FlikChatErrorBoundary>
          <FlikChat />
        </FlikChatErrorBoundary>
      </div>
    </LanguageContext.Provider>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ErrorBoundaryWrapper>
      <FlikProvider>
        <LayoutContent children={children} currentPageName={currentPageName} />
      </FlikProvider>
    </ErrorBoundaryWrapper>
  );
}