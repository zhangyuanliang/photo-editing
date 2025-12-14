import React, { useState } from 'react';
import { TextLayer, FONTS, PRESET_COLORS } from '../types';
import { generateMarketingCopy } from '../services/geminiService';

interface ControlsProps {
  selectedLayer: TextLayer | undefined;
  backgroundTransform: { x: number; y: number; scale: number };
  onUpdateBackgroundTransform: (updates: Partial<{ x: number; y: number; scale: number }>) => void;
  onUpdateLayer: (id: string, updates: Partial<TextLayer>) => void;
  onUpdateBackgroundImage: (newImage: string) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  hasBackground: boolean;
  backgroundImage: string | null;
  // Mask Props
  isMaskMode: boolean;
  onToggleMaskMode: (active: boolean) => void;
  onExecuteMaskedRemoval: () => Promise<string | null>;
}

export const Controls: React.FC<ControlsProps> = ({
  selectedLayer,
  backgroundTransform,
  onUpdateBackgroundTransform,
  onUpdateLayer,
  onUpdateBackgroundImage,
  onDeleteLayer,
  onAddLayer,
  hasBackground,
  backgroundImage,
  isMaskMode,
  onToggleMaskMode,
  onExecuteMaskedRemoval
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isRemovingWatermark, setIsRemovingWatermark] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiPrompt || !selectedLayer) return;
    setIsGeneratingCopy(true);
    const result = await generateMarketingCopy(aiPrompt);
    onUpdateLayer(selectedLayer.id, { text: result });
    setIsGeneratingCopy(false);
  };

  const handleConfirmRemoval = async () => {
    setIsRemovingWatermark(true);
    const newImage = await onExecuteMaskedRemoval();
    if (newImage) {
        onUpdateBackgroundImage(newImage);
        onToggleMaskMode(false); // Exit mode on success
    } else {
        alert("去除水印失败，请稍后重试。");
    }
    setIsRemovingWatermark(false);
  };

  if (isMaskMode) {
      return (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-700 bg-gray-900">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    区域去水印模式
                </h2>
                <p className="text-xs text-gray-400 mt-1">请调整红色框覆盖需要去除的内容</p>
            </div>
            
            <div className="p-6 space-y-4">
                <button
                    onClick={handleConfirmRemoval}
                    disabled={isRemovingWatermark}
                    className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                        isRemovingWatermark 
                        ? 'bg-purple-800 text-purple-300 cursor-wait' 
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20'
                    }`}
                >
                    {isRemovingWatermark ? 'AI 处理中...' : '✨ 确认消除'}
                </button>

                <button
                    onClick={() => onToggleMaskMode(false)}
                    disabled={isRemovingWatermark}
                    className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                    取消
                </button>
            </div>

            <div className="mt-auto p-4 bg-gray-700/30">
                 <p className="text-xs text-gray-500 text-center">
                     AI 将移除红框内的内容并自动填充背景。
                 </p>
            </div>
        </div>
      );
  }

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-2">编辑工具</h2>
        <button
          onClick={onAddLayer}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加文字
        </button>
      </div>

      {selectedLayer ? (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-300">文字样式</h3>
            <button onClick={() => {}} className="text-xs text-blue-400 hover:text-blue-300">
              ID: {selectedLayer.id.slice(0, 4)}
            </button>
          </div>
          
          {/* Text Content */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">文本内容</label>
            <textarea
              value={selectedLayer.text}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* AI Generation */}
          <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-700">
            <label className="block text-xs font-medium text-purple-400 uppercase mb-2 flex items-center gap-1">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               AI 智能文案
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="输入产品词..." 
                className="flex-1 bg-gray-900 border-none rounded text-xs p-2 text-white"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <button 
                onClick={handleAiGenerate}
                disabled={isGeneratingCopy || !aiPrompt}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
              >
                {isGeneratingCopy ? '...' : '生成'}
              </button>
            </div>
          </div>
          
          {/* Text Orientation */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">排列方向</label>
            <div className="flex bg-gray-900 rounded-md p-1 border border-gray-700">
              <button
                onClick={() => onUpdateLayer(selectedLayer.id, { orientation: 'horizontal' })}
                className={`flex-1 py-1 rounded flex items-center justify-center gap-1 ${selectedLayer.orientation === 'horizontal' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <span className="text-xs">横向</span>
              </button>
              <button
                onClick={() => onUpdateLayer(selectedLayer.id, { orientation: 'vertical' })}
                className={`flex-1 py-1 rounded flex items-center justify-center gap-1 ${selectedLayer.orientation === 'vertical' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                 <span className="text-xs">竖向</span>
              </button>
            </div>
          </div>

          {/* Font & Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase mb-2">字体</label>
              <select
                value={selectedLayer.fontFamily}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-white focus:outline-none"
              >
                {FONTS.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase mb-2">粗细</label>
              <select
                value={selectedLayer.fontWeight}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { fontWeight: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-white focus:outline-none"
              >
                <option value="normal">常规</option>
                <option value="bold">加粗</option>
                <option value="100">极细</option>
                <option value="900">重黑</option>
              </select>
            </div>
          </div>

          {/* Size & Color */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">
              字号 ({selectedLayer.fontSize}px)
            </label>
            <input
              type="range"
              min="12"
              max="200"
              value={selectedLayer.fontSize}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">颜色</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => onUpdateLayer(selectedLayer.id, { color })}
                  className={`w-6 h-6 rounded-full border-2 ${selectedLayer.color === color ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={selectedLayer.color}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">对齐方式</label>
            <div className="flex bg-gray-900 rounded-md p-1 border border-gray-700">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onUpdateLayer(selectedLayer.id, { textAlign: align })}
                  className={`flex-1 py-1 rounded ${selectedLayer.textAlign === align ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <span className="text-xs">{align === 'left' ? '左对齐' : align === 'center' ? '居中' : '右对齐'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={() => onDeleteLayer(selectedLayer.id)}
              className="w-full border border-red-500 text-red-500 hover:bg-red-500/10 py-2 rounded-md text-sm transition-colors"
            >
              删除图层
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-6">
           <h3 className="text-sm font-bold text-gray-300">背景设置</h3>
           
           {hasBackground ? (
               <div className="space-y-4">
                   {/* Magic Remove */}
                   <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 p-3 rounded-lg border border-purple-500/30">
                        <label className="block text-xs font-medium text-purple-300 uppercase mb-2 flex items-center gap-1">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                             AI 区域去水印
                        </label>
                        <button
                            onClick={() => onToggleMaskMode(true)}
                            className="w-full py-2 px-4 rounded-md text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                             ✨ 选择区域并消除
                        </button>
                        <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                            提示: 点击按钮进入选择模式，框选水印后让 AI 精准消除。
                        </p>
                   </div>

                   <div className="bg-gray-700/30 p-3 rounded border border-gray-700">
                       <p className="mb-2 text-xs font-medium text-gray-400 uppercase">操作提示</p>
                       <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300 opacity-80">
                           <li>拖动图片可移动位置</li>
                           <li>拖动下方滑块调整大小</li>
                           <li>选中文字拖动四角可缩放</li>
                       </ul>
                   </div>

                   <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase mb-2">
                        缩放比例 ({Math.round(backgroundTransform.scale * 100)}%)
                        </label>
                        <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.01"
                        value={backgroundTransform.scale}
                        onChange={(e) => onUpdateBackgroundTransform({ scale: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                   </div>
               </div>
           ) : (
               <div className="text-gray-500 text-sm italic">
                   暂无背景图片
               </div>
           )}
        </div>
      )}
    </div>
  );
};