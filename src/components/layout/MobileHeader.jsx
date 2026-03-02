import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

const ROOT_PAGES = ['Editor', 'Generate', 'Profile'];

export default function MobileHeader({ currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPage = ROOT_PAGES.includes(currentPageName);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to Editor if no history
      navigate(createPageUrl("Editor"));
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5 backdrop-blur-xl ${
        currentPageName === 'Camera' ? 'hidden' : 'md:hidden'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 h-14">
        {isRootPage ? (
          <div className="gradient-text font-bold text-lg tracking-wider">FLIK</div>
        ) : (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors active:scale-95"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1" />
      </div>
    </div>
  );
}