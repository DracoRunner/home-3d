'use client';

import { useRef, useEffect } from 'react';

export default function ThreeViewer() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // We'll implement Three.js once the dependencies are installed
    // For now, just show a placeholder
    const container = mountRef.current;
    container.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: sans-serif;
      ">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">🏠</div>
          <h2 style="margin: 0 0 8px 0; font-size: 24px;">3D Viewer</h2>
          <p style="margin: 0; opacity: 0.8;">Three.js integration coming soon...</p>
          <p style="margin: 8px 0 0 0; opacity: 0.6; font-size: 14px;">
            This will show your floorplan in 3D with furniture placement
          </p>
        </div>
      </div>
    `;

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}
