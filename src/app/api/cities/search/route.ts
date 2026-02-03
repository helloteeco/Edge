import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force dynamic rendering to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const hasFullData = searchParams.get('hasFullData'); // 'true', 'false', or null for all
    const minScore = searchParams.get('minScore');
    const state = searchParams.get('state');
    const sortBy = searchParams.get('sortBy') || 'population'; // population, market_score, name
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const offset = (page - 1) * limit;
    
    // Build query
    let dbQuery = supabase
      .from('cities')
      .select('*', { count: 'exact' });
    
    // Apply search filter
    if (query) {
      // Use ilike for case-insensitive search
      dbQuery = dbQuery.or(`name.ilike.%${query}%,county.ilike.%${query}%,state.ilike.%${query}%`);
    }
    
    // Filter by hasFullData
    if (hasFullData === 'true') {
      dbQuery = dbQuery.eq('has_full_data', true);
    } else if (hasFullData === 'false') {
      dbQuery = dbQuery.eq('has_full_data', false);
    }
    
    // Filter by minimum score
    if (minScore) {
      dbQuery = dbQuery.gte('market_score', parseInt(minScore));
    }
    
    // Filter by state
    if (state) {
      dbQuery = dbQuery.eq('state', state.toUpperCase());
    }
    
    // Apply sorting
    const validSortColumns = ['population', 'market_score', 'name', 'state', 'cash_on_cash', 'avg_adr'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'population';
    const ascending = sortOrder === 'asc';
    
    // For market_score, put nulls last
    if (sortColumn === 'market_score') {
      dbQuery = dbQuery.order(sortColumn, { ascending, nullsFirst: false });
    } else {
      dbQuery = dbQuery.order(sortColumn, { ascending });
    }
    
    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);
    
    const { data, error, count } = await dbQuery;
    
    if (error) {
      console.error('Supabase search error:', error);
      return NextResponse.json(
        { error: 'Failed to search cities' },
        { status: 500 }
      );
    }
    
    // Transform data to match frontend expectations
    const cities = data?.map(city => ({
      id: city.id,
      name: city.name,
      state: city.state,
      county: city.county,
      population: city.population,
      hasFullData: city.has_full_data,
      marketScore: city.market_score,
      cashOnCash: city.cash_on_cash,
      avgADR: city.avg_adr,
      occupancy: city.occupancy,
      strMonthlyRevenue: city.str_monthly_revenue,
      medianHomeValue: city.median_home_value,
      regulation: city.regulation,
      fullData: city.full_data,
    })) || [];
    
    return NextResponse.json({
      cities,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error('City search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
