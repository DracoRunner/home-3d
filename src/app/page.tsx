'use client';

import { useState } from 'react';
import { ViewMode } from '@/types';
import FloorplanEditor from '@/components/2d/FloorplanEditor';
import ThreeViewer from '@/components/3d/ThreeViewer';
import Sidebar from '@/components/ui/Sidebar';
import Toolbar from '@/components/ui/Toolbar';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.FLOORPLAN_2D);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <Toolbar />
        
        {/* Editor area */}
        <div className="flex-1 relative">
          {viewMode === ViewMode.FLOORPLAN_2D && (
            <FloorplanEditor />
          )}
          
          {viewMode === ViewMode.DESIGN_3D && (
            <ThreeViewer />
          )}
          
          {viewMode === ViewMode.BOTH && (
            <div className="flex h-full">
              <div className="flex-1 border-r">
                <FloorplanEditor />
              </div>
              <div className="flex-1">
                <ThreeViewer />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
