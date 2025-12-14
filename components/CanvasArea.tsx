import React, { useRef, useEffect, useState } from 'react';
import { AspectRatio, TextLayer, MaskRect } from '../types';

interface CanvasAreaProps {
  backgroundImage: string | null;
  backgroundTransform: { x: number; y: number; scale: number };
  onUpdateBackgroundTransform: (updates: Partial<{ x: number; y: number; scale: number }>) => void;
  aspectRatio: AspectRatio;
  layers: TextLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<TextLayer>) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  // Mask Props
  isMaskMode: boolean;
  maskRect: MaskRect | null;
  onUpdateMaskRect: (rect: Partial<MaskRect>) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  backgroundImage,
  backgroundTransform,
  onUpdateBackgroundTransform,
  aspectRatio,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  canvasRef,
  isMaskMode,
  maskRect,
  onUpdateMaskRect
}) => {
  // Layer Dragging
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  
  // Layer Resizing
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    startY: number;
    startFontSize: number;
    layerId: string | null;
    handle: 'tl' | 'tr' | 'bl' | 'br' | null;
  }>({ isResizing: false, startY: 0, startFontSize: 0, layerId: null, handle: null });
  
  // Background Image Dragging
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const [bgDragStart, setBgDragStart] = useState({ x: 0, y: 0 });

  // Mask Dragging/Resizing
  const [isDraggingMask, setIsDraggingMask] = useState(false);
  const [isResizingMask, setIsResizingMask] = useState(false);
  const [maskDragStart, setMaskDragStart] = useState({ x: 0, y: 0 });
  const [maskResizeHandle, setMaskResizeHandle] = useState<'br' | null>(null);

  // Workspace Panning (Outer View)
  const [isPanningView, setIsPanningView] = useState(false);
  const [viewPanStart, setViewPanStart] = useState({ x: 0, y: 0 });
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 0.9 }); 

  const getDimensions = () => {
    const height = 600;
    const width = aspectRatio === AspectRatio.SQUARE ? 600 : (600 * 9) / 16;
    return { width, height };
  };

  const { width, height } = getDimensions();

  // --- Handlers ---

  const handleLayerMouseDown = (e: React.MouseEvent, layer: TextLayer) => {
    if (isMaskMode) return; // Disable text interaction in mask mode
    e.stopPropagation();
    onSelectLayer(layer.id);
    setIsDraggingLayer(true);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, layer: TextLayer, handle: 'tl' | 'tr' | 'bl' | 'br') => {
    if (isMaskMode) return;
    e.stopPropagation(); 
    setResizeState({
        isResizing: true,
        startY: e.clientY,
        startFontSize: layer.fontSize,
        layerId: layer.id,
        handle
    });
  };

  // Mask Interactions
  const handleMaskMouseDown = (e: React.MouseEvent) => {
    if (!isMaskMode || !maskRect) return;
    e.stopPropagation();
    setIsDraggingMask(true);
  };

  const handleMaskResizeMouseDown = (e: React.MouseEvent) => {
    if (!isMaskMode || !maskRect) return;
    e.stopPropagation();
    setIsResizingMask(true);
    setMaskResizeHandle('br');
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isMaskMode) {
      // In mask mode, clicking the image moves the mask box to that location
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && maskRect) {
        e.stopPropagation();
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        
        // Calculate visual click position relative to image center
        const clickVisualX = e.clientX - rect.left - (rect.width / 2);
        const clickVisualY = e.clientY - rect.top - (rect.height / 2);
        
        // Calculate the scale factor (Visual / Intrinsic)
        // Since the image is rendered inside a scaled container, the visual size matches intrinsic * scale
        // But simply: We need the coordinate in "Image Intrinsic Space" because maskRect is rendered inside the scale transform.
        // The click coordinates (clientX) are screen pixels. 
        // The element we clicked is Scaled.
        // rect.width = intrinsicWidth * totalScale (where totalScale = backgroundTransform.scale * viewTransform.scale roughly)
        // We can just use the ratio of rect.width / naturalWidth to convert visual delta to intrinsic delta.
        
        const scaleFactor = rect.width / img.naturalWidth;
        
        const newX = clickVisualX / scaleFactor;
        const newY = clickVisualY / scaleFactor;

        onUpdateMaskRect({ x: newX, y: newY });
      }
      return; 
    }

    if (e.button === 0) { 
        e.stopPropagation();
        onSelectLayer(null);
        setIsDraggingBg(true);
        setBgDragStart({ 
            x: e.clientX - backgroundTransform.x * viewTransform.scale, 
            y: e.clientY - backgroundTransform.y * viewTransform.scale
        });
    }
  };

  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      if (!isMaskMode) onSelectLayer(null);
      setIsPanningView(true);
      setViewPanStart({ 
        x: e.clientX - viewTransform.x, 
        y: e.clientY - viewTransform.y 
      });
    }
  };

  // --- Global Mouse Move/Up ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 0. Mask Interaction (Inside scaled context)
      if (isMaskMode && maskRect) {
         if (isDraggingMask) {
             const totalScale = viewTransform.scale * backgroundTransform.scale;
             const deltaX = e.movementX / totalScale;
             const deltaY = e.movementY / totalScale;
             
             onUpdateMaskRect({
                 x: maskRect.x + deltaX,
                 y: maskRect.y + deltaY
             });
             return;
         }
         if (isResizingMask) {
             const totalScale = viewTransform.scale * backgroundTransform.scale;
             const deltaX = e.movementX / totalScale;
             const deltaY = e.movementY / totalScale;
             
             onUpdateMaskRect({
                 width: Math.max(20, maskRect.width + deltaX),
                 height: Math.max(20, maskRect.height + deltaY)
             });
             return;
         }
      }

      // 1. Resizing Text Layer
      if (resizeState.isResizing && resizeState.layerId) {
          const deltaY = (e.clientY - resizeState.startY) / viewTransform.scale;
          const direction = (resizeState.handle === 'bl' || resizeState.handle === 'br') ? 1 : -1;
          const newSize = Math.max(12, resizeState.startFontSize + (deltaY * direction));
          onUpdateLayer(resizeState.layerId, { fontSize: newSize });
          return; 
      }

      // 2. Dragging Text Layer
      if (isDraggingLayer && selectedLayerId) {
        const currentLayer = layers.find(l => l.id === selectedLayerId);
        if (currentLayer) {
           const deltaX = e.movementX / viewTransform.scale;
           const deltaY = e.movementY / viewTransform.scale;
           onUpdateLayer(selectedLayerId, {
             x: currentLayer.x + deltaX,
             y: currentLayer.y + deltaY
           });
        }
      } 
      // 3. Dragging Background Image
      else if (isDraggingBg && backgroundImage) {
          const newX = (e.clientX - bgDragStart.x) / viewTransform.scale;
          const newY = (e.clientY - bgDragStart.y) / viewTransform.scale;
          onUpdateBackgroundTransform({ x: newX, y: newY });
      }
      // 4. Panning Workspace
      else if (isPanningView) {
        setViewTransform(prev => ({
          ...prev,
          x: e.clientX - viewPanStart.x,
          y: e.clientY - viewPanStart.y
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLayer(false);
      setIsDraggingBg(false);
      setIsPanningView(false);
      setResizeState(prev => ({ ...prev, isResizing: false }));
      setIsDraggingMask(false);
      setIsResizingMask(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDraggingLayer, isPanningView, isDraggingBg, resizeState,
    selectedLayerId, viewPanStart, bgDragStart, 
    layers, onUpdateLayer, onUpdateBackgroundTransform, 
    viewTransform.scale, backgroundImage,
    isMaskMode, isDraggingMask, isResizingMask, maskRect, backgroundTransform.scale, onUpdateMaskRect
  ]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(viewTransform.scale + delta, 0.1), 5);
        setViewTransform(prev => ({ ...prev, scale: newScale }));
    }
  };

  const renderResizeHandle = (layer: TextLayer, handle: 'tl' | 'tr' | 'bl' | 'br') => {
      const cursor = (handle === 'tl' || handle === 'br') ? 'cursor-nwse-resize' : 'cursor-nesw-resize';
      let positionClass = '';
      if (handle === 'tl') positionClass = '-top-1.5 -left-1.5';
      if (handle === 'tr') positionClass = '-top-1.5 -right-1.5';
      if (handle === 'bl') positionClass = '-bottom-1.5 -left-1.5';
      if (handle === 'br') positionClass = '-bottom-1.5 -right-1.5';

      return (
          <div 
            className={`absolute w-3 h-3 bg-blue-500 rounded-full border border-white z-50 ${cursor} ${positionClass}`}
            onMouseDown={(e) => handleResizeMouseDown(e, layer, handle)}
          />
      );
  };

  return (
    <div 
      className={`flex-1 flex items-center justify-center bg-gray-900 overflow-hidden relative h-full select-none ${isPanningView ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleWorkspaceMouseDown}
      onWheel={handleWheel}
    >
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
                 backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
                 backgroundSize: '20px 20px',
                 transform: `translate(${viewTransform.x % 20}px, ${viewTransform.y % 20}px)`
             }} 
        />

        {/* Movable Workspace Container */}
        <div 
            style={{ 
                transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`,
                transition: (isPanningView || resizeState.isResizing || isDraggingMask || isResizingMask) ? 'none' : 'transform 0.1s ease-out'
            }}
            className="origin-center"
        >
          {/* The Canvas "Paper" */}
          <div
            ref={canvasRef}
            className={`relative bg-white shadow-2xl overflow-hidden ${backgroundImage && !isMaskMode ? (isDraggingBg ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            style={{
              width: `${width}px`,
              height: `${height}px`,
            }}
            onMouseDown={handleCanvasMouseDown}
          >
            {/* Render Background Image Layer */}
            {backgroundImage ? (
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ transform: 'none' }}
                >
                    <div 
                         className="max-w-none origin-center absolute left-1/2 top-1/2 pointer-events-auto"
                         style={{
                            transform: `translate(-50%, -50%) translate(${backgroundTransform.x}px, ${backgroundTransform.y}px) scale(${backgroundTransform.scale})`,
                            display: 'inline-block'
                         }}
                    >
                        <img 
                            src={backgroundImage} 
                            alt="Background" 
                            className="block max-w-none" 
                            draggable={false}
                        />
                        
                        {/* MASK OVERLAY */}
                        {isMaskMode && maskRect && (
                            <>
                                <div 
                                    className="absolute bg-red-500/40 border-2 border-red-500 cursor-move z-50 flex items-end justify-end"
                                    style={{
                                        width: `${maskRect.width}px`,
                                        height: `${maskRect.height}px`,
                                        left: `calc(50% + ${maskRect.x}px - ${maskRect.width / 2}px)`,
                                        top: `calc(50% + ${maskRect.y}px - ${maskRect.height / 2}px)`,
                                    }}
                                    onMouseDown={handleMaskMouseDown}
                                >
                                    {/* Resize Handle */}
                                    <div 
                                        className="w-4 h-4 bg-white border border-red-500 cursor-nwse-resize -mr-2 -mb-2"
                                        onMouseDown={handleMaskResizeMouseDown}
                                    />
                                    
                                    <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] px-1 rounded whitespace-nowrap pointer-events-none">
                                        去水印区域
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none select-none">
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>请上传背景图片</p>
              </div>
            )}

            {/* Render Layers */}
            {!isMaskMode && layers.map((layer) => (
              <div
                key={layer.id}
                className={`absolute cursor-move select-none p-2 border-2 ${
                  selectedLayerId === layer.id ? 'border-blue-500 z-10' : 'border-transparent hover:border-blue-300/50 z-0'
                }`}
                style={{
                  left: `${layer.x}px`,
                  top: `${layer.y}px`,
                  fontSize: `${layer.fontSize}px`,
                  color: layer.color,
                  fontFamily: layer.fontFamily,
                  fontWeight: layer.fontWeight,
                  textAlign: layer.textAlign,
                  writingMode: layer.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                  textOrientation: 'upright',
                  lineHeight: 1.2,
                  whiteSpace: 'pre-wrap'
                }}
                onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                onClick={(e) => e.stopPropagation()}
              >
                {layer.text}
                {selectedLayerId === layer.id && (
                  <>
                    {renderResizeHandle(layer, 'tl')}
                    {renderResizeHandle(layer, 'tr')}
                    {renderResizeHandle(layer, 'bl')}
                    {renderResizeHandle(layer, 'br')}
                  </>
                )}
              </div>
            ))}
            
            {/* Mask Mode Overlay hint */}
            {isMaskMode && (
                <div className="absolute inset-0 bg-black/50 pointer-events-none z-40 flex items-center justify-center">
                    <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm pointer-events-none">
                        拖拽红色方框，或点击图片移动选区
                    </div>
                </div>
            )}
          </div>
        </div>
        
        {/* Workspace Zoom Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl border border-gray-700 z-50">
            <button onClick={() => setViewTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.1) }))} className="text-gray-400 hover:text-white font-bold text-lg leading-none pb-1">-</button>
            <span className="text-xs text-gray-300 font-mono w-12 text-center select-none">{Math.round(viewTransform.scale * 100)}%</span>
            <button onClick={() => setViewTransform(prev => ({ ...prev, scale: Math.min(5, prev.scale + 0.1) }))} className="text-gray-400 hover:text-white font-bold text-lg leading-none pb-1">+</button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <button 
                onClick={() => setViewTransform({ x: 0, y: 0, scale: 0.9 })}
                className="text-xs text-blue-400 hover:text-blue-300 uppercase tracking-wider font-semibold"
            >
                重置视图
            </button>
        </div>
    </div>
  );
};