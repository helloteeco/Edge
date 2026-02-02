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
