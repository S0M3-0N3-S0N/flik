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
      className={`fixed top-0 left-0 right-0 z-40 glass-card border-b border-white/5 backdrop-blur-xl h-14 flex items-center px-4 gap-3 ${
        currentPageName === 'Camera' ? 'hidden' : 'md:hidden'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {isRootPage ? (
        <h1 className="gradient-text text-lg font-bold">FLIK</h1>
      ) : (
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}