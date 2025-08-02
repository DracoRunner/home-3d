import { useState } from 'react';

export interface MouseState {
  isDown: boolean;
  hasMoved: boolean;
  lastX: number;
  lastY: number;
  currentX: number;
  currentY: number;
  worldX: number;
  worldY: number;
}

export function useMouseState(initial?: Partial<MouseState>) {
  const [mouseState, setMouseState] = useState<MouseState>({
    isDown: initial?.isDown ?? false,
    hasMoved: initial?.hasMoved ?? false,
    lastX: initial?.lastX ?? 0,
    lastY: initial?.lastY ?? 0,
    currentX: initial?.currentX ?? 0,
    currentY: initial?.currentY ?? 0,
    worldX: initial?.worldX ?? 0,
    worldY: initial?.worldY ?? 0,
  });

  return { mouseState, setMouseState };
}
