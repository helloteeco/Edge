import type { DesignStyle, RoomType } from "./types";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  style: DesignStyle;
  targetGuests: number;
  rooms: TemplateRoom[];
}

interface TemplateRoom {
  name: string;
  type: RoomType;
  widthFt: number;
  lengthFt: number;
  ceilingHeightFt: number;
  floor: number;
  features: string[];
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: "mountain-cabin-8",
    name: "Mountain Cabin (8 Guests)",
    description: "Cozy 3BR cabin with loft. Great for small groups and families.",
    style: "mountain-lodge",
    targetGuests: 8,
    rooms: [
      { name: "Primary Suite", type: "primary-bedroom", widthFt: 14, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: ["En-suite", "Closet", "Window"] },
      { name: "Bunk Room", type: "bedroom", widthFt: 12, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: ["Closet", "Window"] },
      { name: "Loft Bedroom", type: "loft", widthFt: 16, lengthFt: 14, ceilingHeightFt: 8, floor: 2, features: ["Vaulted Ceiling"] },
      { name: "Great Room", type: "living-room", widthFt: 20, lengthFt: 18, ceilingHeightFt: 16, floor: 1, features: ["Fireplace", "Vaulted Ceiling", "Window"] },
      { name: "Kitchen", type: "kitchen", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Dining Area", type: "dining-room", widthFt: 12, lengthFt: 10, ceilingHeightFt: 9, floor: 1, features: ["Window"] },
      { name: "Primary Bathroom", type: "bathroom", widthFt: 10, lengthFt: 8, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Hall Bathroom", type: "bathroom", widthFt: 8, lengthFt: 6, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Deck", type: "outdoor", widthFt: 20, lengthFt: 12, ceilingHeightFt: 10, floor: 1, features: [] },
    ],
  },
  {
    id: "large-cabin-16",
    name: "Large Mountain Lodge (16 Guests)",
    description: "Spacious 5BR lodge with game room. Perfect for big groups and retreats.",
    style: "mountain-lodge",
    targetGuests: 16,
    rooms: [
      { name: "Primary Suite", type: "primary-bedroom", widthFt: 16, lengthFt: 16, ceilingHeightFt: 10, floor: 1, features: ["En-suite", "Walk-in Closet", "Fireplace", "Window"] },
      { name: "Bunk Room 1", type: "bedroom", widthFt: 14, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: ["Closet", "Window"] },
      { name: "Bunk Room 2", type: "bedroom", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 2, features: ["Closet", "Window"] },
      { name: "Queen Room", type: "bedroom", widthFt: 12, lengthFt: 12, ceilingHeightFt: 9, floor: 2, features: ["Closet", "Window"] },
      { name: "Loft Bedroom", type: "loft", widthFt: 18, lengthFt: 16, ceilingHeightFt: 9, floor: 3, features: ["Vaulted Ceiling", "Skylight"] },
      { name: "Great Room", type: "living-room", widthFt: 24, lengthFt: 20, ceilingHeightFt: 18, floor: 1, features: ["Fireplace", "Vaulted Ceiling", "Window"] },
      { name: "Game Room", type: "game-room", widthFt: 18, lengthFt: 16, ceilingHeightFt: 9, floor: 0, features: ["Window"] },
      { name: "Kitchen", type: "kitchen", widthFt: 16, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Dining Room", type: "dining-room", widthFt: 16, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: ["Window"] },
      { name: "Primary Bathroom", type: "bathroom", widthFt: 12, lengthFt: 10, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Bathroom 2", type: "bathroom", widthFt: 8, lengthFt: 8, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Bathroom 3", type: "bathroom", widthFt: 8, lengthFt: 8, ceilingHeightFt: 9, floor: 2, features: [] },
      { name: "Half Bath", type: "bathroom", widthFt: 6, lengthFt: 5, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Wrap Deck", type: "outdoor", widthFt: 30, lengthFt: 12, ceilingHeightFt: 10, floor: 1, features: [] },
    ],
  },
  {
    id: "beach-house-12",
    name: "Beach House (12 Guests)",
    description: "Bright 4BR coastal home with ocean views. Ideal for beach vacations.",
    style: "coastal",
    targetGuests: 12,
    rooms: [
      { name: "Primary Suite", type: "primary-bedroom", widthFt: 14, lengthFt: 14, ceilingHeightFt: 9, floor: 2, features: ["En-suite", "Balcony", "Window"] },
      { name: "Bunk Room", type: "bedroom", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: ["Closet", "Window"] },
      { name: "Guest Room 1", type: "bedroom", widthFt: 12, lengthFt: 12, ceilingHeightFt: 9, floor: 2, features: ["Closet", "Window"] },
      { name: "Guest Room 2", type: "bedroom", widthFt: 12, lengthFt: 11, ceilingHeightFt: 9, floor: 2, features: ["Closet"] },
      { name: "Living Room", type: "living-room", widthFt: 18, lengthFt: 16, ceilingHeightFt: 10, floor: 1, features: ["Window", "Vaulted Ceiling"] },
      { name: "Kitchen", type: "kitchen", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Dining Area", type: "dining-room", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: ["Window"] },
      { name: "Den / Media Room", type: "den", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Primary Bath", type: "bathroom", widthFt: 10, lengthFt: 8, ceilingHeightFt: 9, floor: 2, features: [] },
      { name: "Guest Bath", type: "bathroom", widthFt: 8, lengthFt: 6, ceilingHeightFt: 9, floor: 2, features: [] },
      { name: "Pool Bath", type: "bathroom", widthFt: 8, lengthFt: 6, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Pool Deck", type: "outdoor", widthFt: 24, lengthFt: 16, ceilingHeightFt: 10, floor: 1, features: [] },
    ],
  },
  {
    id: "lakehouse-12",
    name: "Lakehouse (12 Guests)",
    description: "Rustic-modern 4BR lakefront property with dock access.",
    style: "rustic",
    targetGuests: 12,
    rooms: [
      { name: "Primary Suite", type: "primary-bedroom", widthFt: 16, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: ["En-suite", "Window", "Walk-in Closet"] },
      { name: "Bunk Room", type: "bedroom", widthFt: 14, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: ["Closet", "Window"] },
      { name: "Queen Room", type: "bedroom", widthFt: 12, lengthFt: 12, ceilingHeightFt: 9, floor: 2, features: ["Closet", "Window"] },
      { name: "Lake View Loft", type: "loft", widthFt: 16, lengthFt: 14, ceilingHeightFt: 9, floor: 2, features: ["Vaulted Ceiling", "Window"] },
      { name: "Great Room", type: "living-room", widthFt: 22, lengthFt: 18, ceilingHeightFt: 16, floor: 1, features: ["Fireplace", "Vaulted Ceiling", "Window"] },
      { name: "Kitchen", type: "kitchen", widthFt: 14, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Dining Room", type: "dining-room", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: ["Window"] },
      { name: "Primary Bath", type: "bathroom", widthFt: 10, lengthFt: 8, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Bathroom 2", type: "bathroom", widthFt: 8, lengthFt: 8, ceilingHeightFt: 9, floor: 2, features: [] },
      { name: "Half Bath", type: "bathroom", widthFt: 6, lengthFt: 5, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Lake Deck", type: "outdoor", widthFt: 24, lengthFt: 14, ceilingHeightFt: 10, floor: 1, features: [] },
    ],
  },
  {
    id: "urban-condo-6",
    name: "Urban Condo (6 Guests)",
    description: "Modern 2BR city apartment. Great for couples and small groups.",
    style: "modern",
    targetGuests: 6,
    rooms: [
      { name: "Primary Bedroom", type: "primary-bedroom", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: ["En-suite", "Closet", "Window"] },
      { name: "Guest Bedroom", type: "bedroom", widthFt: 12, lengthFt: 11, ceilingHeightFt: 9, floor: 1, features: ["Closet", "Window"] },
      { name: "Living Room", type: "living-room", widthFt: 16, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: ["Window"] },
      { name: "Kitchen", type: "kitchen", widthFt: 12, lengthFt: 10, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Primary Bath", type: "bathroom", widthFt: 8, lengthFt: 8, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Guest Bath", type: "bathroom", widthFt: 8, lengthFt: 6, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Balcony", type: "outdoor", widthFt: 10, lengthFt: 6, ceilingHeightFt: 9, floor: 1, features: [] },
    ],
  },
  {
    id: "farmhouse-20",
    name: "Large Farmhouse (20 Guests)",
    description: "Sprawling 7BR farmhouse with wraparound porch. Perfect for events and large groups.",
    style: "farmhouse",
    targetGuests: 20,
    rooms: [
      { name: "Primary Suite", type: "primary-bedroom", widthFt: 18, lengthFt: 16, ceilingHeightFt: 10, floor: 1, features: ["En-suite", "Walk-in Closet", "Fireplace", "Window"] },
      { name: "Bunk Room 1", type: "bedroom", widthFt: 16, lengthFt: 14, ceilingHeightFt: 9, floor: 2, features: ["Closet", "Window"] },
      { name: "Bunk Room 2", type: "bedroom", widthFt: 14, lengthFt: 14, ceilingHeightFt: 9, floor: 2, features: ["Closet", "Window"] },
      { name: "Bunk Room 3", type: "bedroom", widthFt: 14, lengthFt: 12, ceilingHeightFt: 9, floor: 2, features: ["Closet", "Window"] },
      { name: "Queen Room 1", type: "bedroom", widthFt: 12, lengthFt: 12, ceilingHeightFt: 9, floor: 1, features: ["Closet", "Window"] },
      { name: "Queen Room 2", type: "bedroom", widthFt: 12, lengthFt: 12, ceilingHeightFt: 9, floor: 2, features: ["Closet", "Window"] },
      { name: "Bonus Room", type: "bonus-room", widthFt: 16, lengthFt: 14, ceilingHeightFt: 9, floor: 2, features: ["Window"] },
      { name: "Great Room", type: "living-room", widthFt: 24, lengthFt: 22, ceilingHeightFt: 12, floor: 1, features: ["Fireplace", "Vaulted Ceiling", "Window"] },
      { name: "Kitchen", type: "kitchen", widthFt: 18, lengthFt: 16, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Dining Room", type: "dining-room", widthFt: 18, lengthFt: 14, ceilingHeightFt: 9, floor: 1, features: ["Window"] },
      { name: "Game Room", type: "game-room", widthFt: 16, lengthFt: 14, ceilingHeightFt: 9, floor: 0, features: [] },
      { name: "Primary Bath", type: "bathroom", widthFt: 12, lengthFt: 10, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Bath 2", type: "bathroom", widthFt: 10, lengthFt: 8, ceilingHeightFt: 9, floor: 2, features: [] },
      { name: "Bath 3", type: "bathroom", widthFt: 8, lengthFt: 8, ceilingHeightFt: 9, floor: 2, features: [] },
      { name: "Half Bath", type: "bathroom", widthFt: 6, lengthFt: 5, ceilingHeightFt: 9, floor: 1, features: [] },
      { name: "Wraparound Porch", type: "outdoor", widthFt: 40, lengthFt: 12, ceilingHeightFt: 10, floor: 1, features: [] },
    ],
  },
];
