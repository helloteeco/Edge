import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izyfqnavncdcdwkldlih.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string;
}

export interface SavedProperty {
  id: string;
  user_email: string;
  address: string;
  saved_at: string;
  notes: string;
  annual_revenue: number | null;
  cash_on_cash: number | null;
  monthly_net_cash_flow: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  guest_count: number | null;
}

// User functions
export async function upsertUser(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .single();
  
  if (existingUser) {
    // Update last login
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    
    console.log(`[Supabase] Returning user: ${normalizedEmail}`);
    return updatedUser;
  }
  
  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ email: normalizedEmail })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  
  console.log(`[Supabase] New user: ${normalizedEmail}`);
  return newUser;
}

export async function getUser(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();
  
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  
  return data;
}

// Saved properties functions
export async function getSavedProperties(email: string): Promise<SavedProperty[]> {
  const { data, error } = await supabase
    .from('saved_properties')
    .select('*')
    .eq('user_email', email.toLowerCase().trim())
    .order('saved_at', { ascending: false });
  
  if (error) {
    console.error('Error getting saved properties:', error);
    return [];
  }
  
  return data || [];
}

export async function saveProperty(
  email: string,
  property: {
    address: string;
    notes?: string;
    annual_revenue?: number;
    cash_on_cash?: number;
    monthly_net_cash_flow?: number;
    bedrooms?: number;
    bathrooms?: number;
    guest_count?: number;
  }
): Promise<SavedProperty | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if property already exists for this user
  const { data: existingProperty } = await supabase
    .from('saved_properties')
    .select('*')
    .eq('user_email', normalizedEmail)
    .eq('address', property.address)
    .single();
  
  if (existingProperty) {
    // Update existing property
    const { data: updatedProperty, error } = await supabase
      .from('saved_properties')
      .update({
        notes: property.notes ?? existingProperty.notes,
        annual_revenue: property.annual_revenue ?? existingProperty.annual_revenue,
        cash_on_cash: property.cash_on_cash ?? existingProperty.cash_on_cash,
        monthly_net_cash_flow: property.monthly_net_cash_flow ?? existingProperty.monthly_net_cash_flow,
        bedrooms: property.bedrooms ?? existingProperty.bedrooms,
        bathrooms: property.bathrooms ?? existingProperty.bathrooms,
        guest_count: property.guest_count ?? existingProperty.guest_count,
        saved_at: new Date().toISOString(),
      })
      .eq('id', existingProperty.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating property:', error);
      return null;
    }
    
    return updatedProperty;
  }
  
  // Insert new property
  const { data: newProperty, error } = await supabase
    .from('saved_properties')
    .insert({
      user_email: normalizedEmail,
      address: property.address,
      notes: property.notes || '',
      annual_revenue: property.annual_revenue,
      cash_on_cash: property.cash_on_cash,
      monthly_net_cash_flow: property.monthly_net_cash_flow,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      guest_count: property.guest_count,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving property:', error);
    return null;
  }
  
  return newProperty;
}

export async function removeProperty(email: string, propertyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_properties')
    .delete()
    .eq('user_email', email.toLowerCase().trim())
    .eq('id', propertyId);
  
  if (error) {
    console.error('Error removing property:', error);
    return false;
  }
  
  return true;
}

export async function updatePropertyNotes(
  email: string,
  propertyId: string,
  notes: string
): Promise<boolean> {
  const { error } = await supabase
    .from('saved_properties')
    .update({ notes })
    .eq('user_email', email.toLowerCase().trim())
    .eq('id', propertyId);
  
  if (error) {
    console.error('Error updating notes:', error);
    return false;
  }
  
  return true;
}

// Get all users (for admin)
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error getting all users:', error);
    return [];
  }
  
  return data || [];
}

// Get user count
export async function getUserCount(): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
  
  return count || 0;
}


// ============================================
// CREDIT SYSTEM - Secure server-side only
// ============================================

export interface UserCredits {
  email: string;
  credits_used: number;
  credits_limit: number;
  credits_remaining: number;
}

// Get user's credit balance (server-side validation)
export async function getUserCredits(email: string): Promise<UserCredits | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data, error } = await supabase
    .from('users')
    .select('email, credits_used, credits_limit')
    .eq('email', normalizedEmail)
    .single();
  
  if (error || !data) {
    console.error('Error getting user credits:', error);
    return null;
  }
  
  return {
    email: data.email,
    credits_used: data.credits_used || 0,
    credits_limit: data.credits_limit || 3,
    credits_remaining: (data.credits_limit || 3) - (data.credits_used || 0),
  };
}

