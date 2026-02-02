// User store for email collection and saved properties
// Uses in-memory storage for serverless environments (Vercel)
// For persistent storage, integrate with a database (Vercel KV, Supabase, etc.)

export interface SavedProperty {
  id: string;
  address: string;
  savedAt: number;
  notes?: string;
  result?: {
    annualRevenue: number;
    cashOnCash: number;
    monthlyNetCashFlow: number;
    bedrooms?: number;
    bathrooms?: number;
    guestCount?: number;
  };
}

export interface User {
  email: string;
  createdAt: number;
  lastLoginAt: number;
  savedProperties: SavedProperty[];
}

// In-memory user store (resets on serverless cold starts)
// For production persistence, use Vercel KV, Supabase, or similar
const userStore = new Map<string, User>();

// Create or update user on login
export function upsertUser(email: string): User {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  
  let user = userStore.get(normalizedEmail);
  
  if (user) {
    // Update last login
    user.lastLoginAt = now;
  } else {
    // Create new user
    user = {
      email: normalizedEmail,
      createdAt: now,
      lastLoginAt: now,
      savedProperties: [],
    };
  }
  
  userStore.set(normalizedEmail, user);
  
  // Log for monitoring (visible in Vercel logs)
  console.log(`[User] ${user.createdAt === now ? 'New user' : 'Returning user'}: ${normalizedEmail}`);
  
  return user;
}

// Get user by email
export function getUser(email: string): User | undefined {
  return userStore.get(email.toLowerCase().trim());
}

// Get all users (for admin export)
export function getAllUsers(): User[] {
  return Array.from(userStore.values());
}

// Get email list for marketing
export function getEmailList(): { email: string; createdAt: string; lastLoginAt: string }[] {
  return Array.from(userStore.values()).map(user => ({
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
    lastLoginAt: new Date(user.lastLoginAt).toISOString(),
  }));
}

// Save a property for a user
export function savePropertyForUser(email: string, property: SavedProperty): User | null {
  const normalizedEmail = email.toLowerCase().trim();
  const user = userStore.get(normalizedEmail);
  
  if (!user) return null;
  
  // Check if property already exists
  const existingIndex = user.savedProperties.findIndex(p => p.address === property.address);
  
  if (existingIndex >= 0) {
    // Update existing property
    user.savedProperties[existingIndex] = {
      ...user.savedProperties[existingIndex],
      ...property,
      savedAt: Date.now(),
    };
  } else {
    // Add new property
    user.savedProperties.unshift({
      ...property,
      id: property.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      savedAt: Date.now(),
    });
  }
  
  userStore.set(normalizedEmail, user);
  return user;
}

// Remove a saved property
export function removePropertyForUser(email: string, propertyId: string): User | null {
  const normalizedEmail = email.toLowerCase().trim();
  const user = userStore.get(normalizedEmail);
  
  if (!user) return null;
  
  user.savedProperties = user.savedProperties.filter(p => p.id !== propertyId);
  userStore.set(normalizedEmail, user);
  return user;
}

// Update notes for a saved property
export function updatePropertyNotes(email: string, propertyId: string, notes: string): User | null {
  const normalizedEmail = email.toLowerCase().trim();
  const user = userStore.get(normalizedEmail);
  
  if (!user) return null;
  
  const property = user.savedProperties.find(p => p.id === propertyId);
  if (property) {
    property.notes = notes;
    userStore.set(normalizedEmail, user);
  }
  
  return user;
}

// Get saved properties for a user
export function getSavedProperties(email: string): SavedProperty[] {
  const user = getUser(email);
  return user?.savedProperties || [];
}

// Get user count
export function getUserCount(): number {
  return userStore.size;
}

// Export all data as CSV
export function exportUsersAsCSV(): string {
  const users = getAllUsers();
  const headers = ['Email', 'Created At', 'Last Login', 'Saved Properties Count'];
  const rows = users.map(user => [
    user.email,
    new Date(user.createdAt).toISOString(),
    new Date(user.lastLoginAt).toISOString(),
    user.savedProperties.length.toString(),
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
