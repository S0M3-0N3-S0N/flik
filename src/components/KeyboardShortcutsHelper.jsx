import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X, Command } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KeyboardShortcutsHelper() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Hardcoded for now to avoid async loading issues in a layout component, 
  // but designed to use the entity structure
  const shortcuts = [
    { section: "General", key: "⌘/Ctrl + Z", description: "Undo Action" },
    { section: "General", key: "⌘/Ctrl + ⇧ + Z", description: "Redo Action" },
    { section: "General", key: "⌘/Ctrl + S", description: "Save / Export" },
    { section: "Video Editor", key: "Space", description: "Play / Pause" },
    { section: "Video Editor", key: "← / →", description: "Seek 5s" },
    { section: "Gallery", key: "⌘/Ctrl + Click", description: "Multi-select" },
    { section: "Generate", key: "⌘/Ctrl + Enter", description: "Generate Image" },
  ];

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full w-10 h-10 bg-[#1a1a1a] border border-white/10 text-white/50 hover:text-white hover:bg-white/10 shadow-lg"
        title="Keyboard Shortcuts (Cmd/Ctrl + /)"
      >
        <Keyboard className="w-5 h-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center">
                    <Command className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                    <p className="text-white/50 text-sm">Boost your workflow</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {['General', 'Video Editor', 'Gallery', 'Generate'].map((section) => (
                  <div key={section}>
                    <h3 className="text-sm font-semibold text-[#FF6B35] uppercase tracking-wider mb-4">
                      {section}
                    </h3>
                    <div className="space-y-3">
                      {shortcuts
                        .filter(s => s.section === section)
                        .map((shortcut, i) => (
                          <div key={i} className="flex items-center justify-between group">
                            <span className="text-white/70 group-hover:text-white transition-colors">
                              {shortcut.description}
                            </span>
                            <kbd className="h-7 px-3 flex items-center rounded-md bg-white/10 border border-white/10 text-xs font-mono text-white/90">
                              {shortcut.key}
                            </kbd>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}