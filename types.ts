export const AspectRatio = {
  SQUARE: '1:1',
  STORY: '9:16'
} as const;

export type AspectRatio = typeof AspectRatio[keyof typeof AspectRatio];

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  orientation: 'horizontal' | 'vertical';
}

export interface CanvasState {
  backgroundImage: string | null;
  backgroundTransform: {
    x: number;
    y: number;
    scale: number;
  };
  aspectRatio: AspectRatio;
  layers: TextLayer[];
  selectedLayerId: string | null;
}

export const FONTS = [
  'Inter',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Georgia'
];

export const PRESET_COLORS = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#f59e0b', 
  '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#d946ef', '#f43f5e'
];