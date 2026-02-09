import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// Generate a short unique ID for sharing
function generateShareId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// POST - Create a new shared analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const {
      address,
      city,
      state,
      bedrooms,
      bathrooms,
      guestCount,
      purchasePrice,
      annualRevenue,
      occupancyRate,
      adr,
      cashFlow,
      cashOnCash,
      analysisData
    } = body;

    const shareId = generateShareId();
    
    // Set expiration to 90 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const { data, error } = await supabase
      .from('shared_analyses')
      .insert({
        share_id: shareId,
        address,
        city,
        state,
        bedrooms,
        bathrooms,
        guest_count: guestCount,
        purchase_price: purchasePrice,
        annual_revenue: annualRevenue,
        occupancy_rate: occupancyRate,
        adr,
        cash_flow: cashFlow,
        cash_on_cash: cashOnCash,
        analysis_data: analysisData,
        expires_at: expiresAt.toISOString(),
        view_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating shared analysis:', error);
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }

    return NextResponse.json({ 
      shareId,
      shareUrl: `https://edge.teeco.co/share/${shareId}`,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error in share API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Retrieve a shared analysis (and mark as viewed)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID required' }, { status: 400 });
    }

    // First, get the analysis
    const { data, error } = await supabase
      .from('shared_analyses')
      .select('*')
      .eq('share_id', shareId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This analysis has expired' }, { status: 410 });
    }

    // Check if already viewed (one-time view)
    if (data.view_count > 0) {
      return NextResponse.json({ error: 'This analysis has already been viewed' }, { status: 410 });
    }

    // Mark as viewed (increment view count)
    await supabase
      .from('shared_analyses')
      .update({ view_count: data.view_count + 1 })
      .eq('share_id', shareId);

    return NextResponse.json({
      address: data.address,
      city: data.city,
      state: data.state,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      guestCount: data.guest_count,
      purchasePrice: data.purchase_price,
      annualRevenue: data.annual_revenue,
      occupancyRate: data.occupancy_rate,
      adr: data.adr,
      cashFlow: data.cash_flow,
      cashOnCash: data.cash_on_cash,
      analysisData: data.analysis_data,
      expiresAt: data.expires_at
    });
  } catch (error) {
    console.error('Error in share GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
