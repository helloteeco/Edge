import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the same hardcoded fallback values as src/lib/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izyfqnavncdcdwkldlih.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0';
const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Get preview data for Open Graph (doesn't mark as viewed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shared_analyses')
      .select('address, city, state, bedrooms, bathrooms, guest_count, annual_revenue, occupancy_rate, adr, cash_on_cash, expires_at, view_count')
      .eq('share_id', shareId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired', status: 'expired' }, { status: 410 });
    }

    // Check if already viewed
    if (data.view_count > 0) {
      return NextResponse.json({ error: 'viewed', status: 'viewed' }, { status: 410 });
    }

    return NextResponse.json({
      status: 'available',
      address: data.address,
      city: data.city,
      state: data.state,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      guestCount: data.guest_count,
      annualRevenue: data.annual_revenue,
      occupancyRate: data.occupancy_rate,
      adr: data.adr,
      cashOnCash: data.cash_on_cash
    });
  } catch (error) {
    console.error('Error in share preview API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
