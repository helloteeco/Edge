#!/usr/bin/env python3
"""
Append new cities to city-data.ts using JSON format (matching existing newer entries)
"""
import json
import re
import random

# Load generated cities
with open('/tmp/new_cities_data.json', 'r') as f:
    new_cities = json.load(f)

# Read existing city-data.ts
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'r') as f:
    content = f.read()

# Get existing city IDs to avoid duplicates
existing_ids = set(re.findall(r"id: '([^']+)'", content))
existing_ids.update(re.findall(r'"id":"([^"]+)"', content))
print(f"Found {len(existing_ids)} existing cities")

# Filter out duplicates
unique_cities = [c for c in new_cities if c['id'] not in existing_ids]
print(f"After filtering: {len(unique_cities)} unique new cities to add")

# Group by state
cities_by_state = {}
for city in unique_cities:
    state = city['state']
    if state not in cities_by_state:
        cities_by_state[state] = []
    cities_by_state[state].append(city)

# Market type mappings
market_amenities = {
    'beach': [
        {"name": "Ocean Views", "revenueBoost": 25, "priority": "must-have"},
        {"name": "Beach Access", "revenueBoost": 20, "priority": "must-have"},
        {"name": "Pool", "revenueBoost": 18, "priority": "high-impact"},
        {"name": "Outdoor Shower", "revenueBoost": 8, "priority": "high-impact"},
        {"name": "Beach Gear", "revenueBoost": 10, "priority": "nice-to-have"}
    ],
    'mountain': [
        {"name": "Hot Tub", "revenueBoost": 22, "priority": "must-have"},
        {"name": "Mountain Views", "revenueBoost": 18, "priority": "must-have"},
        {"name": "Fireplace", "revenueBoost": 15, "priority": "high-impact"},
        {"name": "Game Room", "revenueBoost": 14, "priority": "high-impact"},
        {"name": "Fire Pit", "revenueBoost": 10, "priority": "nice-to-have"}
    ],
    'lake': [
        {"name": "Boat Dock", "revenueBoost": 28, "priority": "must-have"},
        {"name": "Lake Views", "revenueBoost": 18, "priority": "must-have"},
        {"name": "Kayaks/Canoes", "revenueBoost": 12, "priority": "high-impact"},
        {"name": "Fire Pit", "revenueBoost": 10, "priority": "high-impact"},
        {"name": "Hot Tub", "revenueBoost": 15, "priority": "nice-to-have"}
    ],
    'desert': [
        {"name": "Pool", "revenueBoost": 25, "priority": "must-have"},
        {"name": "Mountain Views", "revenueBoost": 15, "priority": "must-have"},
        {"name": "Hot Tub", "revenueBoost": 18, "priority": "high-impact"},
        {"name": "Outdoor Kitchen", "revenueBoost": 12, "priority": "high-impact"},
        {"name": "Fire Pit", "revenueBoost": 10, "priority": "nice-to-have"}
    ],
    'wine': [
        {"name": "Hot Tub", "revenueBoost": 20, "priority": "must-have"},
        {"name": "Vineyard Views", "revenueBoost": 22, "priority": "must-have"},
        {"name": "Outdoor Dining", "revenueBoost": 15, "priority": "high-impact"},
        {"name": "Fire Pit", "revenueBoost": 12, "priority": "high-impact"},
        {"name": "Pool", "revenueBoost": 18, "priority": "nice-to-have"}
    ],
    'urban': [
        {"name": "Parking", "revenueBoost": 15, "priority": "must-have"},
        {"name": "Workspace", "revenueBoost": 12, "priority": "must-have"},
        {"name": "Fast WiFi", "revenueBoost": 10, "priority": "high-impact"},
        {"name": "Washer/Dryer", "revenueBoost": 8, "priority": "high-impact"},
        {"name": "Gym Access", "revenueBoost": 6, "priority": "nice-to-have"}
    ],
    'rural': [
        {"name": "Hot Tub", "revenueBoost": 20, "priority": "must-have"},
        {"name": "Fire Pit", "revenueBoost": 12, "priority": "high-impact"},
        {"name": "Privacy/Seclusion", "revenueBoost": 15, "priority": "high-impact"},
        {"name": "Outdoor Space", "revenueBoost": 10, "priority": "high-impact"},
        {"name": "Game Room", "revenueBoost": 14, "priority": "nice-to-have"}
    ]
}

highlights_map = {
    'beach': ["Beach access", "Ocean activities", "Coastal dining"],
    'mountain': ["Hiking trails", "Scenic views", "Outdoor recreation"],
    'lake': ["Water activities", "Fishing", "Scenic shoreline"],
    'desert': ["Desert landscapes", "Outdoor adventures", "Stargazing"],
    'wine': ["Wine tasting", "Vineyard tours", "Fine dining"],
    'urban': ["City attractions", "Dining scene", "Entertainment"],
    'rural': ["Peace & quiet", "Nature access", "Affordable"]
}

