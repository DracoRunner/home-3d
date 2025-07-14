'use client';

import React, { useState, useEffect } from 'react';
import Canvas2D from '@/components/2d/Canvas2D';
import { Room } from '@/types';

export default function DesignStudio() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth - 40, // Small margin
        height: window.innerHeight - 120 // Account for header
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleRoomUpdate = (room: Room) => {
    setRooms(prev => [...prev, room]);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">2D Floor Plan Designer</h1>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-600">Rooms: </span>
              <span className="font-medium">{rooms.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative p-4">
        <Canvas2D
          width={dimensions.width}
          height={dimensions.height}
          onRoomUpdate={handleRoomUpdate}
        />
      </div>
    </div>
  );
}
