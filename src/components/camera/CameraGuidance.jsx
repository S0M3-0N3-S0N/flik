import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CameraGuidance({ videoRef, isActive }) {
  const [guidance, setGuidance] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisIntervalRef = useRef(null);

  const analyzeFrame = async () => {
    if (!isActive || !videoRef?.current || isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.6);

      // Upload the frame temporarily
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageData });

      // Get AI guidance
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a photography guide. Analyze this camera frame and provide ONE specific, actionable tip to help the user take the best photo. Be brief (max 8 words). Focus on practical issues like:
- Lens cleanliness (smudges, dust, fingerprints)
- Lighting conditions
- Camera stability
- Subject positioning
- Focus clarity

If the image looks good, say "Ready to capture!"

Only respond with the tip, nothing else.`,
        file_urls: [file_url],
        add_context_from_internet: false,
      });

      setGuidance(response);
    } catch (err) {
      console.error('Frame analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
      setGuidance(null);
      return;
    }

    // Analyze frame every 2 seconds
    analysisIntervalRef.current = setInterval(analyzeFrame, 2000);

    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [isActive, videoRef]);

  return (
    <AnimatePresence>
      {guidance && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"
        >
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto" />
          
          {/* Liquid glass card */}
          <motion.div
            className="relative mx-4 px-8 py-6 rounded-3xl max-w-sm text-center pointer-events-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(255, 184, 0, 0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(255, 107, 53, 0.3)',
              boxShadow: '0 8px 32px rgba(255, 107, 53, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
            }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Zap className="w-5 h-5 text-[#FF6B35]" />
              </motion.div>
              <h3 className="text-white font-bold text-lg">AI Tip</h3>
            </div>
            <p className="text-white/90 text-base font-medium leading-relaxed">{guidance}</p>
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(255, 107, 53, 0.1), transparent 70%)',
                pointerEvents: 'none'
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}