import { getAllCities } from '../src/data/helpers';

const allCities = getAllCities();

const byState: Record<string, number[]> = {};
allCities.forEach(c => {
  if (!byState[c.stateCode]) byState[c.stateCode] = [];
  byState[c.stateCode].push(c.marketScore);
});

function getGrade(score: number): string {
  if (score >= 85) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 65) return 'B+';
  if (score >= 55) return 'B';
  if (score >= 45) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

/**
 * NEW STATE SCORING v2
 * 
 * Philosophy: A state's STR grade should answer "How good are the best STR 
 * opportunities in this state?" — not "What's the average city quality?"
 * 
 * This means:
 * - Adding more cities (even bad ones) should NEVER significantly hurt the state grade
 * - A state with 5 A-grade cities and 100 F-grade cities should still grade well
 * - But a state with ONLY 1 A-grade city and nothing else should be lower than one with 20
 * 
 * Formula: Weighted average of top N cities
 * - N = min(10, max(3, ceil(cityCount * 0.20)))
 * - This means we look at the top 20% of cities, but always at least 3 and at most 10
 * - The "max 10" cap ensures adding more cities never dilutes the score
 * - Small penalty (up to -5 pts) if <25% of cities are investable (B or above)
 */
function newStateScoreV2(scores: number[]): number {
  if (scores.length === 0) return 0;
  if (scores.length === 1) return scores[0];
  
  const sorted = [...scores].sort((a, b) => b - a);
  
  // Top N: 20% of cities, min 3, max 10
  // The max 10 cap is KEY — it means adding city #11, #12, etc. never affects the score
  const topN = Math.min(10, Math.max(3, Math.ceil(sorted.length * 0.20)));
  const topPerformers = sorted.slice(0, topN);
  const topAvg = topPerformers.reduce((s, v) => s + v, 0) / topPerformers.length;
  
  // Small breadth penalty: if very few cities are investable, slight deduction
  // This prevents a state with 1 great city and 50 terrible ones from getting A+
  const investableCount = scores.filter(s => s >= 55).length;
  const investableRatio = investableCount / scores.length;
  
  // Penalty: 0 if >=30% investable, up to -5 if <10% investable
  let breadthPenalty = 0;
  if (investableRatio < 0.30) {
    breadthPenalty = Math.round((0.30 - investableRatio) / 0.30 * 5);
  }
  
  return Math.round(Math.max(0, topAvg - breadthPenalty));
}

// Old algorithm
function oldStateScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => b - a);
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  return Math.round(topHalf.reduce((s, v) => s + v, 0) / topHalf.length);
}

// Compare
const results: { state: string; cities: number; old: number; oldG: string; new_: number; newG: string; diff: number }[] = [];

for (const [state, scores] of Object.entries(byState)) {
  const old = oldStateScore(scores);
  const new_ = newStateScoreV2(scores);
  results.push({ state, cities: scores.length, old, oldG: getGrade(old), new_: new_, newG: getGrade(new_), diff: new_ - old });
}

results.sort((a, b) => b.new_ - a.new_);

console.log('State | Cities | Old | OldG | New | NewG | Diff');
console.log('------|--------|-----|------|-----|------|-----');
results.forEach(r => {
  const changed = r.oldG !== r.newG ? ' <<<' : '';
  console.log(r.state.padEnd(5) + ' | ' + String(r.cities).padStart(4) + '   | ' + String(r.old).padStart(3) + ' | ' + r.oldG.padEnd(2) + '   | ' + String(r.new_).padStart(3) + ' | ' + r.newG.padEnd(2) + '   | ' + (r.diff >= 0 ? '+' : '') + r.diff + changed);
});

// Grade distribution
const oldDist: Record<string, number> = {};
const newDist: Record<string, number> = {};
results.forEach(r => {
  oldDist[r.oldG] = (oldDist[r.oldG] || 0) + 1;
  newDist[r.newG] = (newDist[r.newG] || 0) + 1;
});

console.log('\n=== GRADE DISTRIBUTION ===');
['A+', 'A', 'B+', 'B', 'C', 'D', 'F'].forEach(g => {
  console.log(g + ': Old=' + (oldDist[g] || 0) + ' New=' + (newDist[g] || 0));
});

// Stability tests
console.log('\n=== STABILITY TESTS ===');

// Test 1: Add 50 F-grade cities to KY
const kyScores = [...byState['KY']];
console.log('KY (28 cities): ' + newStateScoreV2(kyScores) + ' (' + getGrade(newStateScoreV2(kyScores)) + ')');
const kyExpanded = [...kyScores, ...Array(50).fill(25)];
console.log('KY + 50 F-cities (78 cities): ' + newStateScoreV2(kyExpanded) + ' (' + getGrade(newStateScoreV2(kyExpanded)) + ')');
console.log('  Old algo drop: ' + (oldStateScore(kyScores) - oldStateScore(kyExpanded)) + ' pts');
console.log('  New algo drop: ' + (newStateScoreV2(kyScores) - newStateScoreV2(kyExpanded)) + ' pts');

// Test 2: Add 100 F-grade cities to CA
const caScores = [...byState['CA']];
console.log('\nCA (143 cities): ' + newStateScoreV2(caScores) + ' (' + getGrade(newStateScoreV2(caScores)) + ')');
const caExpanded = [...caScores, ...Array(100).fill(20)];
console.log('CA + 100 F-cities (243 cities): ' + newStateScoreV2(caExpanded) + ' (' + getGrade(newStateScoreV2(caExpanded)) + ')');
console.log('  Old algo drop: ' + (oldStateScore(caScores) - oldStateScore(caExpanded)) + ' pts');
console.log('  New algo drop: ' + (newStateScoreV2(caScores) - newStateScoreV2(caExpanded)) + ' pts');

// Test 3: Add 10 A-grade cities to CA
const caImproved = [...caScores, ...Array(10).fill(85)];
console.log('\nCA + 10 A-cities (153 cities): ' + newStateScoreV2(caImproved) + ' (' + getGrade(newStateScoreV2(caImproved)) + ')');
console.log('  Old algo change: ' + (oldStateScore(caImproved) - oldStateScore(caScores)));
console.log('  New algo change: ' + (newStateScoreV2(caImproved) - newStateScoreV2(caScores)));
