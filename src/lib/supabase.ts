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
  custom_inputs: Record<string, unknown> | null;
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
    custom_inputs?: Record<string, unknown>;
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
        custom_inputs: property.custom_inputs ?? existingProperty.custom_inputs,
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
      custom_inputs: property.custom_inputs || null,
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

// ============================================
// LIMITED DATA LOCATIONS - Informed choice system
// ============================================

export interface LimitedDataLocation {
  id: string;
  city: string;
  state: string;
  searched_address: string | null;
  nearest_market_city: string | null;
  nearest_market_state: string | null;
  distance_miles: number | null;
  first_detected_at: string;
  last_checked_at: string;
  check_count: number;
  is_active: boolean;
  released_at: string | null;
  released_reason: string | null;
}

export interface LimitedDataInfo {
  hasLimitedData: boolean;
  nearestMarket: string | null;
  distanceMiles: number | null;
}

// Check if a location has limited data and get nearest market info
export async function checkLimitedDataLocation(city: string, state: string): Promise<LimitedDataInfo> {
  const normalizedCity = city.toLowerCase().trim();
  const normalizedState = state.toLowerCase().trim();
  
  const { data, error } = await supabase
    .from('limited_data_locations')
    .select('nearest_market_city, nearest_market_state, distance_miles, is_active')
    .eq('city', normalizedCity)
    .eq('state', normalizedState)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    return { hasLimitedData: false, nearestMarket: null, distanceMiles: null };
  }
  
  const nearestMarket = data.nearest_market_city && data.nearest_market_state
    ? `${data.nearest_market_city}, ${data.nearest_market_state}`
    : null;
  
  return {
    hasLimitedData: data.is_active,
    nearestMarket,
    distanceMiles: data.distance_miles,
  };
}

// Legacy function for backwards compatibility
export async function isLocationUnsupported(city: string, state: string): Promise<boolean> {
  const result = await checkLimitedDataLocation(city, state);
  return result.hasLimitedData;
}

// Add a location to the limited data list (on mismatch detection)
export async function addLimitedDataLocation(
  city: string,
  state: string,
  searchedAddress: string,
  nearestMarketCity: string,
  nearestMarketState: string,
  distanceMiles?: number
): Promise<boolean> {
  const normalizedCity = city.toLowerCase().trim();
  const normalizedState = state.toLowerCase().trim();
  const normalizedNearestCity = nearestMarketCity.toLowerCase().trim();
  const normalizedNearestState = nearestMarketState.toUpperCase().trim();
  
  // Check if already exists
  const { data: existing } = await supabase
    .from('limited_data_locations')
    .select('id, check_count')
    .eq('city', normalizedCity)
    .eq('state', normalizedState)
    .single();
  
  if (existing) {
    // Update check count and last_checked_at
    const { error } = await supabase
      .from('limited_data_locations')
      .update({
        last_checked_at: new Date().toISOString(),
        check_count: existing.check_count + 1,
        nearest_market_city: normalizedNearestCity,
        nearest_market_state: normalizedNearestState,
        distance_miles: distanceMiles || null,
        is_active: true,
        released_at: null,
        released_reason: null,
      })
      .eq('id', existing.id);
    
    if (error) {
      console.error('Error updating limited data location:', error);
      return false;
    }
    
    console.log(`[LimitedData] Updated: ${normalizedCity}, ${normalizedState} (check #${existing.check_count + 1})`);
    return true;
  }
  
  // Insert new entry
  const { error } = await supabase
    .from('limited_data_locations')
    .insert({
      city: normalizedCity,
      state: normalizedState,
      searched_address: searchedAddress,
      nearest_market_city: normalizedNearestCity,
      nearest_market_state: normalizedNearestState,
      distance_miles: distanceMiles || null,
    });
  
  if (error) {
    console.error('Error adding limited data location:', error);
    return false;
  }
  
  console.log(`[LimitedData] Added: ${normalizedCity}, ${normalizedState} -> nearest: ${normalizedNearestCity}, ${normalizedNearestState}`);
  return true;
}

// Legacy function for backwards compatibility
export async function addUnsupportedLocation(
  city: string,
  state: string,
  searchedAddress: string,
  returnedMarket: string
): Promise<boolean> {
  const marketParts = returnedMarket.split(',').map(p => p.trim());
  const nearestCity = marketParts[0] || '';
  const nearestState = marketParts[1] || '';
  return addLimitedDataLocation(city, state, searchedAddress, nearestCity, nearestState);
}

