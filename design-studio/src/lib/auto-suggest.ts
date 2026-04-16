import { CATALOG } from "./furniture-catalog";
import type { Room, FurnitureItem, DesignStyle } from "./types";

/**
 * Auto-suggests furniture items for a room based on:
 * - Room type (bedroom gets beds, living room gets seating, etc.)
 * - Design style preference
 * - Room size
 *
 * Returns a curated list of suggestions that the designer can one-click add.
 */
export function suggestFurniture(
  room: Room,
  style: DesignStyle
): FurnitureItem[] {
  const suggestions: FurnitureItem[] = [];

  // Map room types to relevant furniture categories
  const categoryMap: Record<string, string[]> = {
    "primary-bedroom": ["beds-mattresses", "tables", "lighting", "rugs-textiles", "decor", "storage"],
    bedroom: ["beds-mattresses", "tables", "lighting", "rugs-textiles", "decor"],
    loft: ["beds-mattresses", "seating", "lighting", "decor"],
    "bonus-room": ["beds-mattresses", "seating", "tables", "lighting"],
    "living-room": ["seating", "tables", "lighting", "rugs-textiles", "decor"],
    "dining-room": ["tables", "seating", "lighting", "decor"],
    kitchen: ["kitchen-dining", "lighting"],
    den: ["seating", "tables", "lighting", "decor", "beds-mattresses"],
    office: ["tables", "seating", "lighting", "storage"],
    "media-room": ["seating", "tables", "lighting", "decor"],
    "game-room": ["seating", "tables", "lighting"],
    bathroom: ["bathroom"],
    outdoor: ["outdoor", "lighting"],
    hallway: ["lighting", "decor", "storage"],
  };

  // Subcategory priorities for each room type
  const subcategoryPriority: Record<string, string[]> = {
    "primary-bedroom": ["Bed Frames", "Mattresses", "Nightstands", "Table Lamps", "Area Rugs", "Dressers", "Pillows & Throws", "Wall Art"],
    bedroom: ["Bunk Beds", "Bed Frames", "Mattresses", "Nightstands", "Table Lamps", "Area Rugs"],
    "living-room": ["Sofas", "Coffee Tables", "Floor Lamps", "Area Rugs", "Accent Chairs", "Side Tables", "Pillows & Throws", "Wall Art", "Plants"],
    "dining-room": ["Dining Tables", "Dining Chairs", "Pendants"],
    kitchen: ["Dinnerware", "Flatware", "Cookware", "Cutlery"],
    bathroom: ["Towels", "Shower Curtains", "Bath Mats", "Accessories"],
    outdoor: ["Conversation Sets", "Dining Sets", "Fire Pits", "Loungers", "Outdoor Lighting"],
    den: ["Sofa Beds", "Side Tables", "Floor Lamps", "Area Rugs"],
    office: ["Console Tables", "Accent Chairs", "Table Lamps"],
  };

  const relevantCategories = categoryMap[room.type] ?? ["decor", "lighting"];
  const prioritySubs = subcategoryPriority[room.type] ?? [];

  // Filter catalog by relevant categories
  const pool = CATALOG.filter((item) =>
    relevantCategories.includes(item.category)
  );

  // Score items: prefer matching style, then priority subcategories
  const scored = pool.map((item) => {
    let score = 0;
    if (item.style === style) score += 10;
    const subIdx = prioritySubs.indexOf(item.subcategory);
    if (subIdx >= 0) score += 20 - subIdx; // higher for earlier in priority list
    if (relevantCategories.indexOf(item.category) === 0) score += 5; // primary category
    return { item, score };
  });

  // Sort by score and deduplicate by subcategory (pick top per sub)
  scored.sort((a, b) => b.score - a.score);

  const seenSubs = new Set<string>();
  for (const { item } of scored) {
    if (seenSubs.has(item.subcategory)) continue;
    seenSubs.add(item.subcategory);
    suggestions.push(item);
    if (suggestions.length >= 8) break;
  }

  return suggestions;
}

/**
 * Generate a complete furniture package for the whole project.
 * One-click setup for the furniture tab.
 */
export function suggestFullPackage(
  rooms: Room[],
  style: DesignStyle
): Map<string, FurnitureItem[]> {
  const result = new Map<string, FurnitureItem[]>();
  for (const room of rooms) {
    result.set(room.id, suggestFurniture(room, style));
  }
  return result;
}
