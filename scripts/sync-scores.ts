import { getAllCities } from '../src/data/helpers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.log('SUPABASE_KEY:', supabaseKey ? 'SET' : 'MISSING');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const cities = getAllCities();

  console.log('Total cities to sync:', cities.length);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const changes: string[] = [];

  // Process in batches of 50
  for (let i = 0; i < cities.length; i += 50) {
    const batch = cities.slice(i, i + 50);
    const ids = batch.map(c => c.id);
    
    // Get current scores
    const { data: existing } = await supabase
      .from('cities')
      .select('id, market_score')
      .in('id', ids);
    
    const existingMap = new Map((existing || []).map(row => [row.id, row.market_score]));
    
    for (const city of batch) {
      const currentScore = existingMap.get(city.id);
      const newScore = city.marketScore;
      
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
        if (errors <= 5) console.error(`Error updating ${city.id}: ${error.message}`);
      } else {
        updated++;
        const change = `${city.name}, ${city.stateCode}: ${currentScore} -> ${newScore} (${city.regulationInfo?.legality_status || 'legal'})`;
        changes.push(change);
        if (updated <= 20) console.log(`  Updated: ${change}`);
      }
    }
    
    if (i % 200 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${cities.length} processed...`);
    }
  }

  console.log('\n=== SYNC COMPLETE ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no change): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total changes: ${changes.length}`);
}

main().catch(console.error);
