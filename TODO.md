# Edge Calculator TODO

## Calculator Fixes - Feb 3

- [x] Fix Re-analyze button to force fresh API call (bypass cache) and use credit with warning
- [x] Fix address display to always show user's entered address, not API response market name
- [ ] Implement Market Mismatch Warning system
  - [ ] Detect when API returns data from different location than searched
  - [ ] Show prominent warning banner when mismatch detected
  - [ ] Automatic credit refund when mismatch detected (one-time per address)
  - [ ] Block re-analysis of unsupported addresses
  - [ ] Store unsupported addresses in localStorage to prevent future credit waste
