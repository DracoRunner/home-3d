'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useFloorplanStore } from '@/stores/floorplan-store';
import { Point2D, Corner, Wall, EditorMode, ViewMode } from '@/types';
import { distance, snapToGrid } from '@/lib/utils/math';
import { useViewport } from '@/lib/hooks/useViewport';
import { useMouseState } from '@/lib/hooks/useMouseState';
// import { useDrawingState } from '@/lib/hooks/useDrawingState';
import { useHitTest } from '@/lib/hooks/useHitTest';

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
  // Viewport state and handlers
  const { viewport, setViewport, handleZoom, handlePan } = useViewport();

  // Helper: format cm to feet/inches string
  function formatFeetInches(cm: number) {
    const inchesTotal = cm / 2.54;
    const feet = Math.floor(inchesTotal / 12);
    const inches = Math.round(inchesTotal % 12);
    return `${feet}'${inches}\"`;
  }

  // Helper: parse feet/inches string to cm
  function parseFeetInches(input: string): number | null {
    // Accepts 12'6", 12' 6", 12.5', 150" etc.
    const ftIn = input.match(/^(\d+)'\s*(\d+)?"?$/); // 12'6"
    if (ftIn) {
      const feet = parseInt(ftIn[1], 10);
      const inches = ftIn[2] ? parseInt(ftIn[2], 10) : 0;
      return (feet * 12 + inches) * 2.54;
    }
    const ftDec = input.match(/^(\d+(?:\.\d+)?)'/); // 12.5'
    if (ftDec) {
      return parseFloat(ftDec[1]) * 12 * 2.54;
    }
    const inches = input.match(/^(\d+(?:\.\d+)?)"$/); // 150"
    if (inches) {
      return parseFloat(inches[1]) * 2.54;
    }
    return null;
  }

  // Drawing function for grid
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
  // Track which wall is being dragged in MOVE mode
  const [draggedWallId, setDraggedWallId] = useState<string | null>(null);
  // Track which wall is selected for editing/highlight
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  // State for editing wall label
  const [editingWallId, setEditingWallId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editPos, setEditPos] = useState<{x: number, y: number} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  

  // Use selectors for reactivity
  const viewMode = useFloorplanStore(state => state.viewMode);
  const editorMode = useFloorplanStore(state => state.editorMode);
  const activeCorner = useFloorplanStore(state => state.activeCorner);
  const activeWall = useFloorplanStore(state => state.activeWall);
  const setActiveCorner = useFloorplanStore(state => state.setActiveCorner);
  const setActiveWall = useFloorplanStore(state => state.setActiveWall);
  const addCorner = useFloorplanStore(state => state.addCorner);
  const addWall = useFloorplanStore(state => state.addWall);
  const removeCorner = useFloorplanStore(state => state.removeCorner);
  const removeWall = useFloorplanStore(state => state.removeWall);
  const moveCorner = useFloorplanStore(state => state.moveCorner);
  const floorplan = useFloorplanStore(state => state.floorplan);
  const corners = Object.values(floorplan.corners);
  const walls = Object.values(floorplan.walls);



  // Mouse state and setter
  const { mouseState, setMouseState } = useMouseState();


  // Drawing state and snapping logic (with room closing)
  const [drawingState, setDrawingState] = useState<{
    lastNode: Corner | null;
    targetX: number;
    targetY: number;
    firstCorner: Corner | null;
  }>({
    lastNode: null,
    targetX: 0,
    targetY: 0,
    firstCorner: null
  });
  // Patch updateTarget to work with new drawingState
  const updateTarget = useCallback(() => {
    let targetX = mouseState.worldX;
    let targetY = mouseState.worldY;
    if (editorMode === EditorMode.DRAW && drawingState.lastNode) {
      if (Math.abs(mouseState.worldX - drawingState.lastNode.x) < SNAP_TOLERANCE) {
        targetX = drawingState.lastNode.x;
      }
      if (Math.abs(mouseState.worldY - drawingState.lastNode.y) < SNAP_TOLERANCE) {
        targetY = drawingState.lastNode.y;
      }
    }
    const gridSnap = snapToGrid({ x: targetX, y: targetY }, GRID_SPACING * viewport.cmPerPixel);
    setDrawingState(prev => ({ ...prev, targetX: gridSnap.x, targetY: gridSnap.y }));
  }, [mouseState.worldX, mouseState.worldY, editorMode, drawingState.lastNode, viewport.cmPerPixel]);

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


  // Hit-testing hooks for corners and walls
  // For MOVE mode, use a larger tolerance for wall hit-test to match visible thickness (in px, not cm)
  const wallHitTolerance = editorMode === EditorMode.MOVE ? Math.max(16, 2 * WALL_WIDTH_HOVER) : 15;
  const { findCornerAt, findWallAt: _findWallAt } = useHitTest(corners, walls, viewport.cmPerPixel);
  // Custom wall hit-test for MOVE mode
  const findWallAt = useCallback((x: number, y: number) => {
    return _findWallAt(x, y, wallHitTolerance);
  }, [_findWallAt, wallHitTolerance]);

  // ...existing code...

  // Handle mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    const world = canvasToWorld(canvasX, canvasY);

    // Always allow wall selection by click (even outside MOVE mode)
    const clickedCorner = findCornerAt(world.x, world.y);
    const clickedWall = !clickedCorner ? findWallAt(world.x, world.y) : null;
    if (clickedWall) {
      setSelectedWallId(clickedWall.id);
    } else {
      setSelectedWallId(null);
    }

    // In MOVE mode, set active wall if clicking on a wall
    if (editorMode === EditorMode.MOVE) {
      if (clickedWall) {
        setActiveWall(clickedWall);
        setDraggedWallId(clickedWall.id);
        setActiveCorner(null);
      } else if (clickedCorner) {
        setActiveCorner(clickedCorner);
        setActiveWall(null);
        setDraggedWallId(null);
      } else {
        setActiveWall(null);
        setActiveCorner(null);
        setDraggedWallId(null);
      }
    }

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

    // Allow starting a new wall from any existing corner in DRAW mode
    if (editorMode === EditorMode.DRAW) {
      const clickedCorner = findCornerAt(world.x, world.y);
      if (!drawingState.lastNode && clickedCorner) {
        // Set lastNode and firstCorner, but also set a flag to indicate drawing has started
        setDrawingState({
          lastNode: clickedCorner,
          targetX: clickedCorner.x,
          targetY: clickedCorner.y,
          firstCorner: clickedCorner,
          // @ts-ignore
          drawingStarted: true
        });
        // Do not return here; allow mouse up to process this as a valid first click
      }
    }

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
  }, [canvasToWorld, editorMode, activeCorner, activeWall, removeCorner, removeWall, setActiveCorner, setActiveWall, drawingState.lastNode, findCornerAt, findWallAt]);

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
        handlePan(deltaX, deltaY);
        newState.lastX = event.clientX;
        newState.lastY = event.clientY;
      }

      // Handle corner/wall dragging in MOVE mode
      if (editorMode === EditorMode.MOVE && prev.isDown) {
        if (activeCorner) {
          moveCorner(activeCorner.id, world.x, world.y);
        } else if (draggedWallId) {
          const wall = walls.find(w => w.id === draggedWallId);
          if (wall) {
            const deltaX = (event.clientX - prev.lastX) * viewport.cmPerPixel;
            const deltaY = (event.clientY - prev.lastY) * viewport.cmPerPixel;
            const startCorner = corners.find(c => c.id === wall.startCorner);
            const endCorner = corners.find(c => c.id === wall.endCorner);
            if (startCorner && endCorner) {
              // Log the intended new positions for debugging
              console.log('[WALL MOVE]', {
                wallId: wall.id,
                startCorner: {
                  id: startCorner.id,
                  from: { x: startCorner.x, y: startCorner.y },
                  to: { x: startCorner.x + deltaX, y: startCorner.y + deltaY }
                },
                endCorner: {
                  id: endCorner.id,
                  from: { x: endCorner.x, y: endCorner.y },
                  to: { x: endCorner.x + deltaX, y: endCorner.y + deltaY }
                },
                deltaX,
                deltaY
              });
              // Move only the two corners of the dragged wall by the delta
              const updatedCornersObj = { ...floorplan.corners };
              if (updatedCornersObj[wall.startCorner]) {
                updatedCornersObj[wall.startCorner] = {
                  ...updatedCornersObj[wall.startCorner],
                  x: updatedCornersObj[wall.startCorner].x + deltaX,
                  y: updatedCornersObj[wall.startCorner].y + deltaY
                };
              }
              if (updatedCornersObj[wall.endCorner]) {
                updatedCornersObj[wall.endCorner] = {
                  ...updatedCornersObj[wall.endCorner],
                  x: updatedCornersObj[wall.endCorner].x + deltaX,
                  y: updatedCornersObj[wall.endCorner].y + deltaY
                };
              }
              useFloorplanStore.setState(state => ({
                floorplan: {
                  ...state.floorplan,
                  corners: updatedCornersObj
                }
              }));
              // Log the updated state for debugging
              console.log('[WALL MOVE][UPDATED STATE]', updatedCornersObj);
            }
            newState.lastX = event.clientX;
            newState.lastY = event.clientY;
          }
        }
      }
      return newState;
    });

    // Update hover states and set active wall for MOVE mode
    if (!mouseState.isDown) {
      const hoverCorner = findCornerAt(world.x, world.y);
      const hoverWall = hoverCorner ? null : findWallAt(world.x, world.y);
      if (hoverCorner !== activeCorner) {
        setActiveCorner(hoverCorner);
      }
      if (hoverWall !== activeWall && !hoverCorner) {
        setActiveWall(hoverWall);
      }
      // Change cursor to pointer if hovering wall in MOVE mode
      if (editorMode === EditorMode.MOVE && hoverWall) {
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      } else if (canvasRef.current) {
        canvasRef.current.style.cursor = editorMode === EditorMode.MOVE ? 'default' : 'crosshair';
      }
    }

    // Update drawing target
    if (editorMode === EditorMode.DRAW || (editorMode === EditorMode.MOVE && mouseState.isDown)) {
      updateTarget();
    }
  }, [canvasToWorld, editorMode, activeCorner, activeWall, corners, findCornerAt, findWallAt, mouseState.isDown, setActiveCorner, setActiveWall, updateTarget, viewport.cmPerPixel, handlePan, moveCorner]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (editorMode === EditorMode.DRAW && !mouseState.hasMoved) {
      const clickedCorner = findCornerAt(drawingState.targetX, drawingState.targetY);
      // Check if user clicked on the first point to close the room
      const isClosing = drawingState.lastNode && drawingState.firstCorner &&
        clickedCorner && clickedCorner.id === drawingState.firstCorner.id &&
        distance({ x: drawingState.targetX, y: drawingState.targetY }, drawingState.firstCorner) < SNAP_TOLERANCE;

      if (!drawingState.lastNode) {
        // First point: create and remember as firstCorner
        if (clickedCorner) {
          // If user clicks an existing corner as first point, set as lastNode and firstCorner, but do not return; allow next click to create wall
          setDrawingState({
            lastNode: clickedCorner,
            targetX: clickedCorner.x,
            targetY: clickedCorner.y,
            firstCorner: clickedCorner
          });
        } else {
          const newCorner: Corner = {
            id: `corner-${Date.now()}`,
            x: drawingState.targetX,
            y: drawingState.targetY,
            adjacentWalls: []
          };
          addCorner(newCorner);
          setDrawingState({ lastNode: newCorner, targetX: newCorner.x, targetY: newCorner.y, firstCorner: newCorner });
        }
      } else if (isClosing && drawingState.firstCorner) {
        // Closing the room: add wall to firstCorner, finish, and exit DRAW mode
        const newWall: Wall = {
          id: `wall-${Date.now()}`,
          startCorner: drawingState.lastNode.id,
          endCorner: drawingState.firstCorner.id,
          thickness: 10,
          height: 250
        };
        addWall(newWall);
        useFloorplanStore.getState().setEditorMode(EditorMode.MOVE);
        setDrawingState({ lastNode: null, targetX: 0, targetY: 0, firstCorner: null });
      } else if (drawingState.lastNode) {
        // If lastNode is set, allow drawing to any point (existing or new)
        if (clickedCorner) {
          // Continue drawing from any existing corner (not closing)
          const newWall: Wall = {
            id: `wall-${Date.now()}`,
            startCorner: drawingState.lastNode.id,
            endCorner: clickedCorner.id,
            thickness: 10,
            height: 250
          };
          addWall(newWall);
          setDrawingState(prev => ({ ...prev, lastNode: clickedCorner, targetX: clickedCorner.x, targetY: clickedCorner.y }));
        } else {
          // Add new corner and wall as usual
          const newCorner: Corner = {
            id: `corner-${Date.now()}`,
            x: drawingState.targetX,
            y: drawingState.targetY,
            adjacentWalls: []
          };
          addCorner(newCorner);
          const newWall: Wall = {
            id: `wall-${Date.now()}`,
            startCorner: drawingState.lastNode.id,
            endCorner: newCorner.id,
            thickness: 10,
            height: 250
          };
          addWall(newWall);
          setDrawingState(prev => ({ ...prev, lastNode: newCorner, targetX: newCorner.x, targetY: newCorner.y }));
        }
      }
    }

    setMouseState(prev => ({
      ...prev,
      isDown: false
    }));
    setDraggedWallId(null);
  }, [editorMode, mouseState.hasMoved, drawingState.targetX, drawingState.targetY, drawingState.lastNode, drawingState.firstCorner, addCorner, addWall, findCornerAt]);

    // Handle mouse wheel for zooming
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    handleZoom(event.deltaY, mouseX, mouseY, canvasToWorld);
  }, [handleZoom, canvasToWorld]);

  // Drawing functions
  const drawWall = useCallback((ctx: CanvasRenderingContext2D, wall: Wall) => {
    const startCorner = corners.find(c => c.id === wall.startCorner);
    const endCorner = corners.find(c => c.id === wall.endCorner);
    if (!startCorner || !endCorner) return;

    const start = worldToCanvas(startCorner.x, startCorner.y);
    const end = worldToCanvas(endCorner.x, endCorner.y);
    const isHover = wall === activeWall;
    const isDelete = editorMode === EditorMode.DELETE && isHover;
    const isSelected = wall.id === selectedWallId;

    // Wall thickness in canvas px (scale with zoom)
    const wallThicknessCm = wall.thickness || 10;
    const wallThicknessPx = wallThicknessCm * viewport.pixelsPerCm;
    const doubleLineGapPx = Math.max(4, wallThicknessPx * 0.5);

    // Direction vector
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const nx = -dy / len; // normal x
    const ny = dx / len;  // normal y

    // Outer lines (double wall)
    ctx.save();
    ctx.lineCap = 'round';
    // Shadow/outline
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = wallThicknessPx + 6;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Main fill (between double lines)
    ctx.strokeStyle = isDelete
      ? DELETE_COLOR
      : isSelected
        ? '#f59e42' // orange highlight for selected
        : isHover
          ? WALL_COLOR_HOVER
          : WALL_COLOR;
    ctx.lineWidth = wallThicknessPx;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Double lines (edges)
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 2;
    for (const offset of [-doubleLineGapPx/2, doubleLineGapPx/2]) {
      ctx.beginPath();
      ctx.moveTo(start.x + nx * offset, start.y + ny * offset);
      ctx.lineTo(end.x + nx * offset, end.y + ny * offset);
      ctx.stroke();
    }
    ctx.restore();

    // Draw dimension label (centered above wall)
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const labelDist = wallThicknessPx + 16; // px above wall
    // Place label above wall (normal direction)
    const labelX = midX + nx * labelDist;
    const labelY = midY + ny * labelDist;
    // Wall length in cm
    const wallLengthCm = Math.sqrt(
      Math.pow(startCorner.x - endCorner.x, 2) + Math.pow(startCorner.y - endCorner.y, 2)
    );
    const label = formatFeetInches(wallLengthCm);

    // If editing this wall, skip drawing label (input will be rendered in React)
    if (editingWallId === wall.id && editPos) {
      setEditPos({ x: labelX, y: labelY }); // keep position updated
      return;
    }

    ctx.save();
    ctx.font = `bold 15px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // White background for label
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'white';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(labelX - textWidth/2 - 6, labelY - 13, textWidth + 12, 26);
    ctx.globalAlpha = 1.0;
    // Label text
    ctx.fillStyle = '#222';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.strokeText(label, labelX, labelY);
    ctx.fillText(label, labelX, labelY);
    ctx.restore();
  }, [corners, worldToCanvas, activeWall, editorMode, viewport.pixelsPerCm, selectedWallId, editingWallId, editPos]);

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

    // Draw preview wall and live dimension label
    if (drawingState.lastNode) {
      const lastPos = worldToCanvas(drawingState.lastNode.x, drawingState.lastNode.y);
      ctx.save();
      ctx.strokeStyle = WALL_COLOR_HOVER;
      ctx.lineWidth = WALL_WIDTH_HOVER;
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      // Live dimension label
      // Compute wall length in cm
      const dx = drawingState.targetX - drawingState.lastNode.x;
      const dy = drawingState.targetY - drawingState.lastNode.y;
      const wallLengthCm = Math.sqrt(dx * dx + dy * dy);
      const label = formatFeetInches(wallLengthCm);
      // Place label above wall (normal direction)
      const midX = (lastPos.x + target.x) / 2;
      const midY = (lastPos.y + target.y) / 2;
      const len = Math.sqrt((target.x - lastPos.x) ** 2 + (target.y - lastPos.y) ** 2);
      let nx = 0, ny = 0;
      if (len > 0) {
        nx = -(target.y - lastPos.y) / len;
        ny = (target.x - lastPos.x) / len;
      }
      const wallThicknessPx = 10 * viewport.pixelsPerCm;
      const labelDist = wallThicknessPx + 16;
      const labelX = midX + nx * labelDist;
      const labelY = midY + ny * labelDist;

      ctx.font = `bold 15px Inter, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textWidth = ctx.measureText(label).width;
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(labelX - textWidth/2 - 6, labelY - 13, textWidth + 12, 26);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#222';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.strokeText(label, labelX, labelY);
      ctx.fillText(label, labelX, labelY);
      ctx.restore();
      ctx.restore();
    }
  }, [editorMode, drawingState, worldToCanvas, formatFeetInches, viewport.pixelsPerCm]);

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
  }, [drawGrid, walls, drawWall, corners, drawCorner, drawTarget, editingWallId, editPos]);

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

  // Handle double click on canvas to edit wall label
  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    // Find wall label under click
    for (const wall of walls) {
      const startCorner = corners.find(c => c.id === wall.startCorner);
      const endCorner = corners.find(c => c.id === wall.endCorner);
      if (!startCorner || !endCorner) continue;
      const start = worldToCanvas(startCorner.x, startCorner.y);
      const end = worldToCanvas(endCorner.x, endCorner.y);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const nx = -dy / len;
      const ny = dx / len;
      const wallThicknessPx = (wall.thickness || 10) * viewport.pixelsPerCm;
      const labelDist = wallThicknessPx + 16;
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const labelX = midX + nx * labelDist;
      const labelY = midY + ny * labelDist;
      // Hit test: within label box
      const wallLengthCm = Math.sqrt(
        Math.pow(startCorner.x - endCorner.x, 2) + Math.pow(startCorner.y - endCorner.y, 2)
      );
      const label = formatFeetInches(wallLengthCm);
      // Estimate label box
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) continue;
      ctx.font = `bold 15px Inter, Arial, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const box = {
        left: labelX - textWidth/2 - 6,
        right: labelX + textWidth/2 + 6,
        top: labelY - 13,
        bottom: labelY + 13
      };
      if (canvasX >= box.left && canvasX <= box.right && canvasY >= box.top && canvasY <= box.bottom) {
        setEditingWallId(wall.id);
        setEditValue(label);
        setEditPos({ x: labelX, y: labelY });
        return;
      }
    }
  }, [walls, corners, worldToCanvas, viewport.pixelsPerCm]);

  // Handle input change and commit
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value);
  const handleEditBlurOrEnter = useCallback(() => {
    if (!editingWallId) return;
    const wall = walls.find(w => w.id === editingWallId);
    if (!wall) {
      setEditingWallId(null);
      setEditPos(null);
      return;
    }
    const startCorner = corners.find(c => c.id === wall.startCorner);
    const endCorner = corners.find(c => c.id === wall.endCorner);
    if (!startCorner || !endCorner) {
      setEditingWallId(null);
      setEditPos(null);
      return;
    }
    const newLenCm = parseFeetInches(editValue);
    if (!newLenCm || newLenCm < 10) { // ignore too small/invalid
      setEditingWallId(null);
      setEditPos(null);
      return;
    }
    // Move endCorner to new length, keeping direction
    const dx = endCorner.x - startCorner.x;
    const dy = endCorner.y - startCorner.y;
    const oldLen = Math.sqrt(dx * dx + dy * dy);
    if (oldLen === 0) {
      setEditingWallId(null);
      setEditPos(null);
      return;
    }
    const scale = newLenCm / oldLen;
    const newEnd = {
      ...endCorner,
      x: startCorner.x + dx * scale,
      y: startCorner.y + dy * scale
    };
    // Update corner in store
    useFloorplanStore.getState().moveCorner(newEnd.id, newEnd.x, newEnd.y);
    setEditingWallId(null);
    setEditPos(null);
  }, [editingWallId, editValue, walls, corners]);

  // Render input box at label position
  const renderEditInput = () => {
    if (!editingWallId || !editPos) return null;
    // Position absolutely over canvas
    return (
      <input
        type="text"
        value={editValue}
        onChange={handleEditChange}
        onBlur={handleEditBlurOrEnter}
        onKeyDown={e => { if (e.key === 'Enter') handleEditBlurOrEnter(); }}
        style={{
          position: 'absolute',
          left: editPos.x - 50,
          top: editPos.y - 18,
          width: 100,
          height: 32,
          fontSize: 15,
          fontWeight: 'bold',
          textAlign: 'center',
          background: 'white',
          border: '1px solid #bbb',
          borderRadius: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          zIndex: 10
        }}
        autoFocus
      />
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className || ''}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleCanvasDoubleClick}
      />
      {renderEditInput()}
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
