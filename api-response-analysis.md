# API Response Analysis

## Current Response Structure

The API is returning historical data but it only has `value` field (occupancy), NOT `revenue` or `adr`:

```json
"historical":[
  {"year":2024,"month":12,"value":65},
  {"year":2025,"month":1,"value":33},
  {"year":2025,"month":2,"value":19},
  ...
]
```

## Problem Identified

The historical data is being generated from Mashvisor fallback, not from Airbtics monthly data!

The Airbtics monthly_revenue, monthly_occupancy_rate, and monthly_adr fields are NOT being populated.

## Root Cause

Looking at the API response:
- `dataSource: "property"` - This means it's using Mashvisor property data
- The historical data has `value` field (old format) instead of `revenue`, `adr`, `occupancy`

The Airbtics data IS being fetched (we see percentiles and comps), but the monthly data fields are empty.

## Solution

Need to check if Airbtics actually returns monthly_revenue in the kpis["50"] object, or if it's in a different location.