// Check if user has available credits (server-side)
export async function hasAvailableCredits(email: string): Promise<boolean> {
  const credits = await getUserCredits(email);
  if (!credits) return false;
  return credits.credits_remaining > 0;
}

// Deduct one credit from user (server-side, atomic operation)
export async function deductCredit(email: string): Promise<{ success: boolean; remaining: number; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // First check current credits
  const credits = await getUserCredits(normalizedEmail);
  if (!credits) {
    return { success: false, remaining: 0, error: 'User not found' };
  }
  
  if (credits.credits_remaining <= 0) {
    return { success: false, remaining: 0, error: 'No credits remaining' };
  }
  
  // Atomic increment of credits_used
  const { data, error } = await supabase
    .from('users')
    .update({ credits_used: credits.credits_used + 1 })
    .eq('email', normalizedEmail)
    .select('credits_used, credits_limit')
    .single();
  
  if (error) {
    console.error('Error deducting credit:', error);
    return { success: false, remaining: credits.credits_remaining, error: 'Database error' };
  }
  
  const remaining = (data.credits_limit || 3) - (data.credits_used || 0);
  console.log(`[Credits] Deducted 1 credit from ${normalizedEmail}. Remaining: ${remaining}`);
  
  return { success: true, remaining };
}

// Refund one credit to user (for market mismatch)
export async function refundCredit(email: string): Promise<{ success: boolean; remaining: number; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Get current credits
  const credits = await getUserCredits(normalizedEmail);
  if (!credits) {
    return { success: false, remaining: 0, error: 'User not found' };
  }
  
  // Only refund if they've used at least 1 credit
  if (credits.credits_used <= 0) {
    return { success: false, remaining: credits.credits_remaining, error: 'No credits to refund' };
  }
  
  // Decrement credits_used (effectively refunding 1 credit)
  const { data, error } = await supabase
    .from('users')
    .update({ credits_used: credits.credits_used - 1 })
    .eq('email', normalizedEmail)
    .select('credits_used, credits_limit')
    .single();
  
  if (error) {
    console.error('Error refunding credit:', error);
    return { success: false, remaining: credits.credits_remaining, error: 'Database error' };
  }
  
  const remaining = (data.credits_limit || 3) - (data.credits_used || 0);
  console.log(`[Credits] Refunded 1 credit to ${normalizedEmail}. Remaining: ${remaining}`);
  
  return { success: true, remaining };
}

// Add credits to user (for purchases)
export async function addCredits(email: string, amount: number): Promise<{ success: boolean; new_limit: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data: user } = await supabase
    .from('users')
    .select('credits_limit')
    .eq('email', normalizedEmail)
    .single();
  
  if (!user) {
    return { success: false, new_limit: 0 };
  }
  
  const newLimit = (user.credits_limit || 3) + amount;
  
  const { error } = await supabase
    .from('users')
    .update({ credits_limit: newLimit })
    .eq('email', normalizedEmail);
  
  if (error) {
    console.error('Error adding credits:', error);
    return { success: false, new_limit: user.credits_limit || 3 };
  }
  
  console.log(`[Credits] Added ${amount} credits to ${normalizedEmail}. New limit: ${newLimit}`);
  return { success: true, new_limit: newLimit };
}

// ============================================
// PROPERTY CACHE - 90-day TTL
// ============================================

export interface CachedProperty {
  id: string;
  address: string;
  data: Record<string, unknown>;
  created_at: string;
  expires_at: string;
}

// Get cached property data (if not expired)
export async function getCachedProperty(address: string): Promise<Record<string, unknown> | null> {
  const normalizedAddress = address.trim();
  
  // Delete expired cache entries first
  await supabase
    .from('property_cache')
    .delete()
    .lt('expires_at', new Date().toISOString());
  
  // Check for valid cache
  const { data, error } = await supabase
    .from('property_cache')
    .select('*')
    .eq('address', normalizedAddress)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error || !data) {
    return null;
  }
  
  console.log(`[Cache] Hit for: ${normalizedAddress}`);
  return data.data;
}