// Release a location (when data becomes available)
export async function releaseLimitedDataLocation(
  city: string,
  state: string,
  reason: string
): Promise<boolean> {
  const normalizedCity = city.toLowerCase().trim();
  const normalizedState = state.toLowerCase().trim();
  
  const { error } = await supabase
    .from('limited_data_locations')
    .update({
      is_active: false,
      released_at: new Date().toISOString(),
      released_reason: reason,
    })
    .eq('city', normalizedCity)
    .eq('state', normalizedState);
  
  if (error) {
    console.error('Error releasing location:', error);
    return false;
  }
  
  console.log(`[LimitedData] Released: ${normalizedCity}, ${normalizedState} - ${reason}`);
  return true;
}

// Legacy alias
export const releaseUnsupportedLocation = releaseLimitedDataLocation;

// Get all limited data locations (for admin)
export async function getAllLimitedDataLocations(): Promise<LimitedDataLocation[]> {
  const { data, error } = await supabase
    .from('limited_data_locations')
    .select('*')
    .order('check_count', { ascending: false });
  
  if (error || !data) {
    console.error('Error getting limited data locations:', error);
    return [];
  }
  
  return data;
}

// Legacy alias
export const getAllUnsupportedLocations = getAllLimitedDataLocations;

// Get active limited data locations only
export async function getActiveLimitedDataLocations(): Promise<LimitedDataLocation[]> {
  const { data, error } = await supabase
    .from('limited_data_locations')
    .select('*')
    .eq('is_active', true)
    .order('check_count', { ascending: false });
  
  if (error || !data) {
    return [];
  }
  
  return data;
}


// ============================================
// QUIZ LEADS - Email capture from funding quiz
// ============================================

export interface QuizLead {
  id: number;
  email: string;
  quiz_answers: Record<string, string>;
  recommended_methods: string[];
  created_at: string;
}

// Save a quiz lead (email + quiz results)
export async function saveQuizLead(
  email: string,
  quizAnswers: Record<string, string>,
  recommendedMethods: string[]
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const { error } = await supabase
    .from('quiz_leads')
    .insert({
      email: normalizedEmail,
      quiz_answers: quizAnswers,
      recommended_methods: recommendedMethods,
    });
  
  if (error) {
    console.error('Error saving quiz lead:', error);
    return false;
  }
  
  console.log(`[QuizLead] Saved: ${normalizedEmail}`);
  return true;
}

// Get all quiz leads (for admin/export)
export async function getAllQuizLeads(): Promise<QuizLead[]> {
  const { data, error } = await supabase
    .from('quiz_leads')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error || !data) {
    console.error('Error getting quiz leads:', error);
    return [];
  }
  
  return data;
}

// ============================================================
// COACHING LEADS (from AI Assistant intake survey)
// ============================================================

export interface CoachingLead {
  id: number;
  email: string;
  budget: string;
  timeline: string;
  experience: string;
  qualified: boolean;
  source: string;
  created_at: string;
}

export async function saveCoachingLead(
  email: string,
  budget: string,
  timeline: string,
  experience: string,
  source: string = 'assistant'
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const qualified = 
    (budget === '$100k-250k' || budget === '$250k-500k' || budget === '$500k+') &&
    (timeline === 'Ready now' || timeline === '3-6 months');

  const { error } = await supabase
    .from('coaching_leads')
    .insert({
      email: normalizedEmail,
      budget,
      timeline,
      experience,
      qualified,
      source,
    });

  if (error) {
    console.error('Error saving coaching lead:', error);
    return false;
  }

  console.log(`[CoachingLead] Saved: ${normalizedEmail} | Qualified: ${qualified} | Source: ${source}`);
  return true;
}

export async function getAllCoachingLeads(): Promise<CoachingLead[]> {
  const { data, error } = await supabase
    .from('coaching_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error getting coaching leads:', error);
    return [];
  }

  return data;
}

// ============================================================
// ADMIN DASHBOARD AGGREGATES
// ============================================================

