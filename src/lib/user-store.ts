// User store for email collection and saved properties
// In production, replace with database storage (PostgreSQL, MongoDB, etc.)

import fs from 'fs';
import path from 'path';

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

// File path for persistent storage
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load users from file
function loadUsers(): Map<string, User> {
  ensureDataDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return new Map();
}

// Save users to file
function saveUsers(users: Map<string, User>) {
  ensureDataDir();
  try {
    const obj = Object.fromEntries(users);
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Global user store
let globalUserStore: Map<string, User> | null = null;

function getUserStore(): Map<string, User> {
  if (!globalUserStore) {
    globalUserStore = loadUsers();
  }
  return globalUserStore;
}

// Create or update user on login
export function upsertUser(email: string): User {
  const store = getUserStore();
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  
  let user = store.get(normalizedEmail);
  
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
  
  store.set(normalizedEmail, user);
  saveUsers(store);
  return user;
}

// Get user by email
export function getUser(email: string): User | undefined {
  const store = getUserStore();
  return store.get(email.toLowerCase().trim());
}

// Get all users (for admin export)
export function getAllUsers(): User[] {
  const store = getUserStore();
  return Array.from(store.values());
}

// Get email list for marketing
export function getEmailList(): { email: string; createdAt: string; lastLoginAt: string }[] {
  const store = getUserStore();
  return Array.from(store.values()).map(user => ({
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
    lastLoginAt: new Date(user.lastLoginAt).toISOString(),
  }));
}

// Save a property for a user
export function savePropertyForUser(email: string, property: SavedProperty): User | null {
  const store = getUserStore();
  const normalizedEmail = email.toLowerCase().trim();
  const user = store.get(normalizedEmail);
  
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
  
  store.set(normalizedEmail, user);
  saveUsers(store);
  return user;
}

// Remove a saved property
export function removePropertyForUser(email: string, propertyId: string): User | null {
  const store = getUserStore();
  const normalizedEmail = email.toLowerCase().trim();
  const user = store.get(normalizedEmail);
  
  if (!user) return null;
  
  user.savedProperties = user.savedProperties.filter(p => p.id !== propertyId);
  store.set(normalizedEmail, user);
  saveUsers(store);
  return user;
}

// Update notes for a saved property
export function updatePropertyNotes(email: string, propertyId: string, notes: string): User | null {
  const store = getUserStore();
  const normalizedEmail = email.toLowerCase().trim();
  const user = store.get(normalizedEmail);
  
  if (!user) return null;
  
  const property = user.savedProperties.find(p => p.id === propertyId);
  if (property) {
    property.notes = notes;
    store.set(normalizedEmail, user);
    saveUsers(store);
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
  const store = getUserStore();
  return store.size;
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
