// Script to migrate city data to Supabase
// Run with: npx tsx scripts/migrate-cities-to-supabase.ts

import { createClient } from '@supabase/supabase-js';
import { cityData, getAllCities } from '../src/data/helpers';
import { basicCityData } from '../src/data/basic-city-data';

const SUPABASE_URL = 'https://izyfqnavncdcdwkldlih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface CityRow {
  id: string;
  name: string;
  state: string;
  county: string | null;
  population: number;
  has_full_data: boolean;
  market_score: number | null;
  cash_on_cash: number | null;
  avg_adr: number | null;
  occupancy: number | null;
  str_monthly_revenue: number | null;
  median_home_value: number | null;
  regulation: string | null;
  full_data: object | null;
}

async function migrateData() {
  console.log('Starting city data migration to Supabase...');
  
  const rows: CityRow[] = [];
  const seenIds = new Set<string>();
  
  // First, add all featured cities with full data
  const fullCities = getAllCities();
  console.log(`Processing ${fullCities.length} featured cities with full STR data...`);
  
  for (const city of fullCities) {
    if (seenIds.has(city.id)) continue;
    seenIds.add(city.id);
    
    rows.push({
      id: city.id,
      name: city.name,
      state: city.stateCode,
      county: city.county || null,
      population: city.population,
      has_full_data: true,
      market_score: city.marketScore,
      cash_on_cash: city.cashOnCash,
      avg_adr: city.avgADR,
      occupancy: city.occupancy,
      str_monthly_revenue: city.strMonthlyRevenue,
      median_home_value: city.medianHomeValue,
      regulation: city.regulation,
      full_data: city as unknown as object,
    });
  }
  
  // Then add basic cities (without full data)
  console.log('Processing basic cities...');
  let basicCount = 0;
  
  for (const [stateCode, stateCities] of Object.entries(basicCityData)) {
    for (const city of stateCities) {
      if (seenIds.has(city.id)) continue;
      
      // Also check by name+state match
      const nameStateKey = `${city.name.toLowerCase()}-${city.state}`;
      const existingByName = fullCities.find(
        c => c.name.toLowerCase() === city.name.toLowerCase() && c.stateCode === city.state
      );
      if (existingByName) continue;
      
      seenIds.add(city.id);
      basicCount++;
      
      rows.push({
        id: city.id,
        name: city.name,
        state: city.state,
        county: null,
        population: city.population,
        has_full_data: false,
        market_score: null,
        cash_on_cash: null,
        avg_adr: null,
        occupancy: null,
        str_monthly_revenue: null,
        median_home_value: null,
        regulation: null,
        full_data: null,
      });
    }
  }
  
  console.log(`Total cities to insert: ${rows.length} (${fullCities.length} featured + ${basicCount} basic)`);
  
  // Insert in batches of 500
  const BATCH_SIZE = 500;
  let inserted = 0;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('cities')
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
      throw error;
    }
    
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${rows.length} cities...`);
  }
  
  console.log('Migration complete!');
  
  // Verify count
  const { count, error: countError } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error getting count:', countError);
  } else {
    console.log(`Total cities in database: ${count}`);
  }
}

migrateData().catch(console.error);
