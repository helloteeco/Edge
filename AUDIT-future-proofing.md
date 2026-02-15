# Future-Proofing Audit: Adding New Cities & Counties

## Data Architecture (Two-Tier System)

### Tier 1: Featured Markets (city-data.ts)
- Full STR data: ADR, occupancy, revenue, income by size, amenity deltas, saturation risk, etc.
- Currently ~609 cities organized by state code
- Used for: search page filters, state detail pages, scoring, interactive map (via state aggregation)
- Schema: CityData interface with ~20 fields

### Tier 2: Basic Cities (basic-city-data.ts)
- Minimal data: id, name, state, population
- Currently ~13,000+ cities from US Census
- Used for: "All Cities" search filter, unified search
- Schema: BasicCityData with 5 fields

## Data Flow: What Happens When You Add a City

### Adding to Tier 1 (city-data.ts):
1. `getAllCities()` in helpers.ts automatically picks it up
2. `calculateCityScore()` auto-computes scoring from the data fields
3. `applyRegulationPenalty()` applies regulation adjustment (defaults to "legal" if no curated entry)
4. State page (`/state/[id]`) auto-shows it in the city list
5. Search page auto-includes it in filters (ADR brackets, revenue brackets, etc.)
6. Interactive map: state-level aggregation auto-recalculates (`calculateStateScore` uses top performers)
7. `findCityForAddress()` auto-matches it for calculator purchase price fallback
8. Market counts auto-update via `getMarketCounts()`

### Adding to Tier 2 (basic-city-data.ts):
1. Shows up in "All Cities" search filter
2. No STR data shown (just name/state/population)
3. Market count total increases

## What's Consistent Automatically

| Feature | Auto-updates? | How |
|---------|--------------|-----|
| Search page city list | ✅ Yes | `cityData` is computed from `getAllCities()` |
| Search page filters (ADR, revenue, etc.) | ✅ Yes | Brackets built from `cityData.map(c => c.avgADR)` |
| State detail page city list | ✅ Yes | `getCitiesByState(stateCode)` |
| State scoring & grade | ✅ Yes | `calculateStateScore(cityScores)` |
| Interactive map state colors | ✅ Yes | Uses state grades from `getAllStates()` |
| Market counts | ✅ Yes | `getMarketCounts()` counts both tiers |
| Calculator city lookup | ✅ Yes | `findCityForAddress()` searches all cities |
| Calculator purchase price fallback | ✅ Yes | Uses `medianHomePrice` from matched city |
| Top Markets component | ✅ Yes | Sorts `cityData` by market score |
| High ROI Markets component | ✅ Yes | Sorts `cityData` by cash-on-cash |

## What Needs Manual Attention

1. **STR Regulations**: If the new city has specific STR rules, add an entry to `str-regulations.ts`. Without it, defaults to the state-level regulation status.

2. **Data Quality**: All fields in the CityData schema must be populated. Missing fields will cause incorrect scoring.

3. **ID Format**: Must follow `{state-lowercase}-{city-name-lowercase}` pattern (e.g., `fl-miami`).

## No External APIs Affected

None of the changes above touch any external API. The data pipeline is:
- **Static data** (city-data.ts) → **Computed at build time** (helpers.ts) → **Rendered in UI**
- The calculator's PriceLabs/Airbnb Direct calls are address-based, not city-data-based
- The interactive map uses state-level aggregation from static data only

## Conclusion

The architecture is fully self-consistent. Adding a new city to `city-data.ts` with the correct schema automatically propagates to every feature in the app. No API changes, no route changes, no component changes needed.
