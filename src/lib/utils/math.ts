import { Corner, Wall, Point2D } from '@/types';

/**
 * Calculate distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Snap point to grid
 */
export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

export class MathUtils {
  /**
   * Calculate distance between two points
   */
  static distance(p1: Point2D, p2: Point2D): number {
    return distance(p1, p2);
  }

  /**
   * Check if point is within tolerance of another point
   */
  static pointsEqual(p1: Point2D, p2: Point2D, tolerance: number = 10): boolean {
    return this.distance(p1, p2) < tolerance;
  }

  /**
   * Snap point to grid
   */
  static snapToGrid(point: Point2D, gridSize: number): Point2D {
    return snapToGrid(point, gridSize);
  }

  /**
   * Calculate angle between two points in radians
   */
  static angle(p1: Point2D, p2: Point2D): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  /**
   * Rotate point around origin
   */
  static rotatePoint(point: Point2D, angle: number, origin: Point2D = { x: 0, y: 0 }): Point2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;

    return {
      x: origin.x + dx * cos - dy * sin,
      y: origin.y + dx * sin + dy * cos,
    };
  }

  /**
   * Get distance from point to line segment
   */
  static distanceToLineSegment(point: Point2D, start: Point2D, end: Point2D): number {
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return this.distance(point, start);

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const closest = {
      x: start.x + param * C,
      y: start.y + param * D,
    };

    return this.distance(point, closest);
  }

  /**
   * Check if point is inside polygon using ray casting algorithm
   */
  static pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    const x = point.x;
    const y = point.y;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i].y > y !== polygon[j].y > y &&
        x < ((polygon[j].x - polygon[i].x) * (y - polygon[i].y)) / (polygon[j].y - polygon[i].y) + polygon[i].x
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Calculate wall length
   */
  static wallLength(wall: Wall, corners: Record<string, Corner>): number {
    const start = corners[wall.startCorner];
    const end = corners[wall.endCorner];
    if (!start || !end) return 0;
    return this.distance(start, end);
  }

  /**
   * Get wall center point
   */
  static wallCenter(wall: Wall, corners: Record<string, Corner>): Point2D | null {
    const start = corners[wall.startCorner];
    const end = corners[wall.endCorner];
    if (!start || !end) return null;
    
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  static screenToWorld(
    screenPoint: Point2D,
    canvas: HTMLCanvasElement,
    camera: { x: number; y: number; zoom: number }
  ): Point2D {
    const rect = canvas.getBoundingClientRect();
    const canvasX = screenPoint.x - rect.left;
    const canvasY = screenPoint.y - rect.top;

    return {
      x: (canvasX - canvas.width / 2) / camera.zoom + camera.x,
      y: (canvasY - canvas.height / 2) / camera.zoom + camera.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  static worldToScreen(
    worldPoint: Point2D,
    canvas: HTMLCanvasElement,
    camera: { x: number; y: number; zoom: number }
  ): Point2D {
    return {
      x: (worldPoint.x - camera.x) * camera.zoom + canvas.width / 2,
      y: (worldPoint.y - camera.y) * camera.zoom + canvas.height / 2,
    };
  }
}

export class GeometryUtils {
  /**
   * Find rooms using a simple cycle detection algorithm
   * This is a simplified version of the blueprint3d room detection
   */
  static findRooms(corners: Record<string, Corner>, walls: Record<string, Wall>): string[][] {
    const rooms: string[][] = [];
    const visited = new Set<string>();

    // For each corner, try to find the smallest cycle
    for (const cornerId in corners) {
      if (visited.has(cornerId)) continue;

      const cycle = this.findSmallestCycle(cornerId, corners, walls);
      if (cycle.length >= 3) {
        rooms.push(cycle);
        cycle.forEach(id => visited.add(id));
      }
    }

    return rooms;
  }

  /**
   * Find the smallest cycle starting from a corner
   */
  private static findSmallestCycle(
    startCorner: string,
    corners: Record<string, Corner>,
    walls: Record<string, Wall>
  ): string[] {
    // This is a simplified implementation
    // A full implementation would use proper graph algorithms
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (cornerId: string): boolean => {
      if (visited.has(cornerId)) {
        const cycleStart = path.indexOf(cornerId);
        if (cycleStart !== -1) {
          return true;
        }
        return false;
      }

      visited.add(cornerId);
      path.push(cornerId);

      const corner = corners[cornerId];
      for (const wallId of corner.adjacentWalls) {
        const wall = walls[wallId];
        const nextCorner = wall.startCorner === cornerId ? wall.endCorner : wall.startCorner;
        
        if (dfs(nextCorner)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    dfs(startCorner);
    return path;
  }

  /**
   * Calculate polygon area (for room area calculation)
   */
  static polygonArea(points: Point2D[]): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * Calculate polygon centroid
   */
  static polygonCentroid(points: Point2D[]): Point2D {
    if (points.length === 0) return { x: 0, y: 0 };
    
    let x = 0;
    let y = 0;
    for (const point of points) {
      x += point.x;
      y += point.y;
    }
    
    return {
      x: x / points.length,
      y: y / points.length,
    };
  }
}
