import { getAllCities } from '../src/data/helpers';

const allCities = getAllCities();

// Group by state
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

// New algorithm
function newStateScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => b - a);
  
  // Top performers: top 25% but min 3, max 15
  const topN = Math.min(15, Math.max(3, Math.ceil(sorted.length * 0.25)));
  const topPerformers = sorted.slice(0, topN);
  const topAvg = topPerformers.reduce((s, v) => s + v, 0) / topPerformers.length;
  
  // Investable breadth: % of cities that are B (55+) or above
  const investableCount = scores.filter(s => s >= 55).length;
  const investablePct = investableCount / scores.length;
  const breadthScore = Math.min(100, investablePct * 100 * 1.5); // Scale up so 67%+ = 100
  
  // Floor: median score
  const medianIdx = Math.floor(sorted.length / 2);
  const median = sorted[medianIdx];
  
  // Weighted: 60% top performers, 25% breadth, 15% floor
  return Math.round(topAvg * 0.60 + breadthScore * 0.25 + median * 0.15);
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
  const new_ = newStateScore(scores);
  results.push({ state, cities: scores.length, old, oldG: getGrade(old), new_: new_, newG: getGrade(new_), diff: new_ - old });
}

results.sort((a, b) => b.new_ - a.new_);

console.log('State | Cities | Old | OldG | New | NewG | Diff');
console.log('------|--------|-----|------|-----|------|-----');
results.forEach(r => {
  const changed = r.oldG !== r.newG ? ' <<<' : '';
  console.log(r.state.padEnd(5) + ' | ' + String(r.cities).padStart(4) + '   | ' + String(r.old).padStart(3) + ' | ' + r.oldG.padEnd(2) + '   | ' + String(r.new_).padStart(3) + ' | ' + r.newG.padEnd(2) + '   | ' + (r.diff >= 0 ? '+' : '') + r.diff + changed);
});

// Grade distribution comparison
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

// Test: what happens if we add 50 F-grade cities to KY?
console.log('\n=== STABILITY TEST: Adding 50 F-grade cities to KY ===');
const kyScores = [...byState['KY']];
const kyOld = oldStateScore(kyScores);
const kyNew = newStateScore(kyScores);
console.log('KY current: Old=' + kyOld + ' (' + getGrade(kyOld) + '), New=' + kyNew + ' (' + getGrade(kyNew) + ')');

// Add 50 cities with score 25
const kyExpanded = [...kyScores, ...Array(50).fill(25)];
const kyOldExpanded = oldStateScore(kyExpanded);
const kyNewExpanded = newStateScore(kyExpanded);
console.log('KY + 50 F-cities: Old=' + kyOldExpanded + ' (' + getGrade(kyOldExpanded) + '), New=' + kyNewExpanded + ' (' + getGrade(kyNewExpanded) + ')');
console.log('Old dropped by: ' + (kyOld - kyOldExpanded) + ' points');
console.log('New dropped by: ' + (kyNew - kyNewExpanded) + ' points');
