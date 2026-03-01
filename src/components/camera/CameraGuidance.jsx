import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-2xl px-4 py-2 max-w-xs"
        >
          <Lightbulb className="w-4 h-4 text-[#FFB800] flex-shrink-0" />
          <p className="text-white text-sm font-medium">{guidance}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}