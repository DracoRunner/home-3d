export interface Point2D {
  x: number;
  y: number;
}

export interface Room {
  id: string;
  name: string;
  points: Point2D[];
  height: number;
  floorTexture?: string;
  wallTexture?: string;
}
