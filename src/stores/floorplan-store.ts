import { create } from 'zustand';
import { FloorplanData, EditorMode, ViewMode, Corner, Wall, Room, Item3D, AppConfig } from '@/types';

interface FloorplanStore {
  // State
  floorplan: FloorplanData;
  editorMode: EditorMode;
  viewMode: ViewMode;
  selectedItems: string[];
  activeCorner: Corner | null;
  activeWall: Wall | null;
  config: AppConfig;

  // Computed getters
  corners: Corner[];
  walls: Wall[];
  rooms: Room[];
  items: Item3D[];

  // Actions
  setEditorMode: (mode: EditorMode) => void;
  setViewMode: (mode: ViewMode) => void;
  
  // Corner operations
  addCorner: (corner: Corner) => void;
  moveCorner: (id: string, x: number, y: number) => void;
  removeCorner: (id: string) => void;
  setActiveCorner: (corner: Corner | null) => void;
  
  // Wall operations
  addWall: (wall: Wall) => void;
  removeWall: (id: string) => void;
  setActiveWall: (wall: Wall | null) => void;
  
  // Room operations
  updateRooms: () => void;
  
  // Item operations
  addItem: (item: Omit<Item3D, 'id'>) => string;
  moveItem: (id: string, position: { x: number; y: number; z: number }) => void;
  rotateItem: (id: string, rotation: { x: number; y: number; z: number }) => void;
  scaleItem: (id: string, scale: { x: number; y: number; z: number }) => void;
  removeItem: (id: string) => void;
  
  // Selection
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  clearSelection: () => void;
  