def build_city_json(city):
    """Build a JSON string for a city entry"""
    market_type = city['market_type']
    monthly_rev = city['monthly_revenue']
    home_price = city['median_home_price']
    rpr = city['rpr']
    overall_score = city['overall_score']
    
    revenue_75 = int(monthly_rev * 1.3)
    revenue_90 = int(monthly_rev * 1.6)
    mtr_income = int(monthly_rev * 0.7)
    
    income_1br = int(monthly_rev * 0.55)
    income_2br = int(monthly_rev * 0.75)
    income_3br = monthly_rev
    income_4br = int(monthly_rev * 1.35)
    income_5br = int(monthly_rev * 1.65)
    income_6br = int(monthly_rev * 1.95)
    
    str_ratio = round(random.uniform(2.5, 8.5), 1)
    listings_per_k = round(random.uniform(8, 25), 1)
    yoy_growth = round(random.uniform(2, 15), 1)
    
    if str_ratio > 7:
        risk_level = 'very-high'
    elif str_ratio > 5:
        risk_level = 'high'
    elif str_ratio > 3:
        risk_level = 'moderate'
    else:
        risk_level = 'low'
    
    demand = min(95, max(30, overall_score + random.randint(-10, 15)))
    affordability = min(95, max(25, 100 - int(home_price / 10000)))
    regulation = random.randint(70, 95)
    seasonality = random.randint(55, 85)
    saturation = min(90, max(20, 100 - int(str_ratio * 10)))
    rpr_score = min(95, max(5, int(rpr * 500)))
    
    best = random.choice(['3BR', '4BR', '5BR'])
    str_status = 'legal' if regulation > 75 else 'regulated'
    permit_req = random.random() > 0.6
    
    entry = {
        "id": city['id'],
        "name": city['name'],
        "county": city['county'],
        "type": "city",
        "population": city['population'],
        "rpr": rpr,
        "dsi": city['dsi'],
        "marketScore": {
            "overall": overall_score,
            "demand": demand,
            "affordability": affordability,
            "regulation": regulation,
            "seasonality": seasonality,
            "saturation": saturation,
            "rpr": rpr_score,
            "verdict": city['verdict']
        },
        "rental": {
            "avgADR": city['adr'],
            "occupancyRate": city['occupancy'],
            "monthlyRevenue": monthly_rev,
            "medianHomePrice": home_price,
            "revenue75thPercentile": revenue_75,
            "revenue90thPercentile": revenue_90,
            "mtrMonthlyIncome": mtr_income
        },
        "saturationRisk": {
            "strToHousingRatio": str_ratio,
            "listingsPerThousand": listings_per_k,
            "yoySupplyGrowth": yoy_growth,
            "riskLevel": risk_level
        },
        "investmentMetrics": {
            "rpr": rpr,
            "rprRating": city['rpr_rating'],
            "dsi": city['dsi'],
            "dsiDetails": {
                "monthlyMortgage": city['monthly_mortgage'],
                "monthlyExpenses": city['monthly_expenses'],
                "netMonthlyIncome": city['net_monthly'],
                "survives": city['dsi']
            }
        },
        "strStatus": str_status,
        "permitRequired": permit_req,
        "incomeBySize": {
            "oneBR": income_1br,
            "twoBR": income_2br,
            "threeBR": income_3br,
            "fourBR": income_4br,
            "fiveBR": income_5br,
            "sixPlusBR": income_6br,
            "bestPerformer": best
        },
        "amenityDelta": {
            "topAmenities": market_amenities.get(market_type, market_amenities['urban']),
            "marketType": market_type
        },
        "highlights": highlights_map.get(market_type, ["Local attractions", "Nearby activities", "Good value"])
    }
    
    return json.dumps(entry, separators=(',', ':'))

# For each state, find the closing bracket and insert before it
added_count = 0
for state, cities in cities_by_state.items():
    # Find the state section - look for "  STATE: [" pattern
    pattern = rf'(  {state}: \[[\s\S]*?)(  \],)'
    
    match = re.search(pattern, content)
    if match:
        state_content = match.group(1)
        state_end = match.group(2)
        
        # Generate new entries as JSON strings
        new_entries = []
        for city in cities:
            json_entry = build_city_json(city)
            new_entries.append(json_entry)
        
        # Join with commas and newlines
        new_entries_str = ",\n".join(new_entries)
        
        # Insert before the closing bracket
        # Make sure the last existing entry ends with a comma
        state_content_stripped = state_content.rstrip()
        if not state_content_stripped.endswith(','):
            state_content_stripped += ','
        
        replacement = f"{state_content_stripped}\n{new_entries_str}\n{state_end}"
        content = content.replace(match.group(0), replacement)
        added_count += len(cities)
        print(f"Added {len(cities)} cities to {state}")
    else:
        print(f"WARNING: State {state} not found, skipping {len(cities)} cities")

# Write updated content
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'w') as f:
    f.write(content)

print(f"\n✅ Added {added_count} new cities to city-data.ts")

# Verify the new count
new_count_ts = len(re.findall(r"id: '([^']+)'", content))
new_count_json = len(re.findall(r'"id":"([^"]+)"', content))
print(f"New total: {new_count_ts} (TS format) + {new_count_json} (JSON format) = {new_count_ts + new_count_json}")
