'use client';

import { EditorMode } from '@/types';

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">Home 3D</h1>
        <p className="text-sm text-gray-600">Interior Design Tool</p>
      </div>

      {/* Drawing tools */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Drawing Tools</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">
            ✋ Move
          </button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">
            ✏️ Draw Walls
          </button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Furniture categories */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Furniture</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">
            🪑 Chairs
          </button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">
            🛏️ Beds
          </button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">
            🪜 Tables
          </button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">
            📚 Storage
          </button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">
            💡 Lighting
          </button>
        </div>
      </div>

      {/* Properties panel */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Properties</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Wall Height</label>
            <input 
              type="number" 
              defaultValue="250" 
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Wall Thickness</label>
            <input 
              type="number" 
              defaultValue="10" 
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grid Size</label>
            <input 
              type="number" 
              defaultValue="20" 
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-50 mt-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Stats</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Rooms: 0</div>
          <div>Walls: 0</div>
          <div>Items: 0</div>
        </div>
      </div>
    </div>
  );
}
