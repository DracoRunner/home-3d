'use client';

import { EditorMode } from '@/types';
import { useFloorplanStore } from '@/stores/floorplan-store';

export default function Sidebar() {
  const {
    editorMode,
    setEditorMode,
    config,
    floorplan,
    corners,
    walls,
    rooms,
    items,
    setViewMode,
    viewMode,
    setActiveCorner,
    setActiveWall,
    // ...other actions if needed
    // For stats, use computed getters if available
  } = useFloorplanStore();

  // Property change handlers
  const handleConfigChange = (key: keyof typeof config, value: number) => {
    // Update config in store (if implemented)
    // setConfig({ ...config, [key]: value });
  };

  return (
    <div className="sidebar flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">Home 3D</h1>
        <p className="text-sm text-gray-600">Interior Design Tool</p>
      </div>

      {/* Drawing tools */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Drawing Tools</h3>
        <div className="space-y-2">
          <button
            className={`w-full text-left p-2 rounded hover:bg-gray-100 ${editorMode === EditorMode.MOVE ? 'bg-blue-100 font-bold' : ''}`}
            onClick={() => setEditorMode(EditorMode.MOVE)}
          >
            ✋ Move
          </button>
          <button
            className={`w-full text-left p-2 rounded hover:bg-gray-100 ${editorMode === EditorMode.DRAW ? 'bg-blue-100 font-bold' : ''}`}
            onClick={() => setEditorMode(EditorMode.DRAW)}
          >
            ✏️ Draw Walls
          </button>
          <button
            className={`w-full text-left p-2 rounded hover:bg-gray-100 ${editorMode === EditorMode.DELETE ? 'bg-blue-100 font-bold' : ''}`}
            onClick={() => setEditorMode(EditorMode.DELETE)}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Furniture categories (static for now) */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Furniture</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">🪑 Chairs</button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">🛏️ Beds</button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">🪜 Tables</button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">📚 Storage</button>
          <button className="w-full text-left p-2 rounded hover:bg-gray-100">💡 Lighting</button>
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
              value={config.wallHeight}
              onChange={e => handleConfigChange('wallHeight', Number(e.target.value))}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Wall Thickness</label>
            <input
              type="number"
              value={config.wallThickness}
              onChange={e => handleConfigChange('wallThickness', Number(e.target.value))}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grid Size</label>
            <input
              type="number"
              value={config.gridSize}
              onChange={e => handleConfigChange('gridSize', Number(e.target.value))}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-50 mt-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Stats</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Rooms: {rooms?.length ?? 0}</div>
          <div>Walls: {walls?.length ?? 0}</div>
          <div>Items: {items?.length ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
