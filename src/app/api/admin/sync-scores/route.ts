import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCities } from '@/data/helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Syncs regulation-adjusted market scores from static data to Supabase.
 * This ensures the Supabase `market_score` column reflects regulation penalties
 * (banned cities capped at 44, restricted at 54, etc.)
 * 
 * Runs automatically via Vercel cron (daily at 7am UTC) and can also be
 * triggered manually via POST.
 * 
 * Protected by CRON_SECRET when set.
 */
async function syncScores(request: NextRequest) {
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
    const changes: Array<{ id: string; name: string; oldScore: number | null; newScore: number; grade: string; regulation: string }> = [];

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < cities.length; i += batchSize) {
      const batch = cities.slice(i, i + batchSize);
      
      // First, get current scores from Supabase for this batch
      const ids = batch.map(c => c.id);
      const { data: existing } = await supabase
        .from('cities')
        .select('id, market_score')
        .in('id', ids);
      
      const existingMap = new Map(
        (existing || []).map(row => [row.id, row.market_score])
      );

      for (const city of batch) {
        const currentScore = existingMap.get(city.id);
        const newScore = city.marketScore; // This is the adjustedScore (regulation-penalized)
        
        // Only update if the score has changed
        if (currentScore === newScore) {
          skipped++;
          continue;
        }

        const { error } = await supabase
          .from('cities')
          .update({ market_score: newScore })
          .eq('id', city.id);

        if (error) {
          errors++;
          console.error(`Failed to update ${city.id}:`, error.message);
        } else {
          updated++;
          changes.push({
            id: city.id,
            name: `${city.name}, ${city.stateCode}`,
            oldScore: currentScore ?? null,
            newScore,
            grade: city.grade,
            regulation: city.regulationInfo?.legality_status || 'legal',
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
      },
      changes: changes.slice(0, 100), // Limit to first 100 changes for readability
    });
  } catch (error) {
    console.error('Sync scores error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET handler for Vercel cron jobs (cron sends GET requests)
export async function GET(request: NextRequest) {
  return syncScores(request);
}

// POST handler for manual triggers
export async function POST(request: NextRequest) {
  return syncScores(request);
}
