import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCities } from '@/data/helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Syncs market scores AND STR data columns from static data to Supabase.
 * 
 * Columns synced: market_score, avg_adr, occupancy, str_monthly_revenue,
 * median_home_value, cash_on_cash, regulation, has_full_data
 * 
 * Runs automatically via Vercel cron (daily at 7am UTC) and can also be
 * triggered manually via POST.
 * 
 * Also runs on 1st of each month via separate cron for full data refresh.
 * 
 * Protected by CRON_SECRET when set.
 */
async function syncData(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cities = getAllCities();
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let dataFilled = 0; // Cities that got STR data filled for the first time
    const changes: Array<{ id: string; name: string; oldScore: number | null; newScore: number; dataFilled: boolean }> = [];

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < cities.length; i += batchSize) {
      const batch = cities.slice(i, i + batchSize);
      
      // Get current data from Supabase for this batch
      const ids = batch.map(c => c.id);
      const { data: existing } = await supabase
        .from('cities')
        .select('id, market_score, avg_adr, occupancy, str_monthly_revenue, median_home_value, cash_on_cash, has_full_data')
        .in('id', ids);
      
      const existingMap = new Map(
        (existing || []).map(row => [row.id, row])
      );

      for (const city of batch) {
        const current = existingMap.get(city.id);
        const newScore = city.marketScore;
        const newAdr = city.avgADR;
        const newOccupancy = city.occupancy;
        const newRevenue = city.strMonthlyRevenue;
        const newHomeValue = city.medianHomeValue;
        const newCashOnCash = city.cashOnCash;
        const newRegulation = city.regulation;

        // Check if anything has changed
        const scoreChanged = !current || current.market_score !== newScore;
        const dataChanged = !current || 
          Number(current.avg_adr) !== newAdr ||
          Number(current.occupancy) !== newOccupancy ||
          Number(current.str_monthly_revenue) !== newRevenue ||
          Number(current.median_home_value) !== newHomeValue ||
          !current.has_full_data;
        
        if (!scoreChanged && !dataChanged) {
          skipped++;
          continue;
        }

        const wasDataMissing = current && !current.has_full_data && newAdr > 0;

        const { error } = await supabase
          .from('cities')
          .update({
            market_score: newScore,
            avg_adr: newAdr,
            occupancy: newOccupancy,
            str_monthly_revenue: newRevenue,
            median_home_value: newHomeValue,
            cash_on_cash: newCashOnCash,
            regulation: newRegulation,
            has_full_data: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', city.id);

        if (error) {
          errors++;
          console.error(`Failed to update ${city.id}:`, error.message);
        } else {
          updated++;
          if (wasDataMissing) dataFilled++;
          changes.push({
            id: city.id,
            name: `${city.name}, ${city.stateCode}`,
            oldScore: current?.market_score ?? null,
            newScore,
            dataFilled: !!wasDataMissing,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: cities.length,
        updated,
        skipped,
        errors,
        dataFilled, // Cities that had missing STR data now filled
      },
      changes: changes.slice(0, 100), // Limit to first 100 changes for readability
    });
  } catch (error) {
    console.error('Sync data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET handler for Vercel cron jobs (cron sends GET requests)
export async function GET(request: NextRequest) {
  return syncData(request);
}

// POST handler for manual triggers
export async function POST(request: NextRequest) {
  return syncData(request);
}