export async function getAdminDashboardData() {
  // Parallel fetch all data with richer queries
  const [
    usersRes,
    quizLeadsRes,
    coachingLeadsRes,
    savedPropsRes,
    propertyCacheRes,
    analysisLogRes,
    marketDataRes,
    creditPurchasesRes,
    sharedAnalysesRes,
    fundingQuizRes,
    airbnbCacheRes,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    supabase.from('quiz_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    supabase.from('coaching_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    supabase.from('saved_properties').select('*', { count: 'exact' }),
    supabase.from('property_cache').select('*', { count: 'exact' }),
    supabase.from('analysis_log').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    supabase.from('market_data').select('*', { count: 'exact' }),
    supabase.from('credit_purchases').select('*', { count: 'exact' }).order('purchased_at', { ascending: false }),
    supabase.from('shared_analyses').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    supabase.from('funding_quiz_submissions').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    supabase.from('airbnb_comp_cache').select('id,cache_key,listings_count,created_at,expires_at', { count: 'exact' }),
  ]);

  // ===== DERIVED ANALYTICS =====
  const users = usersRes.data || [];
  const analyses = analysisLogRes.data || [];
  const purchases = creditPurchasesRes.data || [];
  const marketDataRows = marketDataRes.data || [];

  // --- Revenue & Credits ---
  const totalRevenue = purchases.reduce((sum: number, p: Record<string, number>) => sum + (p.amount_paid || 0), 0);
  const totalCreditsPurchased = purchases.reduce((sum: number, p: Record<string, number>) => sum + (p.credits_added || 0), 0);
  const totalCreditsUsed = users.reduce((sum: number, u: Record<string, number>) => sum + (u.credits_used || 0), 0);
  const totalCreditsLimit = users.reduce((sum: number, u: Record<string, number>) => sum + (u.credits_limit || 0), 0);
  const unlimitedUsers = users.filter((u: Record<string, boolean>) => u.is_unlimited).length;

  // --- Conversion Metrics ---
  const usersWithAnalyses = new Set(analyses.filter((a: Record<string, string>) => a.user_email).map((a: Record<string, string>) => a.user_email));
  const usersWhoPurchased = new Set(purchases.map((p: Record<string, string>) => p.user_email));
  const freeToAnalysisRate = users.length > 0 ? Math.round((usersWithAnalyses.size / users.length) * 100) : 0;
  const analysisToPurchaseRate = usersWithAnalyses.size > 0 ? Math.round((usersWhoPurchased.size / usersWithAnalyses.size) * 100) : 0;
  const overallConversionRate = users.length > 0 ? Math.round((usersWhoPurchased.size / users.length) * 100) : 0;

  // --- Data Source Breakdown ---
  const priceLabsAnalyses = analyses.filter((a: Record<string, string>) =>
    a.data_provider === 'pricelabs' || a.revenue_source === 'pricelabs'
  ).length;
  const airbnbAnalyses = analyses.filter((a: Record<string, string>) =>
    a.data_provider === 'airbnb-direct' || a.revenue_source === 'airbnb-direct' || a.data_provider === 'airbnb'
  ).length;
  const cachedAnalyses = analyses.filter((a: Record<string, boolean>) => a.is_instant).length;

  // --- Cost Estimates ---
  const estimatedPriceLabsCost = priceLabsAnalyses * 0.50;
  const cacheHitRate = analyses.length > 0 ? Math.round((cachedAnalyses / analyses.length) * 100) : 0;
  const costSavedByCache = cachedAnalyses * 0.50;

  // --- Popular Markets ---
  const marketCounts: Record<string, { count: number; city: string; state: string }> = {};
  analyses.forEach((a: Record<string, string>) => {
    if (a.city && a.state) {
      const key = `${a.city}, ${a.state}`;
      if (!marketCounts[key]) marketCounts[key] = { count: 0, city: a.city, state: a.state };
      marketCounts[key].count++;
    }
  });
  const popularMarkets = Object.values(marketCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // --- Popular Bedroom Counts ---
  const bedroomCounts: Record<number, number> = {};
  analyses.forEach((a: Record<string, number>) => {
    if (a.bedrooms) {
      bedroomCounts[a.bedrooms] = (bedroomCounts[a.bedrooms] || 0) + 1;
    }
  });

  // --- Daily Activity (last 30 days) ---
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyAnalyses: Record<string, number> = {};
  const dailySignups: Record<string, number> = {};

  analyses.forEach((a: Record<string, string>) => {
    if (a.created_at) {
      const date = new Date(a.created_at);
      if (date >= thirtyDaysAgo) {
        const key = date.toISOString().split('T')[0];
        dailyAnalyses[key] = (dailyAnalyses[key] || 0) + 1;
      }
    }
  });

  users.forEach((u: Record<string, string>) => {
    if (u.created_at) {
      const date = new Date(u.created_at);
      if (date >= thirtyDaysAgo) {
        const key = date.toISOString().split('T')[0];
        dailySignups[key] = (dailySignups[key] || 0) + 1;
      }
    }
  });

  const dailyActivity = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dailyActivity.push({
      date: key,
      analyses: dailyAnalyses[key] || 0,
      signups: dailySignups[key] || 0,
    });
  }

  // --- User Engagement ---
  const usersWithSaved = new Set((savedPropsRes.data || []).map((s: Record<string, string>) => s.user_email));
  const usersWhoShared = new Set(analyses.filter((a: Record<string, boolean>) => a.was_shared).map((a: Record<string, string>) => a.user_email));
  const avgAnalysesPerUser = usersWithAnalyses.size > 0 ? Math.round(analyses.length / usersWithAnalyses.size * 10) / 10 : 0;
  const avgRevenuePerPurchaser = usersWhoPurchased.size > 0 ? Math.round(totalRevenue / usersWhoPurchased.size) : 0;

  // --- Market Data Cache Stats ---
  const priceLabsMarkets = marketDataRows.filter((m: Record<string, string>) => m.source === 'pricelabs').length;
  const airbnbMarkets = marketDataRows.filter((m: Record<string, string>) => m.source === 'airbnb-direct' || m.source === 'airbnb' || m.source === 'apify').length;
  const expiredCache = marketDataRows.filter((m: Record<string, string>) => m.expires_at && new Date(m.expires_at) < now).length;

  return {
    // Original data (backward compatible)
    users: { count: usersRes.count || 0, data: users },
    quizLeads: { count: quizLeadsRes.count || 0, data: quizLeadsRes.data || [] },
    coachingLeads: { count: coachingLeadsRes.count || 0, data: coachingLeadsRes.data || [] },
    savedProperties: { count: savedPropsRes.count || 0 },
    cachedResults: { count: propertyCacheRes.count || 0 },
    analysisLog: { count: analysisLogRes.count || 0, data: analyses },
    marketData: { count: marketDataRes.count || 0 },

    // ===== NEW ANALYTICS =====
    analytics: {
      revenue: {
        totalRevenue: totalRevenue / 100,
        totalCreditsPurchased,
        totalCreditsUsed,
        totalCreditsRemaining: totalCreditsLimit - totalCreditsUsed,
        purchaseCount: purchases.length,
        avgRevenuePerPurchaser: avgRevenuePerPurchaser / 100,
        recentPurchases: purchases.slice(0, 10),
      },
      conversion: {
        totalUsers: users.length,
        usersWhoAnalyzed: usersWithAnalyses.size,
        usersWhoPurchased: usersWhoPurchased.size,
        usersWhoSaved: usersWithSaved.size,
        usersWhoShared: usersWhoShared.size,
        unlimitedUsers,
        freeToAnalysisRate,
        analysisToPurchaseRate,
        overallConversionRate,
      },
      dataSource: {
        priceLabsAnalyses,
        airbnbAnalyses,
        cachedAnalyses,
        totalAnalyses: analyses.length,
        priceLabsPercent: analyses.length > 0 ? Math.round((priceLabsAnalyses / analyses.length) * 100) : 0,
        cacheHitRate,
        estimatedPriceLabsCost: Math.round(estimatedPriceLabsCost * 100) / 100,
        estimatedTotalAPICost: Math.round(estimatedPriceLabsCost * 100) / 100,
        costSavedByCache: Math.round(costSavedByCache * 100) / 100,
      },
      popularMarkets,
      bedroomBreakdown: Object.entries(bedroomCounts)
        .map(([br, count]) => ({ bedrooms: parseInt(br), count }))
        .sort((a, b) => b.count - a.count),
      dailyActivity,
      engagement: {
        avgAnalysesPerUser,
        saveRate: usersWithAnalyses.size > 0 ? Math.round((usersWithSaved.size / usersWithAnalyses.size) * 100) : 0,
        shareRate: usersWithAnalyses.size > 0 ? Math.round((usersWhoShared.size / usersWithAnalyses.size) * 100) : 0,
      },
      cacheHealth: {
        propertyCacheCount: propertyCacheRes.count || 0,
        marketDataCount: marketDataRes.count || 0,
        airbnbCompCacheCount: airbnbCacheRes.count || 0,
        priceLabsMarkets,
        airbnbMarkets,
        expiredCache,
        totalSharedLinks: sharedAnalysesRes.count || 0,
      },
      fundingQuiz: {
        count: fundingQuizRes.count || 0,
        data: (fundingQuizRes.data || []).slice(0, 10),
      },
    },
  };
}
