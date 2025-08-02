import { useCallback } from 'react';
import { Corner, Wall } from '@/types';
import { distance } from '@/lib/utils/math';

export function useHitTest(corners: Corner[], walls: Wall[], cmPerPixel: number) {
  // Find corner at position
  const findCornerAt = useCallback((worldX: number, worldY: number, tolerance = 15): Corner | null => {
    return corners.find(corner => 
      distance({ x: worldX, y: worldY }, corner) < tolerance * cmPerPixel
    ) || null;
  }, [corners, cmPerPixel]);

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

      if (distToLine < tolerance * cmPerPixel) {
        return wall;
      }
    }
    return null;
  }, [walls, corners, cmPerPixel]);

  return { findCornerAt, findWallAt };
}
