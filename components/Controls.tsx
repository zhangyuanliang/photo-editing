import React, { useState } from 'react';
import { TextLayer, FONTS, PRESET_COLORS } from '../types';
import { generateMarketingCopy } from '../services/geminiService';

interface ControlsProps {
  selectedLayer: TextLayer | undefined;
  backgroundTransform: { x: number; y: number; scale: number };
  onUpdateBackgroundTransform: (updates: Partial<{ x: number; y: number; scale: number }>) => void;
  onUpdateLayer: (id: string, updates: Partial<TextLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  hasBackground: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  selectedLayer,
  backgroundTransform,
  onUpdateBackgroundTransform,
  onUpdateLayer,
  onDeleteLayer,
  onAddLayer,
  hasBackground
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiPrompt || !selectedLayer) return;
    setIsGenerating(true);
    const result = await generateMarketingCopy(aiPrompt);
    onUpdateLayer(selectedLayer.id, { text: result });
    setIsGenerating(false);
  };

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
                disabled={isGenerating || !aiPrompt}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
              >
                生成
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
                   <div className="bg-blue-900/20 p-3 rounded text-sm text-blue-200 border border-blue-900/50">
                       <p className="mb-1"><strong>操作提示:</strong></p>
                       <ul className="list-disc pl-4 space-y-1 text-xs opacity-80">
                           <li>在画布上拖动图片可移动位置</li>
                           <li>拖动下方滑块调整图片大小</li>
                           <li>选中文字可拖动四个角缩放</li>
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