  // Persistence
  saveFloorplan: () => string;
  loadFloorplan: (data: string) => void;
  reset: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const defaultConfig: AppConfig = {
  wallHeight: 250,
  wallThickness: 10,
  gridSize: 20,
  snapTolerance: 15,
};

const initialFloorplan: FloorplanData = {
  corners: {},
  walls: {},
  rooms: {},
  items: {},
};

export const useFloorplanStore = create<FloorplanStore>((set, get) => ({
  // Initial state
  floorplan: initialFloorplan,
  editorMode: EditorMode.MOVE,
  viewMode: ViewMode.FLOORPLAN_2D,
  selectedItems: [],
  activeCorner: null,
  activeWall: null,
  config: defaultConfig,

  // Computed getters
  get corners() {
    return Object.values(get().floorplan.corners);
  },
  get walls() {
    return Object.values(get().floorplan.walls);
  },
  get rooms() {
    return Object.values(get().floorplan.rooms);
  },
  get items() {
    return Object.values(get().floorplan.items);
  },

  // Actions
  setEditorMode: (mode) => set({ editorMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),

  // Corner operations
  addCorner: (corner) => {
    set((state) => ({
      floorplan: {
        ...state.floorplan,
        corners: {
          ...state.floorplan.corners,
          [corner.id]: corner,
        },
      },
    }));
  },

  moveCorner: (id, x, y) => {
    set((state) => ({
      floorplan: {
        ...state.floorplan,
        corners: {
          ...state.floorplan.corners,
          [id]: {
            ...state.floorplan.corners[id],
            x,
            y,
          },
        },
      },
    }));
  },

  removeCorner: (id) => {
    set((state) => {
      const corner = state.floorplan.corners[id];
      if (!corner) return state;

      // Remove all walls connected to this corner
      const updatedWalls = { ...state.floorplan.walls };
      corner.adjacentWalls.forEach((wallId) => {
        delete updatedWalls[wallId];
      });

      const updatedCorners = { ...state.floorplan.corners };
      delete updatedCorners[id];

      return {
        floorplan: {
          ...state.floorplan,
          corners: updatedCorners,
          walls: updatedWalls,
        },
        activeCorner: state.activeCorner?.id === id ? null : state.activeCorner,
      };
    });
  },

  setActiveCorner: (corner) => set({ activeCorner: corner }),

  // Wall operations
  addWall: (wall) => {
    set((state) => ({
      floorplan: {
        ...state.floorplan,
        walls: {
          ...state.floorplan.walls,
          [wall.id]: wall,
        },
        corners: {
          ...state.floorplan.corners,
          [wall.startCorner]: {
            ...state.floorplan.corners[wall.startCorner],
            adjacentWalls: [...(state.floorplan.corners[wall.startCorner]?.adjacentWalls || []), wall.id],
          },
          [wall.endCorner]: {
            ...state.floorplan.corners[wall.endCorner],
            adjacentWalls: [...(state.floorplan.corners[wall.endCorner]?.adjacentWalls || []), wall.id],
          },
        },
      },
    }));
  },

  removeWall: (id) => {
    set((state) => {
      const wall = state.floorplan.walls[id];
      if (!wall) return state;

      const updatedWalls = { ...state.floorplan.walls };
      delete updatedWalls[id];

      // Remove wall from corners' adjacent walls
      const updatedCorners = { ...state.floorplan.corners };
      if (updatedCorners[wall.startCorner]) {
        updatedCorners[wall.startCorner] = {
          ...updatedCorners[wall.startCorner],
          adjacentWalls: updatedCorners[wall.startCorner].adjacentWalls.filter(wallId => wallId !== id),
        };
      }
      if (updatedCorners[wall.endCorner]) {
        updatedCorners[wall.endCorner] = {
          ...updatedCorners[wall.endCorner],
          adjacentWalls: updatedCorners[wall.endCorner].adjacentWalls.filter(wallId => wallId !== id),
        };
      }

      return {
        floorplan: {
          ...state.floorplan,
          corners: updatedCorners,
          walls: updatedWalls,
        },
        activeWall: state.activeWall?.id === id ? null : state.activeWall,
      };
    });
  },

  setActiveWall: (wall) => set({ activeWall: wall }),

  // Room operations
  updateRooms: () => {
    // TODO: Implement room detection algorithm
    console.log('Room detection not implemented yet');
  },

  // Item operations
  addItem: (item) => {
    const id = generateId();
    const newItem: Item3D = {
      ...item,
      id,
    };

    set((state) => ({
      floorplan: {
        ...state.floorplan,
        items: {
          ...state.floorplan.items,
          [id]: newItem,
        },
      },
    }));

    return id;
  },

  moveItem: (id, position) => {
    set((state) => ({
      floorplan: {
        ...state.floorplan,
        items: {
          ...state.floorplan.items,
          [id]: {
            ...state.floorplan.items[id],
            position,
          },
        },
      },
    }));
  },

  rotateItem: (id, rotation) => {
    set((state) => ({
      floorplan: {
        ...state.floorplan,
        items: {
          ...state.floorplan.items,
          [id]: {
            ...state.floorplan.items[id],
            rotation,
          },
        },
      },
    }));
  },

  scaleItem: (id, scale) => {
    set((state) => ({
      floorplan: {
        ...state.floorplan,
        items: {
          ...state.floorplan.items,
          [id]: {
            ...state.floorplan.items[id],
            scale,
          },
        },
      },
    }));
  },

  removeItem: (id) => {
    set((state) => {
      const updatedItems = { ...state.floorplan.items };
      delete updatedItems[id];

      return {
        floorplan: {
          ...state.floorplan,
          items: updatedItems,
        },
        selectedItems: state.selectedItems.filter(itemId => itemId !== id),
      };
    });
  },

  // Selection
  selectItem: (id) => {
    set((state) => ({
      selectedItems: [...state.selectedItems, id],
    }));
  },

  deselectItem: (id) => {
    set((state) => ({
      selectedItems: state.selectedItems.filter(itemId => itemId !== id),
    }));
  },

  clearSelection: () => set({ selectedItems: [] }),

  // Persistence
  saveFloorplan: () => {
    const { floorplan } = get();
    return JSON.stringify(floorplan);
  },

  loadFloorplan: (data) => {
    try {
      const floorplan = JSON.parse(data);
      set({ floorplan });
    } catch (error) {
      console.error('Failed to load floorplan:', error);
    }
  },

  reset: () => {
    set({
      floorplan: initialFloorplan,
      selectedItems: [],
      activeCorner: null,
      activeWall: null,
    });
  },
}));
