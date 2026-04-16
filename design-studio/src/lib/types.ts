export type RoomType =
  | "primary-bedroom"
  | "bedroom"
  | "loft"
  | "den"
  | "living-room"
  | "dining-room"
  | "kitchen"
  | "bathroom"
  | "outdoor"
  | "hallway"
  | "bonus-room"
  | "office"
  | "game-room"
  | "media-room";

export type BedType =
  | "king"
  | "queen"
  | "full"
  | "twin"
  | "queen-over-queen-bunk"
  | "twin-over-twin-bunk"
  | "twin-over-full-bunk"
  | "sofa-bed"
  | "murphy-bed"
  | "daybed-trundle";

export type FurnitureCategory =
  | "beds-mattresses"
  | "seating"
  | "tables"
  | "storage"
  | "lighting"
  | "decor"
  | "rugs-textiles"
  | "outdoor"
  | "kitchen-dining"
  | "bathroom";

export type DesignStyle =
  | "modern"
  | "farmhouse"
  | "coastal"
  | "bohemian"
  | "industrial"
  | "mid-century"
  | "scandinavian"
  | "traditional"
  | "rustic"
  | "contemporary"
  | "transitional"
  | "mountain-lodge";

export type ProjectStatus = "draft" | "in-progress" | "review" | "delivered";

export type WallTreatment =
  | "paint"
  | "wallpaper"
  | "shiplap"
  | "stone"
  | "wood-panel"
  | "tile";

// ── Core data models ──

export interface Client {
  name: string;
  email: string;
  phone: string;
  preferences: string;
}

export interface Property {
  address: string;
  city: string;
  state: string;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  matterportLink: string;
  polycamLink: string;
  spoakLink: string;
}

export interface BedItem {
  type: BedType;
  quantity: number;
  sleepsPerUnit: number;
}

export interface BedConfiguration {
  id: string;
  name: string;
  beds: BedItem[];
  totalSleeps: number;
  minWidthFt: number;
  minLengthFt: number;
  minCeilingFt: number;
  description: string;
  priority: number;
}

export interface AccentWall {
  color: string;
  treatment: WallTreatment;
  wall: "north" | "south" | "east" | "west";
}

export interface FurnitureItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  subcategory: string;
  widthIn: number;
  depthIn: number;
  heightIn: number;
  price: number;
  vendor: string;
  vendorUrl: string;
  imageUrl: string;
  color: string;
  material: string;
  style: DesignStyle;
}

export interface SelectedFurniture {
  item: FurnitureItem;
  quantity: number;
  roomId: string;
  notes: string;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  widthFt: number;
  lengthFt: number;
  ceilingHeightFt: number;
  floor: number;
  features: string[];
  selectedBedConfig: BedConfiguration | null;
  furniture: SelectedFurniture[];
  accentWall: AccentWall | null;
  notes: string;
}

export interface MoodBoard {
  id: string;
  name: string;
  style: DesignStyle;
  colorPalette: string[];
  inspirationNotes: string;
  imageUrls: string[];
}

export interface Project {
  id: string;
  name: string;
  client: Client;
  property: Property;
  rooms: Room[];
  moodBoards: MoodBoard[];
  targetGuests: number;
  style: DesignStyle;
  budget: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

// ── Sleep optimizer types ──

export interface RoomSleepResult {
  roomId: string;
  roomName: string;
  recommended: BedConfiguration;
  alternatives: BedConfiguration[];
}

export interface SleepOptimizationResult {
  roomResults: RoomSleepResult[];
  totalSleeps: number;
  targetGuests: number;
  targetMet: boolean;
  summary: string;
}

// ── Export types ──

export interface ExportRow {
  room: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  dimensions: string;
  vendor: string;
  vendorUrl: string;
  color: string;
  material: string;
  notes: string;
}

// ── Chat types ──

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

// ── Activity types ──

export interface ActivityEntry {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}
