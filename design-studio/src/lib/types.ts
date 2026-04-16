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

export type ProjectType = "furnishing" | "renovation" | "full";

export type Trade =
  | "general-contractor"
  | "project-manager"
  | "plumbing"
  | "electrical"
  | "tile-installer"
  | "painter"
  | "flooring"
  | "cabinetry"
  | "countertop-fabricator"
  | "drywall"
  | "hvac"
  | "landscaper"
  | "handyman"
  | "lighting-specialist";

export type ProjectRole =
  | "lead-designer"
  | "junior-designer"
  | "project-manager"
  | "purchaser"
  | "installer"
  | "admin";

export interface Contractor {
  id: string;
  name: string;
  company: string;
  trade: Trade;
  email: string;
  phone: string;
  website?: string;
  /** Internal notes — rating, reliability, specialties */
  notes: string;
  /** Hourly or per-project rate info */
  rateNotes?: string;
  /** When added to the company's roster */
  addedAt: string;
}

export interface ProjectAssignment {
  /** Links to Contractor.id (for trades) or Profile.id (for design team) */
  assigneeId: string;
  /** Type of assignee */
  assigneeType: "contractor" | "designer";
  /** For designers: their role on this project */
  role?: ProjectRole;
  /** For contractors: their trade scope on this project */
  trade?: Trade;
  /** Specific rooms this person is responsible for (empty = all) */
  scopedRoomIds: string[];
  /** Specific finish categories they're handling (empty = all in their trade) */
  scopedCategories?: string[];
  /** Assignment notes */
  notes: string;
  /** Date assigned */
  assignedAt: string;
}

export type FinishCategory =
  | "flooring"
  | "wall-tile"
  | "floor-tile"
  | "backsplash"
  | "paint"
  | "countertops"
  | "cabinetry"
  | "hardware"
  | "plumbing-kitchen"
  | "plumbing-bath"
  | "shower-tub"
  | "toilet"
  | "lighting-fixtures"
  | "appliances"
  | "trim-molding"
  | "doors-windows"
  | "wall-treatment";

export type UnitOfMeasure =
  | "each"
  | "sqft"
  | "linear-ft"
  | "gallon"
  | "box"
  | "roll"
  | "set";

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
  /** Optional hospitality-grade flag for durability */
  hospitalityGrade?: boolean;
  /** Optional lead time in weeks */
  leadTimeWeeks?: number;
  /** Optional SKU / model number for POs */
  sku?: string;
}

// ── Renovation / Finish Schedule ──

export interface FinishItem {
  id: string;
  name: string;
  category: FinishCategory;
  subcategory: string;
  /** Unit price */
  price: number;
  /** Unit of measurement (sqft, each, etc) */
  unit: UnitOfMeasure;
  vendor: string;
  vendorUrl: string;
  /** Manufacturer name */
  manufacturer: string;
  /** Product SKU / model number */
  sku: string;
  /** Finish/color */
  color: string;
  /** Material */
  material: string;
  /** Recommended waste allowance percentage (e.g. 10 for tile, 0 for fixtures) */
  wasteAllowancePct: number;
  /** Lead time in weeks */
  leadTimeWeeks: number;
  /** Installation notes */
  installNotes: string;
  /** Design style */
  style: DesignStyle;
  /** Room types this is appropriate for */
  appropriateFor: RoomType[];
  imageUrl: string;
}

export interface SelectedFinish {
  item: FinishItem;
  /** Quantity (in the unit of measurement) */
  quantity: number;
  /** Computed total including waste allowance */
  totalWithWaste: number;
  /** Room ID this is scoped to */
  roomId: string;
  /** Designer notes */
  notes: string;
  /** ID of contractor assigned to install this finish */
  assignedContractorId?: string;
  /** Order status tracking */
  orderStatus?: "not-ordered" | "ordered" | "shipped" | "arrived" | "installed";
  /** Date ordered */
  orderedAt?: string;
  /** Expected arrival */
  expectedArrival?: string;
}

export interface RoomFinishes {
  /** Which room these finishes belong to */
  roomId: string;
  /** All selected finishes for this room */
  finishes: SelectedFinish[];
  /** Paint color for walls */
  wallPaint?: { name: string; hex: string; brand: string };
  /** Paint color for trim */
  trimPaint?: { name: string; hex: string; brand: string };
  /** Paint color for ceiling */
  ceilingPaint?: { name: string; hex: string; brand: string };
  /** General renovation notes for this room */
  renovationNotes: string;
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
  /** Project type: furnishing only, renovation only, or full (both) */
  projectType?: ProjectType;
  /** Renovation budget, separate from furnishing budget */
  renovationBudget?: number;
  /** Room-by-room finish selections */
  roomFinishes?: RoomFinishes[];
  /** All assignments — designers and contractors on this project */
  assignments?: ProjectAssignment[];
  /** Legacy single contractor (kept for backwards compat) */
  contractor?: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  /** Project kickoff date */
  kickoffDate?: string;
  /** Target completion date */
  targetCompletion?: string;
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
