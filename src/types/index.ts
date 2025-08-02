// Core geometry types
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Floorplan elements
export interface Corner {
  id: string;
  x: number;
  y: number;
  adjacentWalls: string[];
}

export interface Wall {
  id: string;
  startCorner: string;
  endCorner: string;
  thickness: number;
  height: number;
  frontTexture?: Texture;
  backTexture?: Texture;
}

export interface Room {
  id: string;
  corners: string[];
  floorTexture?: Texture;
  name?: string;
}

export interface Texture {
  url: string;
  scale: number;
  stretch?: boolean;
}

// 3D Items
export interface Item3D {
  id: string;
  name: string;
  modelUrl: string;
  position: Point3D;
  rotation: Point3D;
  scale: Point3D;
  roomId?: string;
  metadata: ItemMetadata;
}

export interface ItemMetadata {
  itemName: string;
  itemType: string;
  resizable: boolean;
  category: string;
}

// Floorplan state
export interface FloorplanData {
  corners: Record<string, Corner>;
  walls: Record<string, Wall>;
  rooms: Record<string, Room>;
  items: Record<string, Item3D>;
}

// Editor modes
export enum EditorMode {
  MOVE = 'move',
  DRAW = 'draw',
  DELETE = 'delete',
  PLACE_ITEM = 'place_item',
}

// View modes
export enum ViewMode {
  FLOORPLAN_2D = '2d',
  DESIGN_3D = '3d',
  BOTH = 'both',
}

// Configuration
export interface AppConfig {
  wallHeight: number;
  wallThickness: number;
  gridSize: number;
  snapTolerance: number;
}
