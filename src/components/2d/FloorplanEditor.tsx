'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useFloorplanStore } from '@/stores/floorplan-store';
import { Point2D, Corner, Wall, EditorMode, ViewMode } from '@/types';
import { distance, snapToGrid } from '@/lib/utils/math';

// Configuration constants (based on blueprint3d)
const GRID_SPACING = 20; // pixels
const GRID_COLOR = '#d0d0d0'; // Made darker for better visibility
const GRID_WIDTH = 1;
const WALL_COLOR = '#dddddd';
const WALL_COLOR_HOVER = '#008cba';
const WALL_WIDTH = 5;
const WALL_WIDTH_HOVER = 7;
const CORNER_COLOR = '#cccccc';
const CORNER_COLOR_HOVER = '#008cba';
const CORNER_RADIUS = 0;
const CORNER_RADIUS_HOVER = 7;
const DELETE_COLOR = '#ff0000';
const SNAP_TOLERANCE = 25; // cm
const DEFAULT_ZOOM = 1.0;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8.0;

interface FloorplannerViewport {
  originX: number;
  originY: number;
  zoom: number;
  cmPerPixel: number;
  pixelsPerCm: number;
}

interface FloorplanEditorProps {
  className?: string;
}

export default function FloorplanEditor({ className }: FloorplanEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { 
    viewMode, 
    editorMode, 
    corners, 
    walls, 
    activeCorner, 
    activeWall,
    setActiveCorner,
    setActiveWall,
    addCorner, 
    addWall,
    removeCorner,
    removeWall,
    moveCorner
  } = useFloorplanStore();

  // Viewport state (based on blueprint3d's coordinate system)
  const [viewport, setViewport] = useState<FloorplannerViewport>({
    originX: 0,
    originY: 0,
    zoom: DEFAULT_ZOOM,
    cmPerPixel: 2.0, // 30.48 cm per foot * (1/15 pixels per foot) from blueprint3d
    pixelsPerCm: 0.5
  });

  // Mouse state
  const [mouseState, setMouseState] = useState({
    isDown: false,
    hasMoved: false,
    lastX: 0,
    lastY: 0,
    currentX: 0,
    currentY: 0,
    worldX: 0,
    worldY: 0
  });

  // Drawing state for DRAW mode
  const [drawingState, setDrawingState] = useState<{
    lastNode: Corner | null;
    targetX: number;
    targetY: number;
  }>({
    lastNode: null,
    targetX: 0,
    targetY: 0
  });

  // Convert canvas coordinates to world coordinates
  const canvasToWorld = useCallback((canvasX: number, canvasY: number) => {
    const worldX = (canvasX * viewport.cmPerPixel) + (viewport.originX * viewport.cmPerPixel);
    const worldY = (canvasY * viewport.cmPerPixel) + (viewport.originY * viewport.cmPerPixel);
    return { x: worldX, y: worldY };
  }, [viewport]);

  // Convert world coordinates to canvas coordinates
  const worldToCanvas = useCallback((worldX: number, worldY: number) => {
    const canvasX = (worldX - viewport.originX * viewport.cmPerPixel) * viewport.pixelsPerCm;
    const canvasY = (worldY - viewport.originY * viewport.cmPerPixel) * viewport.pixelsPerCm;
    return { x: canvasX, y: canvasY };
  }, [viewport]);

  // Find corner at position
  const findCornerAt = useCallback((worldX: number, worldY: number, tolerance = 15): Corner | null => {
    return corners.find(corner => 
      distance({ x: worldX, y: worldY }, corner) < tolerance * viewport.cmPerPixel
    ) || null;
  }, [corners, viewport.cmPerPixel]);

  // Find wall at position
  const findWallAt = useCallback((worldX: number, worldY: number, tolerance = 15): Wall | null => {
    for (const wall of walls) {
      const start = corners.find(c => c.id === wall.startCorner);
      const end = corners.find(c => c.id === wall.endCorner);
      if (!start || !end) continue;

      // Calculate distance from point to line segment
      const A = worldX - start.x;
      const B = worldY - start.y;
      const C = end.x - start.x;
      const D = end.y - start.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      if (lenSq === 0) continue;

      const param = dot / lenSq;
      let xx, yy;

      if (param < 0) {
        xx = start.x;
        yy = start.y;
      } else if (param > 1) {
        xx = end.x;
        yy = end.y;
      } else {
        xx = start.x + param * C;
        yy = start.y + param * D;
      }

      const dx = worldX - xx;
      const dy = worldY - yy;
      const distToLine = Math.sqrt(dx * dx + dy * dy);

      if (distToLine < tolerance * viewport.cmPerPixel) {
        return wall;
      }
    }
    return null;
  }, [walls, corners, viewport.cmPerPixel]);

  // Update drawing target with snapping
  const updateTarget = useCallback(() => {
    let targetX = mouseState.worldX;
    let targetY = mouseState.worldY;

    if (editorMode === EditorMode.DRAW && drawingState.lastNode) {
      // Snap to axes
      if (Math.abs(mouseState.worldX - drawingState.lastNode.x) < SNAP_TOLERANCE) {
        targetX = drawingState.lastNode.x;
      }
      if (Math.abs(mouseState.worldY - drawingState.lastNode.y) < SNAP_TOLERANCE) {
        targetY = drawingState.lastNode.y;
      }
    }

    // Snap to grid
    const gridSnap = snapToGrid({ x: targetX, y: targetY }, GRID_SPACING * viewport.cmPerPixel);
    
    setDrawingState(prev => ({
      ...prev,
      targetX: gridSnap.x,
      targetY: gridSnap.y
    }));
  }, [mouseState.worldX, mouseState.worldY, editorMode, drawingState.lastNode, viewport.cmPerPixel]);

  // Handle mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    const world = canvasToWorld(canvasX, canvasY);

    setMouseState(prev => ({
      ...prev,
      isDown: true,
      hasMoved: false,
      lastX: event.clientX,
      lastY: event.clientY,
      currentX: canvasX,
      currentY: canvasY,
      worldX: world.x,
      worldY: world.y
    }));

    // Handle different editor modes
    if (editorMode === EditorMode.DELETE) {
      if (activeCorner) {
        removeCorner(activeCorner.id);
        setActiveCorner(null);
      } else if (activeWall) {
        removeWall(activeWall.id);
        setActiveWall(null);
      }
    }
  }, [canvasToWorld, editorMode, activeCorner, activeWall, removeCorner, removeWall, setActiveCorner, setActiveWall]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    const world = canvasToWorld(canvasX, canvasY);

    setMouseState(prev => {
      const newState = {
        ...prev,
        hasMoved: true,
        currentX: canvasX,
        currentY: canvasY,
        worldX: world.x,
        worldY: world.y
      };

      // Handle panning
      if (prev.isDown && !activeCorner && !activeWall) {
        const deltaX = event.clientX - prev.lastX;
        const deltaY = event.clientY - prev.lastY;
        
        setViewport(prevViewport => ({
          ...prevViewport,
          originX: prevViewport.originX - deltaX,
          originY: prevViewport.originY - deltaY
        }));

        newState.lastX = event.clientX;
        newState.lastY = event.clientY;
      }

      // Handle corner/wall dragging in MOVE mode
      if (editorMode === EditorMode.MOVE && prev.isDown) {
        if (activeCorner) {
          // Move corner
          moveCorner(activeCorner.id, world.x, world.y);
        } else if (activeWall) {
          // Move wall (relative movement)
          const deltaX = (event.clientX - prev.lastX) * viewport.cmPerPixel;
          const deltaY = (event.clientY - prev.lastY) * viewport.cmPerPixel;
          
          const startCorner = corners.find(c => c.id === activeWall.startCorner);
          const endCorner = corners.find(c => c.id === activeWall.endCorner);
          
          if (startCorner && endCorner) {
            const updatedCorners = corners.map(corner => {
              if (corner.id === activeWall!.startCorner || corner.id === activeWall!.endCorner) {
                return {
                  ...corner,
                  x: corner.x + deltaX,
                  y: corner.y + deltaY
                };
              }
              return corner;
            });
            useFloorplanStore.setState({ corners: updatedCorners });
          }

          newState.lastX = event.clientX;
          newState.lastY = event.clientY;
        }
      }

      return newState;
    });

    // Update hover states
    if (!mouseState.isDown) {
      const hoverCorner = findCornerAt(world.x, world.y);
      const hoverWall = hoverCorner ? null : findWallAt(world.x, world.y);
      
      if (hoverCorner !== activeCorner) {
        setActiveCorner(hoverCorner);
      }
      if (hoverWall !== activeWall && !hoverCorner) {
        setActiveWall(hoverWall);
      }
    }

    // Update drawing target
    if (editorMode === EditorMode.DRAW || (editorMode === EditorMode.MOVE && mouseState.isDown)) {
      updateTarget();
    }
  }, [canvasToWorld, editorMode, activeCorner, activeWall, corners, findCornerAt, findWallAt, mouseState.isDown, setActiveCorner, setActiveWall, updateTarget, viewport.cmPerPixel]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (editorMode === EditorMode.DRAW && !mouseState.hasMoved) {
      // Create new corner and wall
      const newCorner: Corner = {
        id: `corner-${Date.now()}`,
        x: drawingState.targetX,
        y: drawingState.targetY,
        adjacentWalls: []
      };

      addCorner(newCorner);

      if (drawingState.lastNode) {
        const newWall: Wall = {
          id: `wall-${Date.now()}`,
          startCorner: drawingState.lastNode.id,
          endCorner: newCorner.id,
          thickness: 10,
          height: 250
        };
        addWall(newWall);
      }

      setDrawingState(prev => ({
        ...prev,
        lastNode: newCorner
      }));
    }

    setMouseState(prev => ({
      ...prev,
      isDown: false
    }));
  }, [editorMode, mouseState.hasMoved, drawingState.targetX, drawingState.targetY, drawingState.lastNode, addCorner, addWall]);

    // Handle mouse wheel for zooming
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Get mouse position relative to canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Convert to world coordinates before zoom
    const worldBefore = canvasToWorld(mouseX, mouseY);
    
    // Calculate zoom change - make it more responsive
    const zoomFactor = event.deltaY > 0 ? 0.8 : 1.25; // More aggressive zoom
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * zoomFactor));
    
    console.log('Zoom:', {
      deltaY: event.deltaY,
      oldZoom: viewport.zoom,
      newZoom: newZoom,
      zoomFactor: zoomFactor
    });
    
    // Update viewport with zoom-to-mouse-position
    setViewport(prev => {
      const newCmPerPixel = 2.0 / newZoom;
      const newPixelsPerCm = newZoom / 2.0;
      
      // Convert world coordinates back to canvas coordinates with new zoom
      const newCanvasX = (worldBefore.x - prev.originX * prev.cmPerPixel) * newPixelsPerCm;
      const newCanvasY = (worldBefore.y - prev.originY * prev.cmPerPixel) * newPixelsPerCm;
      
      // Calculate origin adjustment to keep mouse position consistent
      const originAdjustX = (newCanvasX - mouseX) / newPixelsPerCm;
      const originAdjustY = (newCanvasY - mouseY) / newPixelsPerCm;
      
      return {
        ...prev,
        zoom: newZoom,
        cmPerPixel: newCmPerPixel,
        pixelsPerCm: newPixelsPerCm,
        originX: prev.originX + originAdjustX,
        originY: prev.originY + originAdjustY
      };
    });
  }, [viewport, canvasToWorld]);

  // Drawing functions
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Adjust grid spacing based on zoom level for better visibility
    const scaledGridSpacing = GRID_SPACING * viewport.zoom;
    const offsetX = (-viewport.originX) % scaledGridSpacing;
    const offsetY = (-viewport.originY) % scaledGridSpacing;
    
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = GRID_WIDTH;
    
    // Only draw grid if spacing is reasonable (not too dense)
    if (scaledGridSpacing > 5) {
      // Vertical lines
      for (let x = offsetX; x <= width; x += scaledGridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = offsetY; y <= height; y += scaledGridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
  }, [viewport.originX, viewport.originY, viewport.zoom]);

  const drawWall = useCallback((ctx: CanvasRenderingContext2D, wall: Wall) => {
    const startCorner = corners.find(c => c.id === wall.startCorner);
    const endCorner = corners.find(c => c.id === wall.endCorner);
    if (!startCorner || !endCorner) return;

    const start = worldToCanvas(startCorner.x, startCorner.y);
    const end = worldToCanvas(endCorner.x, endCorner.y);
    
    const isHover = wall === activeWall;
    const isDelete = editorMode === EditorMode.DELETE && isHover;
    
    ctx.strokeStyle = isDelete ? DELETE_COLOR : (isHover ? WALL_COLOR_HOVER : WALL_COLOR);
    ctx.lineWidth = isHover ? WALL_WIDTH_HOVER : WALL_WIDTH;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }, [corners, worldToCanvas, activeWall, editorMode]);

  const drawCorner = useCallback((ctx: CanvasRenderingContext2D, corner: Corner) => {
    const pos = worldToCanvas(corner.x, corner.y);
    const isHover = corner === activeCorner;
    const isDelete = editorMode === EditorMode.DELETE && isHover;
    
    const radius = isHover ? CORNER_RADIUS_HOVER : CORNER_RADIUS;
    if (radius <= 0) return;
    
    ctx.fillStyle = isDelete ? DELETE_COLOR : (isHover ? CORNER_COLOR_HOVER : CORNER_COLOR);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }, [worldToCanvas, activeCorner, editorMode]);

  const drawTarget = useCallback((ctx: CanvasRenderingContext2D) => {
    if (editorMode !== EditorMode.DRAW) return;
    
    const target = worldToCanvas(drawingState.targetX, drawingState.targetY);
    
    // Draw target circle
    ctx.fillStyle = CORNER_COLOR_HOVER;
    ctx.beginPath();
    ctx.arc(target.x, target.y, CORNER_RADIUS_HOVER, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw line from last node to target
    if (drawingState.lastNode) {
      const lastPos = worldToCanvas(drawingState.lastNode.x, drawingState.lastNode.y);
      ctx.strokeStyle = WALL_COLOR_HOVER;
      ctx.lineWidth = WALL_WIDTH_HOVER;
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }, [editorMode, drawingState, worldToCanvas]);

  // Main drawing loop
  const draw = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);
    
    // Draw walls
    walls.forEach(wall => drawWall(ctx, wall));
    
    // Draw corners
    corners.forEach(corner => drawCorner(ctx, corner));
    
    // Draw drawing target
    drawTarget(ctx);
  }, [drawGrid, walls, drawWall, corners, drawCorner, drawTarget]);

  // Canvas setup and resize handling
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [draw]);

  // Redraw when state changes
  useEffect(() => {
    draw();
  }, [draw, viewport, corners, walls, activeCorner, activeWall, editorMode, drawingState]);

  // Reset drawing state when editor mode changes
  useEffect(() => {
    if (editorMode !== EditorMode.DRAW) {
      setDrawingState(prev => ({
        ...prev,
        lastNode: null
      }));
    }
  }, [editorMode]);

  // Handle escape key to reset mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        useFloorplanStore.setState({ editorMode: EditorMode.MOVE });
        setDrawingState(prev => ({
          ...prev,
          lastNode: null
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className || ''}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
      {viewMode === ViewMode.FLOORPLAN_2D && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
          <div className="text-sm text-gray-600 space-y-1">
            <div>Mode: <span className="font-medium">{editorMode}</span></div>
            <div>View: <span className="font-medium">{viewMode}</span></div>
            <div>Zoom: <span className="font-medium">{(viewport.zoom * 100).toFixed(0)}%</span></div>
            <div className="text-xs text-gray-500 mt-2">
              {editorMode === EditorMode.DRAW && 'Click to place corners and walls'}
              {editorMode === EditorMode.MOVE && 'Drag corners/walls or pan view'}
              {editorMode === EditorMode.DELETE && 'Click corners/walls to delete'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
