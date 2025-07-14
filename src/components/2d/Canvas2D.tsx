'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Point2D, Room } from '@/types';

interface Canvas2DProps {
  width: number;
  height: number;
  onRoomUpdate?: (room: Room) => void;
}

export default function Canvas2D({ width, height, onRoomUpdate }: Canvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Point2D[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const scale = 20; // pixels per meter
  const showGrid = true; // Always show grid
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Prevent document zoom
  useEffect(() => {
    const preventZoom = (e: WheelEvent | KeyboardEvent) => {
      if (e.type === 'wheel') {
        const wheelEvent = e as WheelEvent;
        if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      } else if (e.type === 'keydown') {
        const keyEvent = e as KeyboardEvent;
        if ((keyEvent.ctrlKey || keyEvent.metaKey) && (keyEvent.key === '+' || keyEvent.key === '-' || keyEvent.key === '0')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    const preventTouchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('wheel', preventZoom, { passive: false });
    document.addEventListener('keydown', preventZoom, { passive: false });
    document.addEventListener('touchstart', preventTouchZoom, { passive: false });
    document.addEventListener('touchmove', preventTouchZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventZoom);
      document.removeEventListener('keydown', preventZoom);
      document.removeEventListener('touchstart', preventTouchZoom);
      document.removeEventListener('touchmove', preventTouchZoom);
    };
  }, []);

  useEffect(() => {
    const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Save context and apply transformations
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // Draw grid
      if (showGrid) {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5 / zoom;
        
        const gridSize = scale;
        const startX = Math.floor(-panX / zoom / gridSize) * gridSize;
        const startY = Math.floor(-panY / zoom / gridSize) * gridSize;
        const endX = startX + (width / zoom) + gridSize;
        const endY = startY + (height / zoom) + gridSize;
        
        // Vertical lines
        for (let i = startX; i <= endX; i += gridSize) {
          ctx.beginPath();
          ctx.moveTo(i, startY);
          ctx.lineTo(i, endY);
          ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = startY; i <= endY; i += gridSize) {
          ctx.beginPath();
          ctx.moveTo(startX, i);
          ctx.lineTo(endX, i);
          ctx.stroke();
        }
      }

      // Draw completed rooms
      rooms.forEach((room) => {
        if (room.points.length > 2) {
          const isSelected = room.id === selectedRoomId;
          ctx.strokeStyle = isSelected ? '#FF5722' : '#2196F3';
          ctx.fillStyle = isSelected ? 'rgba(255, 87, 34, 0.2)' : 'rgba(33, 150, 243, 0.1)';
          ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom;
          
          ctx.beginPath();
          ctx.moveTo(room.points[0].x * scale, room.points[0].y * scale);
          for (let i = 1; i < room.points.length; i++) {
            ctx.lineTo(room.points[i].x * scale, room.points[i].y * scale);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw room name
          ctx.fillStyle = isSelected ? '#FF5722' : '#2196F3';
          ctx.font = `${14 / zoom}px Arial`;
          ctx.fillText(room.name, room.points[0].x * scale, room.points[0].y * scale - 5 / zoom);
        }
      });

      // Draw current room being drawn
      if (currentRoom.length > 1) {
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 2 / zoom;
        
        ctx.beginPath();
        ctx.moveTo(currentRoom[0].x, currentRoom[0].y);
        for (let i = 1; i < currentRoom.length; i++) {
          ctx.lineTo(currentRoom[i].x, currentRoom[i].y);
        }
        ctx.stroke();

        // Draw points
        currentRoom.forEach((point) => {
          ctx.fillStyle = '#FF5722';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4 / zoom, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // Restore context
      ctx.restore();
    };

    drawCanvas();
  }, [currentRoom, rooms, showGrid, width, height, scale, zoom, panX, panY, selectedRoomId]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point2D => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;
    return { x, y };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;

    const point = getCanvasPoint(e);
    
    if (isDrawing) {
      // Add point to current room being drawn
      setCurrentRoom([...currentRoom, point]);
    } else {
      // Check if clicking on an existing room
      const clickedRoom = rooms.find(room => {
        if (room.points.length < 3) return false;
        
        // Convert room points to canvas coordinates
        const roomPoints = room.points.map(p => ({ x: p.x * scale, y: p.y * scale }));
        
        // Check if point is inside the room polygon
        return isPointInPolygon({ x: point.x, y: point.y }, roomPoints);
      });
      
      if (clickedRoom) {
        setSelectedRoomId(clickedRoom.id === selectedRoomId ? null : clickedRoom.id);
      } else {
        setSelectedRoomId(null);
      }
    }
  };

  const isPointInPolygon = (point: Point2D, polygon: Point2D[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        ((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
        (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)
      ) {
        inside = !inside;
      }
    }
    return inside;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

    // Zoom towards mouse position
    const zoomRatio = newZoom / zoom;
    const newPanX = mouseX - (mouseX - panX) * zoomRatio;
    const newPanY = mouseY - (mouseY - panY) * zoomRatio;

    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.metaKey)) { // Middle mouse or Cmd+click
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPanX(panX + deltaX);
      setPanY(panY + deltaY);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const centerOnFloor = () => {
    if (rooms.length === 0) {
      resetView();
      return;
    }

    // Calculate bounding box of all rooms
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    rooms.forEach(room => {
      room.points.forEach(point => {
        const x = point.x * scale;
        const y = point.y * scale;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
    });

    // Add some padding
    const padding = 50;
    const floorWidth = maxX - minX + padding * 2;
    const floorHeight = maxY - minY + padding * 2;

    // Calculate zoom to fit
    const zoomX = width / floorWidth;
    const zoomY = height / floorHeight;
    const newZoom = Math.min(zoomX, zoomY, 2); // Cap at 2x zoom

    // Calculate center position
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newPanX = width / 2 - centerX * newZoom;
    const newPanY = height / 2 - centerY * newZoom;

    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const finishRoom = () => {
    if (currentRoom.length >= 3) {
      // Convert pixel coordinates to meters
      const roomInMeters: Point2D[] = currentRoom.map(point => ({
        x: point.x / scale,
        y: point.y / scale
      }));

      const newRoom: Room = {
        id: `room-${Date.now()}`,
        name: `Room ${rooms.length + 1}`,
        points: roomInMeters,
        height: 3 // Default 3 meter ceiling height
      };

      setRooms([...rooms, newRoom]);
      if (onRoomUpdate) {
        onRoomUpdate(newRoom);
      }
    }
    setCurrentRoom([]);
    setIsDrawing(false);
  };

  const toggleDrawing = () => {
    if (isDrawing) {
      finishRoom();
    } else {
      setCurrentRoom([]);
      setIsDrawing(true);
    }
  };

  const deleteSelectedRoom = () => {
    if (selectedRoomId) {
      setRooms(rooms.filter(room => room.id !== selectedRoomId));
      setSelectedRoomId(null);
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow">
        <button
          onClick={toggleDrawing}
          className={`px-4 py-2 rounded ${
            isDrawing 
              ? 'bg-red-500 text-white' 
              : 'bg-blue-500 text-white'
          }`}
        >
          {isDrawing ? 'Finish Room' : 'Draw Room'}
        </button>
        
        {isDrawing && currentRoom.length >= 3 && (
          <button
            onClick={finishRoom}
            className="ml-2 px-4 py-2 bg-green-500 text-white rounded"
          >
            Complete Room
          </button>
        )}
        
        {selectedRoomId && (
          <button
            onClick={deleteSelectedRoom}
            className="ml-2 px-4 py-2 bg-red-600 text-white rounded"
          >
            Delete Room
          </button>
        )}
      </div>

      {/* Google Maps Style Zoom Controls */}
      <div className="zoom-controls">
        <button
          onClick={() => setZoom(Math.min(5, zoom * 1.2))}
          className="zoom-button zoom-in"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(0.1, zoom * 0.8))}
          className="zoom-button zoom-out"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={centerOnFloor}
          className="zoom-button center-button"
          aria-label="Center on floor plan"
          title="Center on floor plan"
        >
          ⌖
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border cursor-crosshair"
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow text-sm">
        <div>Zoom: {(zoom * 100).toFixed(0)}%</div>
        <div>Rooms: {rooms.length}</div>
        {selectedRoomId && (
          <div className="text-blue-600">
            Room selected
          </div>
        )}
        {isDrawing && (
          <div className="text-green-600">
            Drawing mode - Click to add points
          </div>
        )}
        {!isDrawing && rooms.length === 0 && (
          <div className="text-gray-500 text-xs">
            Click &quot;Draw Room&quot; to start designing
          </div>
        )}
        {!isDrawing && rooms.length > 0 && !selectedRoomId && (
          <div className="text-gray-500 text-xs">
            Click on rooms to select them
          </div>
        )}
      </div>
    </div>
  );
}
