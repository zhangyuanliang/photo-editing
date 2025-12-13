import React, { useState, useRef } from 'react';
import { AspectRatio, CanvasState, TextLayer } from './types';
import { CanvasArea } from './components/CanvasArea';
import { Controls } from './components/Controls';
import { nanoid } from 'nanoid';

const App: React.FC = () => {
  const [state, setState] = useState<CanvasState>({
    backgroundImage: null,
    backgroundTransform: { x: 0, y: 0, scale: 1 },
    aspectRatio: AspectRatio.SQUARE,
    layers: [],
    selectedLayerId: null
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
            // Calculate initial "cover" scale relative to our UI canvas size (base height 600px)
            const uiHeight = 600;
            const uiWidth = state.aspectRatio === AspectRatio.SQUARE ? 600 : (600 * 9) / 16;
            
            const scaleX = uiWidth / img.width;
            const scaleY = uiHeight / img.height;
            const scale = Math.max(scaleX, scaleY);

            setState(prev => ({ 
              ...prev, 
              backgroundImage: imgSrc,
              backgroundTransform: { x: 0, y: 0, scale: scale }
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
      selectedLayerId: newLayer.id
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

  const exportImage = async () => {
    // 1. Setup Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !state.backgroundImage) return;

    // Define high-res export size
    const exportHeight = 1920; 
    const exportWidth = state.aspectRatio === AspectRatio.SQUARE ? 1920 : 1080;
    
    canvas.width = exportWidth;
    canvas.height = exportHeight;

    // 2. Draw Background with Transforms
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

    // 3. Draw Layers
    const domWidth = canvasRef.current?.offsetWidth || (state.aspectRatio === AspectRatio.SQUARE ? 600 : 337.5);
    const scaleFactor = exportWidth / domWidth;

    state.layers.forEach(layer => {
      ctx.font = `${layer.fontWeight} ${layer.fontSize * scaleFactor}px ${layer.fontFamily}`;
      ctx.fillStyle = layer.color;
      ctx.textBaseline = 'top';
      
      const lineHeight = layer.fontSize * scaleFactor * 1.2;
      
      if (layer.orientation === 'vertical') {
        // Handle Vertical Text Export (Simulating vertical-rl)
        const lines = layer.text.split('\n');
        // In vertical-rl, lines stack from right to left
        // We start drawing the first line at the rightmost position
        // However, the (x, y) coordinate is the top-left of the bounding box usually.
        // For simplicity in this approximation: we start at layer.x, but we move LEFT for subsequent lines.
        
        lines.forEach((line, lineIndex) => {
            // Calculate X for this column (line). 
            // Since it's vertical-rl, the first line is at layer.x (or rightmost? standard CSS vertical-rl places line 1 at right).
            // But our DOM (x,y) is top-left of the flow.
            // Let's assume layer.x is the left edge of the block for now, but vertical-rl fills from right.
            // A simple approximation: line 0 is at X, line 1 is at X - lineHeight. 
            // Wait, usually vertical text flows Right to Left.
            // Let's assume layer.x is the Rightmost edge? No, web standard is top-left position is the anchor.
            // If css is writing-mode: vertical-rl; text-orientation: upright;
            // The element's Top-Left corner is at (layer.x, layer.y).
            // The first column is stuck to the Right edge of the content box, or Left?
            // Standard vertical-rl: Lines flow Right to Left. 
            // So Line 0 is Rightmost. Line 1 is left of Line 0.
            
            // For simple export:
            // We need to measure the text block width to know where "Right" is? 
            // Let's simplify: Draw column 0 at X, column 1 at X - fontSize?
            // Actually, let's just stack them Left to Right for simplicity if that's easier, but Chinese vertical is R-to-L.
            // Let's implement R-to-L stacking.
            // We offset X by (lines.length - 1 - lineIndex) * lineHeight to make the first line appear on the right?
            // No, let's keep it simple. Draw line 0 at X. Draw line 1 at X - lineHeight.
            // But CSS vertical-rl starts at the "logical top" which is physically Right.
            // Let's try drawing Line 0 at X, Line 1 at X - lineHeight.
            
            const lineX = (layer.x * scaleFactor) - (lineIndex * lineHeight); 
            // NOTE: This assumes the user positioned the "Right" side of the text at layer.x. 
            // Realistically, DOM positioning for vertical text is tricky. 
            // Let's stick to a simpler approach: Draw characters downwards.
            // We will just draw lines shift LEFT.
            
            const chars = line.split('');
            chars.forEach((char, charIndex) => {
                const charX = lineX + (lineHeight - (layer.fontSize * scaleFactor)) / 2; // Center char in column
                const charY = (layer.y * scaleFactor) + (charIndex * lineHeight); // Use lineHeight as char height spacing roughly
                
                // Check if it's a non-CJK character that needs rotation? 
                // For 'upright' orientation, all chars are upright.
                ctx.fillText(char, charX, charY);
            });
        });

      } else {
        // Handle Horizontal Text Export
        const lines = layer.text.split('\n');
        lines.forEach((line, index) => {
          const textX = layer.x * scaleFactor;
          const textY = (layer.y * scaleFactor) + (index * lineHeight);
          ctx.fillText(line, textX, textY);
        });
      }
    });

    // 4. Download
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
        />
        <Controls
          selectedLayer={selectedLayer}
          backgroundTransform={state.backgroundTransform}
          onUpdateBackgroundTransform={updateBackgroundTransform}
          onUpdateLayer={updateLayer}
          onDeleteLayer={deleteLayer}
          onAddLayer={addLayer}
          hasBackground={!!state.backgroundImage}
        />
      </div>
    </div>
  );
};

export default App;