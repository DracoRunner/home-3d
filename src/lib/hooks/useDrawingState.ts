import { useState, useCallback } from 'react';
import { Corner, EditorMode } from '@/types';
import { snapToGrid } from '@/lib/utils/math';

interface UseDrawingStateProps {
  editorMode: EditorMode;
  viewportCmPerPixel: number;
  mouseWorldX: number;
  mouseWorldY: number;
  SNAP_TOLERANCE: number;
  GRID_SPACING: number;
}

export function useDrawingState({
  editorMode,
  viewportCmPerPixel,
  mouseWorldX,
  mouseWorldY,
  SNAP_TOLERANCE,
  GRID_SPACING
}: UseDrawingStateProps) {
  const [drawingState, setDrawingState] = useState<{
    lastNode: Corner | null;
    targetX: number;
    targetY: number;
  }>({
    lastNode: null,
    targetX: 0,
    targetY: 0
  });

  // Update drawing target with snapping
  const updateTarget = useCallback(() => {
    let targetX = mouseWorldX;
    let targetY = mouseWorldY;
    if (editorMode === EditorMode.DRAW && drawingState.lastNode) {
      if (Math.abs(mouseWorldX - drawingState.lastNode.x) < SNAP_TOLERANCE) {
        targetX = drawingState.lastNode.x;
      }
      if (Math.abs(mouseWorldY - drawingState.lastNode.y) < SNAP_TOLERANCE) {
        targetY = drawingState.lastNode.y;
      }
    }
    const gridSnap = snapToGrid({ x: targetX, y: targetY }, GRID_SPACING * viewportCmPerPixel);
    setDrawingState(prev => ({
      ...prev,
      targetX: gridSnap.x,
      targetY: gridSnap.y
    }));
  }, [mouseWorldX, mouseWorldY, editorMode, drawingState.lastNode, viewportCmPerPixel, SNAP_TOLERANCE, GRID_SPACING]);

  return { drawingState, setDrawingState, updateTarget };
}
