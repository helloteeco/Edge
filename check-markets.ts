import { cityData } from './src/data/city-data';

// Markets from Tier 1 list
const marketsToCheck = [
  'Galeton', 'Brimley', 'Alton', 'Peterstown', 'Dunkirk', 'Cut Bank', 'Paradise', 
  'Manistique', 'Newberry', 'Montour Falls', 'Colton', 'Ontonagon', 'Carbondale',
  'Oregon', 'Cassadaga', 'Clearfield', 'Hancock', 'Burnside', 'Canadian', 'Pine City',
  'Frenchburg', 'Terra Alta', 'Orleans', 'Saint Ignace', 'Machias', 'Niles',
  'Oak Harbor', 'Oscoda', 'Racine', 'Nauvoo', 'Irons', 'Port Arthur', 'Rockford',
  'Springfield', 'Detroit', 'Miami', 'Jacksonville', 'Lake Tahoe'
];

const allCities = Object.values(cityData).flat();
const existingNames = new Set(allCities.map(c => c.name.toLowerCase()));

console.log('Markets already in database:');
marketsToCheck.forEach(m => {
  if (existingNames.has(m.toLowerCase())) {
    console.log('  ✓', m);
  }
});

console.log('\nMarkets NOT in database (need to add):');
marketsToCheck.forEach(m => {
  const exists = existingNames.has(m.toLowerCase());
  if (exists === false) {
    console.log('  ✗', m);
  }
});
