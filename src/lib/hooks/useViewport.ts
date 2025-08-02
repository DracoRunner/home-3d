import { useState, useCallback } from 'react';

export interface FloorplannerViewport {
  originX: number;
  originY: number;
  zoom: number;
  cmPerPixel: number;
  pixelsPerCm: number;
}

const DEFAULT_ZOOM = 1.0;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8.0;

export function useViewport(initial?: Partial<FloorplannerViewport>) {
  const [viewport, setViewport] = useState<FloorplannerViewport>({
    originX: initial?.originX ?? 0,
    originY: initial?.originY ?? 0,
    zoom: initial?.zoom ?? DEFAULT_ZOOM,
    cmPerPixel: initial?.cmPerPixel ?? 2.0,
    pixelsPerCm: initial?.pixelsPerCm ?? 0.5,
  });

  // Zoom handler
  const handleZoom = useCallback((deltaY: number, mouseX: number, mouseY: number, canvasToWorld: (x: number, y: number) => { x: number; y: number }) => {
    const worldBefore = canvasToWorld(mouseX, mouseY);
    const zoomFactor = deltaY > 0 ? 0.8 : 1.25;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * zoomFactor));
    const newCmPerPixel = 2.0 / newZoom;
    const newPixelsPerCm = newZoom / 2.0;
    const newCanvasX = (worldBefore.x - viewport.originX * viewport.cmPerPixel) * newPixelsPerCm;
    const newCanvasY = (worldBefore.y - viewport.originY * viewport.cmPerPixel) * newPixelsPerCm;
    const originAdjustX = (newCanvasX - mouseX) / newPixelsPerCm;
    const originAdjustY = (newCanvasY - mouseY) / newPixelsPerCm;
    setViewport(prev => ({
      ...prev,
      zoom: newZoom,
      cmPerPixel: newCmPerPixel,
      pixelsPerCm: newPixelsPerCm,
      originX: prev.originX + originAdjustX,
      originY: prev.originY + originAdjustY
    }));
  }, [viewport]);

  // Pan handler
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    setViewport(prev => ({
      ...prev,
      originX: prev.originX - deltaX,
      originY: prev.originY - deltaY
    }));
  }, []);

  return { viewport, setViewport, handleZoom, handlePan };
}
