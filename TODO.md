# Edge Calculator TODO

## Calculator Fixes - Feb 3

- [x] Fix Re-analyze button to force fresh API call (bypass cache) and use credit with warning
- [x] Fix address display to always show user's entered address, not API response market name
- [x] Implement Market Mismatch Warning system (per-user localStorage)

## Informed Choice System for Limited Data Locations

- [ ] Update unsupported_locations table to store nearest_market and distance
- [ ] Create pre-search warning modal showing nearest market info
- [ ] Let users choose: "Use Nearest Market (1 credit)" or "Cancel"
- [ ] If they proceed, show persistent banner that data is from different market
- [ ] No auto-refund since user made informed choice
- [ ] Track locations in database for future release when data available
