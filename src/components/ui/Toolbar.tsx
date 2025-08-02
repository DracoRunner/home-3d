'use client';


import { ViewMode } from '@/types';
import { useFloorplanStore } from '@/stores/floorplan-store';

export default function Toolbar() {
  const { viewMode, setViewMode } = useFloorplanStore();
  return (
    <div className="toolbar">
      <div className="flex items-center gap-4">
        {/* View mode buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <button
            className={`tool-button ${viewMode === ViewMode.FLOORPLAN_2D ? 'active' : ''}`}
            onClick={() => setViewMode(ViewMode.FLOORPLAN_2D)}
          >
            2D Plan
          </button>
          <button
            className={`tool-button ${viewMode === ViewMode.DESIGN_3D ? 'active' : ''}`}
            onClick={() => setViewMode(ViewMode.DESIGN_3D)}
          >
            3D View
          </button>
          <button
            className={`tool-button ${viewMode === ViewMode.BOTH ? 'active' : ''}`}
            onClick={() => setViewMode(ViewMode.BOTH)}
          >
            Split View
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* File operations */}
        <div className="flex items-center gap-2">
          <button className="tool-button">
            New
          </button>
          <button className="tool-button">
            Open
          </button>
          <button className="tool-button">
            Save
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Export options */}
        <div className="flex items-center gap-2">
          <button className="tool-button">
            Export PNG
          </button>
          <button className="tool-button">
            Export 3D
          </button>
        </div>
      </div>
    </div>
  );
}
