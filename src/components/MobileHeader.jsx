import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function MobileHeader({ isChildRoute }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-12 glass-card border-b border-white/5 flex items-center px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {isChildRoute ? (
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      ) : (
        <div className="gradient-text font-bold text-lg tracking-wider">FLIK</div>
      )}
    </div>
  );
}