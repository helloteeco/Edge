import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCities } from '@/data/helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Syncs market scores AND STR data columns from static data to Supabase.
 * 
 * Columns synced: market_score, avg_adr, occupancy, str_monthly_revenue,
 * median_home_value, cash_on_cash, regulation, has_full_data, full_data (JSON)
 * 
 * Uses UPSERT to handle cities that exist in city-data.ts but not yet in
 * the Supabase cities table (previously these were silently skipped).
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
    // Auth check — supports both CRON_SECRET (Bearer) and ADMIN_PASSWORD (query param)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const password = request.nextUrl.searchParams.get('password');
    const adminPassword = process.env.ADMIN_PASSWORD || 'teeco-edge-2026';
    const isAuthed = 
      !cronSecret ||
      authHeader === `Bearer ${cronSecret}` ||
      password === adminPassword;
    
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cities = getAllCities();
    let updated = 0;
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    let dataFilled = 0; // Cities that got STR data filled for the first time
    const changes: Array<{ id: string; name: string; oldScore: number | null; newScore: number; action: 'updated' | 'inserted' | 'data-filled' }> = [];

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

        // Build the full_data JSON for the JSONB column
        const fullDataJson = {
          id: city.id,
          name: city.name,
          county: city.county,
          stateCode: city.stateCode,
          population: city.population,
          dsi: city.dsi,
          grade: city.grade,
          verdict: city.verdict,
          avgADR: city.avgADR,
          occupancy: city.occupancy,
          strMonthlyRevenue: city.strMonthlyRevenue,
          medianHomeValue: city.medianHomeValue,
          cashOnCash: city.cashOnCash,
          regulation: city.regulation,
          marketScore: city.marketScore,
          marketHeadroom: city.marketHeadroom,
          listingsPerThousand: city.listingsPerThousand,
          scores: city.scores,
          scoring: city.scoring,
          incomeBySize: city.incomeBySize,
          amenityDelta: city.amenityDelta,
          marketType: city.marketType,
          highlights: city.highlights,
          strStatus: city.strStatus,
          permitRequired: city.permitRequired,
        };

        if (!current) {
          // City doesn't exist in Supabase — INSERT it
          const { error } = await supabase
            .from('cities')
            .insert({
              id: city.id,
              name: city.name,
              state: city.stateCode,
              county: city.county,
              population: city.population,
              market_score: newScore,
              avg_adr: newAdr,
              occupancy: newOccupancy,
              str_monthly_revenue: newRevenue,
              median_home_value: newHomeValue,
              cash_on_cash: newCashOnCash,
              regulation: newRegulation,
              has_full_data: true,
              full_data: fullDataJson,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (error) {
            errors++;
            console.error(`Failed to insert ${city.id}:`, error.message);
          } else {
            inserted++;
            changes.push({
              id: city.id,
              name: `${city.name}, ${city.stateCode}`,
              oldScore: null,
              newScore,
              action: 'inserted',
            });
          }
          continue;
        }

        // City exists — check if anything has changed
        const scoreChanged = current.market_score !== newScore;
        const dataChanged = 
          Number(current.avg_adr) !== newAdr ||
          Number(current.occupancy) !== newOccupancy ||
          Number(current.str_monthly_revenue) !== newRevenue ||
          Number(current.median_home_value) !== newHomeValue ||
          !current.has_full_data;
        
        if (!scoreChanged && !dataChanged) {
          skipped++;
          continue;
        }

        const wasDataMissing = !current.has_full_data && newAdr > 0;

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
            full_data: fullDataJson,
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
            oldScore: current.market_score ?? null,
            newScore,
            action: wasDataMissing ? 'data-filled' : 'updated',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: cities.length,
        inserted,  // NEW: cities that didn't exist in Supabase before
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
