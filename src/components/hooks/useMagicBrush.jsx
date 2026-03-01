import { useState } from 'react';
import { base44 } from "@/api/base44Client";

export function useMagicBrush() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processMagicBrush = async ({
    imageRef,
    brushStrokes,
    brushSize,
    magicBrushPrompt,
    magicBrushImages = [],
    getProcessedImageBlob,
    currentImage,
    adjustments,
    transform,
    selectedFilter,
    setActiveTool
  }) => {
    if (brushStrokes.length === 0 || !currentImage) return null;
    
    setIsProcessing(true);
    if (setActiveTool) setActiveTool({ label: "Magic Brush" });
    
    let blobUrl = null;
    
    try {
      // Validate inputs
      if (!magicBrushPrompt || magicBrushPrompt.trim().length === 0) {
        throw new Error("Magic brush prompt is required");
      }
      if (!brushStrokes || brushStrokes.length === 0) {
        throw new Error("Brush strokes are required - please draw on the image");
      }

      // Bake the current image state
      const blob = await getProcessedImageBlob(currentImage, adjustments, transform, selectedFilter);
      
      // Load the baked image
      const img = new Image();
      blobUrl = URL.createObjectURL(blob);
      img.src = blobUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load baked image'));
      });
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;

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
             if (domWidth > 0) {
               const scale = ctx.canvas.width / domWidth;
               scaledSize = size * scale;
             } else {
               scaledSize = size * (ctx.canvas.width / 800);
             }
          } else {
             scaledSize = size * (ctx.canvas.width / 800);
          }

          ctx.lineWidth = Math.max(1, scaledSize);
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
      if (redCanvas.width <= 0 || redCanvas.height <= 0) throw new Error('Invalid canvas dimensions');
      const redCtx = redCanvas.getContext('2d');
      if (!redCtx) throw new Error('Failed to get canvas context');
      redCtx.drawImage(img, 0, 0);
      drawStrokes(redCtx, `rgba(255, 0, 0, 1)`, 'source-over', 1.0);

      // 2. Create ALPHA MASK Canvas (For Image Generator to fill)
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = img.width;
      alphaCanvas.height = img.height;
      if (alphaCanvas.width <= 0 || alphaCanvas.height <= 0) throw new Error('Invalid canvas dimensions');
      const alphaCtx = alphaCanvas.getContext('2d');
      if (!alphaCtx) throw new Error('Failed to get canvas context');
      alphaCtx.drawImage(img, 0, 0);
      drawStrokes(alphaCtx, 'rgba(0,0,0,1)', 'destination-out', 1.1);

      // Convert to blobs/files
      const [redBlob, alphaBlob] = await Promise.all([
        new Promise(r => redCanvas.toBlob(r, 'image/png')),
        new Promise(r => alphaCanvas.toBlob(r, 'image/png'))
      ]);

      if (!redBlob || !alphaBlob) throw new Error('Failed to create mask blobs');

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
      const instruction = magicBrushPrompt?.trim() || "remove this object and fill the background seamlessly";
      const hasReferences = magicBrushImages && magicBrushImages.length > 0;

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
        file_urls: [redUpload.file_url, cleanUpload.file_url, ...(magicBrushImages?.map(img => img.url) || [])]
      });

      // 4. Generate
      if (setActiveTool) setActiveTool({ label: "Applying Magic..." });
      const generatedPrompt = llmResponse || "seamless inpainting, fill the transparent area naturally";
      const result = await base44.integrations.Core.GenerateImage({
        prompt: generatedPrompt,
        existing_image_urls: [alphaUpload.file_url, ...(magicBrushImages?.map(img => typeof img === 'string' ? img : img.url) || [])]
      });

      if (!result?.url) throw new Error('No result URL from image generation');

      return result.url;
    } catch (error) {
      console.error("Error executing magic brush:", error);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      throw error;
    } finally {
      setIsProcessing(false);
      if (setActiveTool) setActiveTool(null);
    }
  };

  return { isProcessing, processMagicBrush };
}