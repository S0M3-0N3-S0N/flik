import { useState } from 'react';
import { base44 } from "@/api/base44Client";

export function useMagicBrush() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processMagicBrush = async ({
    imageRef,
    brushStrokes,
    brushSize,
    magicBrushPrompt,
    magicBrushImages,
    getProcessedImageBlob,
    currentImage,
    adjustments,
    transform,
    selectedFilter,
    setActiveTool
  }) => {
    if (!brushStrokes?.length || !currentImage) return null;
    
    setIsProcessing(true);
    if (setActiveTool) setActiveTool({ label: "Magic Brush" });
    
    try {
      // Bake the current image state
      const blob = await getProcessedImageBlob(currentImage, adjustments, transform, selectedFilter);
      
      // Load the baked image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = URL.createObjectURL(blob);
      await new Promise(r => img.onload = r);

      // HELPER: Draw strokes function
      const drawStrokes = (ctx, color = 'red', composite = 'source-over', sizeMult = 1.0) => {
        if (brushStrokes.length === 0) return;

        brushStrokes.forEach(stroke => {
          const points = stroke.points || stroke;
          if (!points || points.length === 0) return;
          const size = (stroke.size || brushSize) * sizeMult;

          ctx.globalCompositeOperation = composite;
          ctx.strokeStyle = color;
          ctx.fillStyle = color;

          let scaledSize = size;
          if (imageRef.current) {
             const domWidth = imageRef.current.getBoundingClientRect().width;
             const scale = ctx.canvas.width / domWidth;
             scaledSize = size * scale;
          } else {
             scaledSize = size * (ctx.canvas.width / 800);
          }

          ctx.lineWidth = scaledSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (points.length === 1) {
             ctx.beginPath();
             ctx.arc((points[0].x / 100) * ctx.canvas.width, (points[0].y / 100) * ctx.canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
             ctx.fill();
          } else {
             ctx.beginPath();
             ctx.moveTo((points[0].x / 100) * ctx.canvas.width, (points[0].y / 100) * ctx.canvas.height);
             for (let i = 1; i < points.length; i++) {
               ctx.lineTo((points[i].x / 100) * ctx.canvas.width, (points[i].y / 100) * ctx.canvas.height);
             }
             ctx.stroke();
          }
        });
        ctx.globalCompositeOperation = 'source-over';
      };

      // 1. Create RED MASK Canvas (For Vision LLM to see context)
      const redCanvas = document.createElement('canvas');
      redCanvas.width = img.width;
      redCanvas.height = img.height;
      const redCtx = redCanvas.getContext('2d');
      redCtx.drawImage(img, 0, 0);
      drawStrokes(redCtx, `rgba(255, 0, 0, 1)`, 'source-over', 1.0);

      // 2. Create ALPHA MASK Canvas (For Image Generator to fill)
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = img.width;
      alphaCanvas.height = img.height;
      const alphaCtx = alphaCanvas.getContext('2d');
      alphaCtx.drawImage(img, 0, 0);
      drawStrokes(alphaCtx, 'rgba(0,0,0,1)', 'destination-out', 1.1); // ERASE to transparent with dilation

      // Convert to blobs/files
      const [redBlob, alphaBlob] = await Promise.all([
        new Promise(r => redCanvas.toBlob(r, 'image/png')),
        new Promise(r => alphaCanvas.toBlob(r, 'image/png'))
      ]);

      const redFile = new File([redBlob], "visual_mask.png", { type: "image/png" });
      const alphaFile = new File([alphaBlob], "gen_input.png", { type: "image/png" });
      const cleanFile = new File([blob], "original.png", { type: "image/png" });

      // Upload all
      const [redUpload, alphaUpload, cleanUpload] = await Promise.all([
        base44.integrations.Core.UploadFile({ file: redFile }),
        base44.integrations.Core.UploadFile({ file: alphaFile }),
        base44.integrations.Core.UploadFile({ file: cleanFile })
      ]);

      // 3. Analyze with LLM
      if (setActiveTool) setActiveTool({ label: "Analyzing Request..." });
      const instruction = magicBrushPrompt.trim() || "remove this object and fill the background seamlessly";
      const hasReferences = magicBrushImages.length > 0;

      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a world-class AI visual director.

        TASK: Inpainting / Image Editing.
        
        INPUTS:
        1. "Visual Reference": Image with the edit area marked in RED.
        2. "Original": The clean original image.
        ${hasReferences ? "3. Reference Images: User provided style/object references." : ""}
        
        USER INSTRUCTION: "${instruction}"
        
        TECHNICAL CONTEXT:
        - We will send the image to a generator with the RED area made TRANSPARENT (erased).
        - The generator will fill the transparent pixels.
        - We need a prompt that describes the FINAL DESIRED IMAGE key elements, ensuring the filled area matches the surroundings.

        YOUR GOAL:
        Write a robust Stable Diffusion / DALL-E style prompt that describes the SCENE as it should look AFTER the edit.
        
        GUIDELINES:
        - Do NOT mention "red mask" or "remove red" in the final prompt (the generator won't see red, it sees transparency).
        - FOCUS ON LIGHTING & TEXTURE MATCHING: The generated pixels must match the noise, grain, and lighting of the surrounding "Original" image.
        - IF REMOVING: "Fill the hole with [specific background details] that continues the surrounding pattern, matching the lighting and texture perfectly."
        - IF ADDING: "Place [object] in the hole, ensuring it casts correct shadows based on the scene's light source, and matches the camera's focal length and grain."
        - IF REPLACING: "Replace the object with [new object], blending edges seamlessly."
        - KEYWORDS to always include: "seamless inpainting, matching noise, invisible edit, photorealistic, 8k, consistent lighting".
        
        OUTPUT:
        Return ONLY the raw prompt string.`,
        file_urls: [redUpload.file_url, cleanUpload.file_url, ...magicBrushImages]
      });

      // 4. Generate
      if (setActiveTool) setActiveTool({ label: "Applying Magic..." });
      const result = await base44.integrations.Core.GenerateImage({
        prompt: llmResponse,
        existing_image_urls: [alphaUpload.file_url, ...magicBrushImages]
      });

      return result.url;
    } catch (error) {
      console.error("Error executing magic brush:", error);
      throw error;
    } finally {
      setIsProcessing(false);
      if (setActiveTool) setActiveTool(null);
    }
  };

  return { isProcessing, processMagicBrush };
}