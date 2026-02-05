#!/usr/bin/env python3
"""
Scrape Rabbu market data to find new cities for Edge
"""
import json
import re

# Read existing cities
with open('/tmp/existing_cities.txt', 'r') as f:
    existing_cities = set(line.strip().lower() for line in f.readlines())

print(f"Existing cities: {len(existing_cities)}")

# Parse the markdown file we already have
with open('/home/ubuntu/upload/www.rabbu.com_market_finder.md', 'r') as f:
    content = f.read()

# Extract market data from the table - fixed pattern for escaped periods
# |[Kissimmee, FL](/airbnb-data/kissimmee-fl) |61 |$483,088 |$50,248 |10\.4% |48% |9415 |
pattern = r'\|\[([^,]+),\s*([A-Z]{2})\]\(/airbnb-data/[^)]+\)\s*\|(\d+)\s*\|\$([0-9,]+)\s*\|\$([0-9,]+)\s*\|([0-9.\\]+)%\s*\|(\d+)%\s*\|(\d+)'

matches = re.findall(pattern, content)
print(f"Found {len(matches)} markets in cached data")

all_markets = []
for match in matches:
    city, state, roi, home_value, annual_revenue, gross_yield, occupancy, airbnbs = match
    city_lower = city.lower()
    
    # Clean up gross_yield (remove escaped backslash)
    gross_yield_clean = gross_yield.replace('\\', '')
    
    if city_lower not in existing_cities:
        all_markets.append({
            'name': city,
            'state': state,
            'roi_score': int(roi),
            'median_home_price': int(home_value.replace(',', '')),
            'annual_revenue': int(annual_revenue.replace(',', '')),
            'gross_yield': float(gross_yield_clean),
            'occupancy': int(occupancy),
            'active_listings': int(airbnbs)
        })
        print(f"NEW: {city}, {state} - ${annual_revenue}/yr, {occupancy}% occ")
    else:
        print(f"EXISTS: {city}, {state}")

print(f"\nFound {len(all_markets)} new markets from Rabbu cache")

# Save to file
with open('/tmp/rabbu_new_markets.json', 'w') as f:
    json.dump(all_markets, f, indent=2)

print(f"Saved to /tmp/rabbu_new_markets.json")
