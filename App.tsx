import React, { useState, useRef } from 'react';
import { AspectRatio, CanvasState, TextLayer, MaskRect } from './types';
import { CanvasArea } from './components/CanvasArea';
import { Controls } from './components/Controls';
import { nanoid } from 'nanoid';
import { removeImageWatermark } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<CanvasState>({
    backgroundImage: null,
    backgroundTransform: { x: 0, y: 0, scale: 1 },
    aspectRatio: AspectRatio.SQUARE,
    layers: [],
    selectedLayerId: null,
    isMaskMode: false,
    maskRect: null
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAspectRatioChange = (ratio: AspectRatio) => {
    setState(prev => ({ ...prev, aspectRatio: ratio }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const imgSrc = event.target.result as string;
          const img = new Image();
          img.onload = () => {
            const uiHeight = 600;
            const uiWidth = state.aspectRatio === AspectRatio.SQUARE ? 600 : (600 * 9) / 16;
            
            const scaleX = uiWidth / img.width;
            const scaleY = uiHeight / img.height;
            const scale = Math.max(scaleX, scaleY);

            setState(prev => ({ 
              ...prev, 
              backgroundImage: imgSrc,
              backgroundTransform: { x: 0, y: 0, scale: scale },
              isMaskMode: false,
              maskRect: null
            }));
          };
          img.src = imgSrc;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const updateBackgroundTransform = (updates: Partial<{ x: number; y: number; scale: number }>) => {
    setState(prev => ({
      ...prev,
      backgroundTransform: { ...prev.backgroundTransform, ...updates }
    }));
  };

  const updateBackgroundImage = (newImage: string) => {
    setState(prev => ({
      ...prev,
      backgroundImage: newImage
    }));
  };

  const addLayer = () => {
    const newLayer: TextLayer = {
      id: nanoid(),
      text: '默认文字',
      x: 50,
      y: 50,
      fontSize: 48,
      color: '#ffffff',
      fontWeight: 'bold',
      fontFamily: 'Inter',
      textAlign: 'left',
      orientation: 'horizontal'
    };
    setState(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      selectedLayerId: newLayer.id,
      isMaskMode: false // Exit mask mode if adding text
    }));
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  const deleteLayer = (id: string) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.filter(l => l.id !== id),
      selectedLayerId: null
    }));
  };

  const selectLayer = (id: string | null) => {
    setState(prev => ({ ...prev, selectedLayerId: id }));
  };

  // --- Masking Logic ---

  const toggleMaskMode = (active: boolean) => {
    setState(prev => {
        // If activating, and no mask exists, center one roughly on the image
        let initialMask = prev.maskRect;
        if (active && !initialMask) {
             // Default 150x150 mask centered relative to "visual" view, but mapped to image coords?
             // To keep it simple, we initialize it at a safe spot in Image Coordinates.
             // Since we don't know image natural size here easily without refs, we'll let CanvasArea handle default placement
             // OR we define it here if we assume standard size.
             // Let's rely on CanvasArea to render a default if null, or set a generic one.
             // Actually, let's set a default 100x100 at 0,0 relative to image center
             initialMask = { x: 0, y: 0, width: 200, height: 100 };
        }

        return {
            ...prev,
            isMaskMode: active,
            maskRect: active ? initialMask : null,
            selectedLayerId: null // Deselect text when masking
        };
    });
  };

  const updateMaskRect = (updates: Partial<MaskRect>) => {
      setState(prev => ({
          ...prev,
          maskRect: prev.maskRect ? { ...prev.maskRect, ...updates } : null
      }));
  };

  const executeMaskedRemoval = async () => {
      const { backgroundImage, maskRect } = state;
      if (!backgroundImage || !maskRect) return null;

      // 1. Create a temporary canvas to burn the mask onto the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = backgroundImage;
      
      await new Promise((resolve) => { img.onload = resolve; });

      canvas.width = img.width;
      canvas.height = img.height;

      if (!ctx) return null;

      // 2. Draw original image
      ctx.drawImage(img, 0, 0);

      // 3. Draw the Mask (Red Rectangle) onto the image data
      // Note: maskRect is stored relative to the image's center in our state logic (handled in CanvasArea),
      // We need to convert that to canvas coordinates.
      // In CanvasArea, the mask is inside the image container. 
      // If maskRect.x = 0, it's at the center of the image.
      // If maskRect.x = -img.width/2, it's at the left edge.
      
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; // Semi-transparent red
      
      // Calculate top-left based on center-origin coordinates
      const drawX = (img.width / 2) + maskRect.x - (maskRect.width / 2);
      const drawY = (img.height / 2) + maskRect.y - (maskRect.height / 2);
      
      ctx.fillRect(drawX, drawY, maskRect.width, maskRect.height);

      // 4. Get Base64
      const burnedImage = canvas.toDataURL('image/png');

      // 5. Send to Gemini
      return await removeImageWatermark(burnedImage, true);
  };

  // --- Export ---

  const exportImage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !state.backgroundImage) return;

    const exportHeight = 1920; 
    const exportWidth = state.aspectRatio === AspectRatio.SQUARE ? 1920 : 1080;
    
    canvas.width = exportWidth;
    canvas.height = exportHeight;

    const img = new Image();
    img.src = state.backgroundImage;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const uiHeight = 600;
    const ratio = exportHeight / uiHeight;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(state.backgroundTransform.x * ratio, state.backgroundTransform.y * ratio);
    ctx.scale(state.backgroundTransform.scale * ratio, state.backgroundTransform.scale * ratio);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    const domWidth = canvasRef.current?.offsetWidth || (state.aspectRatio === AspectRatio.SQUARE ? 600 : 337.5);
    const scaleFactor = exportWidth / domWidth;

    state.layers.forEach(layer => {
      ctx.font = `${layer.fontWeight} ${layer.fontSize * scaleFactor}px ${layer.fontFamily}`;
      ctx.fillStyle = layer.color;
      ctx.textBaseline = 'top';
      const lineHeight = layer.fontSize * scaleFactor * 1.2;
      
      if (layer.orientation === 'vertical') {
        const lines = layer.text.split('\n');
        lines.forEach((line, lineIndex) => {
            const lineX = (layer.x * scaleFactor) - (lineIndex * lineHeight); 
            const chars = line.split('');
            chars.forEach((char, charIndex) => {
                const charX = lineX + (lineHeight - (layer.fontSize * scaleFactor)) / 2; 
                const charY = (layer.y * scaleFactor) + (charIndex * lineHeight); 
                ctx.fillText(char, charX, charY);
            });
        });
      } else {
        const lines = layer.text.split('\n');
        lines.forEach((line, index) => {
          const textX = layer.x * scaleFactor;
          const textY = (layer.y * scaleFactor) + (index * lineHeight);
          ctx.fillText(line, textX, textY);
        });
      }
    });

    const link = document.createElement('a');
    link.download = `poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      {/* Top Bar */}
      <div className="h-16 border-b border-gray-700 bg-gray-800 flex items-center justify-between px-6 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">电商海报设计神器</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => handleAspectRatioChange(AspectRatio.SQUARE)}
              className={`px-3 py-1 rounded-md text-sm transition-all ${
                state.aspectRatio === AspectRatio.SQUARE ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              1:1 (正方形)
            </button>
            <button
              onClick={() => handleAspectRatioChange(AspectRatio.STORY)}
              className={`px-3 py-1 rounded-md text-sm transition-all ${
                state.aspectRatio === AspectRatio.STORY ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              9:16 (手机海报)
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-300 hover:text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
          >
            更换背景
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <button
            onClick={exportImage}
            disabled={!state.backgroundImage}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all flex items-center gap-2 ${
               !state.backgroundImage 
               ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
               : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出海报
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <CanvasArea
          canvasRef={canvasRef}
          backgroundImage={state.backgroundImage}
          backgroundTransform={state.backgroundTransform}
          onUpdateBackgroundTransform={updateBackgroundTransform}
          aspectRatio={state.aspectRatio}
          layers={state.layers}
          selectedLayerId={state.selectedLayerId}
          onSelectLayer={selectLayer}
          onUpdateLayer={updateLayer}
          // Mask Props
          isMaskMode={state.isMaskMode}
          maskRect={state.maskRect}
          onUpdateMaskRect={updateMaskRect}
        />
        <Controls
          selectedLayer={selectedLayer}
          backgroundTransform={state.backgroundTransform}
          onUpdateBackgroundTransform={updateBackgroundTransform}
          onUpdateBackgroundImage={updateBackgroundImage}
          onUpdateLayer={updateLayer}
          onDeleteLayer={deleteLayer}
          onAddLayer={addLayer}
          hasBackground={!!state.backgroundImage}
          backgroundImage={state.backgroundImage}
          // Mask Props
          isMaskMode={state.isMaskMode}
          onToggleMaskMode={toggleMaskMode}
          onExecuteMaskedRemoval={executeMaskedRemoval}
        />
      </div>
    </div>
  );
};

export default App;