// Cache property data (90-day TTL)
export async function cacheProperty(address: string, data: Record<string, unknown>): Promise<boolean> {
  const normalizedAddress = address.trim();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days
  
  // Upsert cache entry
  const { error } = await supabase
    .from('property_cache')
    .upsert({
      address: normalizedAddress,
      data,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    }, {
      onConflict: 'address',
    });
  
  if (error) {
    console.error('Error caching property:', error);
    return false;
  }
  
  console.log(`[Cache] Stored for: ${normalizedAddress} (expires: ${expiresAt})`);
  return true;
}

// Clean up expired cache entries
export async function cleanExpiredCache(): Promise<number> {
  const { data, error } = await supabase
    .from('property_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select();
  
  if (error) {
    console.error('Error cleaning cache:', error);
    return 0;
  }
  
  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[Cache] Cleaned ${count} expired entries`);
  }
  return count;
}


// ============================================
// MARKET SAVE COUNTS - Track saves per city/state
// ============================================

export interface MarketSaveCount {
  market_id: string;
  market_type: 'city' | 'state';
  save_count: number;
}

// Increment save count for a market (city or state)
export async function incrementMarketSaveCount(
  marketId: string, 
  marketType: 'city' | 'state'
): Promise<boolean> {
  const normalizedId = marketId.toLowerCase().trim();
  
  // Try to get existing record
  const { data: existing } = await supabase
    .from('market_save_counts')
    .select('*')
    .eq('market_id', normalizedId)
    .eq('market_type', marketType)
    .single();
  
  if (existing) {
    // Increment existing count
    const { error } = await supabase
      .from('market_save_counts')
      .update({ 
        save_count: existing.save_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('market_id', normalizedId)
      .eq('market_type', marketType);
    
    if (error) {
      console.error('Error incrementing market save count:', error);
      return false;
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from('market_save_counts')
      .insert({
        market_id: normalizedId,
        market_type: marketType,
        save_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error creating market save count:', error);
      return false;
    }
  }
  
  console.log(`[SaveCount] Incremented ${marketType} ${normalizedId}`);
  return true;
}

// Decrement save count for a market (when unsaved)
export async function decrementMarketSaveCount(
  marketId: string, 
  marketType: 'city' | 'state'
): Promise<boolean> {
  const normalizedId = marketId.toLowerCase().trim();
  
  const { data: existing } = await supabase
    .from('market_save_counts')
    .select('*')
    .eq('market_id', normalizedId)
    .eq('market_type', marketType)
    .single();
  
  if (existing && existing.save_count > 0) {
    const { error } = await supabase
      .from('market_save_counts')
      .update({ 
        save_count: existing.save_count - 1,
        updated_at: new Date().toISOString()
      })
      .eq('market_id', normalizedId)
      .eq('market_type', marketType);
    
    if (error) {
      console.error('Error decrementing market save count:', error);
      return false;
    }
    
    console.log(`[SaveCount] Decremented ${marketType} ${normalizedId}`);
  }
  
  return true;
}

// Get save count for a single market
export async function getMarketSaveCount(
  marketId: string, 
  marketType: 'city' | 'state'
): Promise<number> {
  const normalizedId = marketId.toLowerCase().trim();
  
  const { data, error } = await supabase
    .from('market_save_counts')
    .select('save_count')
    .eq('market_id', normalizedId)
    .eq('market_type', marketType)
    .single();
  
  if (error || !data) {
    return 0;
  }
  
  return data.save_count;
}

// Get save counts for multiple markets (batch)
export async function getMarketSaveCounts(
  marketIds: string[], 
  marketType: 'city' | 'state'
): Promise<Record<string, number>> {
  const normalizedIds = marketIds.map(id => id.toLowerCase().trim());
  
  const { data, error } = await supabase
    .from('market_save_counts')
    .select('market_id, save_count')
    .eq('market_type', marketType)
    .in('market_id', normalizedIds);
  
  if (error || !data) {
    return {};
  }
  
  const counts: Record<string, number> = {};
  data.forEach(item => {
    counts[item.market_id] = item.save_count;
  });
  
  return counts;
}

// Get top saved markets
export async function getTopSavedMarkets(
  marketType: 'city' | 'state',
  limit: number = 10
): Promise<MarketSaveCount[]> {
  const { data, error } = await supabase
    .from('market_save_counts')
    .select('*')
    .eq('market_type', marketType)
    .order('save_count', { ascending: false })
    .limit(limit);
  
  if (error || !data) {
    return [];
  }
  
  return data;
}
