#!/usr/bin/env python3
"""
Append new cities to existing city-data.ts file by state
"""
import json
import re

# Load generated cities
with open('/tmp/new_cities_data.json', 'r') as f:
    new_cities = json.load(f)

# Read existing city-data.ts
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'r') as f:
    content = f.read()

# Group new cities by state
cities_by_state = {}
for city in new_cities:
    state = city['state']
    if state not in cities_by_state:
        cities_by_state[state] = []
    cities_by_state[state].append(city)

print(f"New cities grouped by {len(cities_by_state)} states")

# Market type to amenities mapping
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

import random

def city_to_ts(city):
    """Convert city dict to TypeScript object string"""
    name = city['name']
    state = city['state']
    county = city['county']
    pop = city['population']
    market_type = city['market_type']
    adr = city['adr']
    occ = city['occupancy']
    monthly_rev = city['monthly_revenue']
    home_price = city['median_home_price']
    rpr = city['rpr']
    rpr_rating = city['rpr_rating']
    dsi = city['dsi']
    overall_score = city['overall_score']
    verdict = city['verdict']
    monthly_mortgage = city['monthly_mortgage']
    monthly_expenses = city['monthly_expenses']
    net_monthly = city['net_monthly']
    
    # Calculate derived values
    revenue_75 = int(monthly_rev * 1.3)
    revenue_90 = int(monthly_rev * 1.6)
    mtr_income = int(monthly_rev * 0.7)
    
    # Income by size
    income_1br = int(monthly_rev * 0.55)
    income_2br = int(monthly_rev * 0.75)
    income_3br = monthly_rev
    income_4br = int(monthly_rev * 1.35)
    income_5br = int(monthly_rev * 1.65)
    income_6br = int(monthly_rev * 1.95)
    
    # Saturation metrics
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
    
    # Market score components
    demand = min(95, max(30, overall_score + random.randint(-10, 15)))
    affordability = min(95, max(25, 100 - int(home_price / 10000)))
    regulation = random.randint(70, 95)
    seasonality = random.randint(55, 85)
    saturation = min(90, max(20, 100 - int(str_ratio * 10)))
    rpr_score = min(95, max(5, int(rpr * 500)))
    
    # Amenities
    amenities = market_amenities.get(market_type, market_amenities['urban'])
    amenities_json = json.dumps(amenities)
    
    # Highlights
    highlights = highlights_map.get(market_type, ["Local attractions", "Nearby activities", "Good value"])
    highlights_json = json.dumps(highlights)
    
    # Best performer
    best_performers = ['3BR', '4BR', '5BR']
    best = random.choice(best_performers)
    
    # STR status
    str_status = 'legal' if regulation > 75 else 'regulated'
    permit_req = 'true' if random.random() > 0.6 else 'false'
    
    city_id = city['id']
    
    return f"{{ id: '{city_id}', name: '{name}', county: '{county}', type: 'city', population: {pop}, rpr: {rpr}, dsi: {'true' if dsi else 'false'}, marketScore: {{ overall: {overall_score}, demand: {demand}, affordability: {affordability}, regulation: {regulation}, seasonality: {seasonality}, saturation: {saturation}, rpr: {rpr_score}, verdict: '{verdict}' }}, rental: {{ avgADR: {adr}, occupancyRate: {occ}, monthlyRevenue: {monthly_rev}, medianHomePrice: {home_price}, revenue75thPercentile: {revenue_75}, revenue90thPercentile: {revenue_90}, mtrMonthlyIncome: {mtr_income} }}, saturationRisk: {{ strToHousingRatio: {str_ratio}, listingsPerThousand: {listings_per_k}, yoySupplyGrowth: {yoy_growth}, riskLevel: '{risk_level}' }}, investmentMetrics: {{ rpr: {rpr}, rprRating: '{rpr_rating}', dsi: {'true' if dsi else 'false'}, dsiDetails: {{ monthlyMortgage: {monthly_mortgage}, monthlyExpenses: {monthly_expenses}, netMonthlyIncome: {net_monthly}, survives: {'true' if dsi else 'false'} }} }}, strStatus: '{str_status}', permitRequired: {permit_req}, incomeBySize: {{ oneBR: {income_1br}, twoBR: {income_2br}, threeBR: {income_3br}, fourBR: {income_4br}, fiveBR: {income_5br}, sixPlusBR: {income_6br}, bestPerformer: '{best}' }}, amenityDelta: {{ topAmenities: {amenities_json}, marketType: '{market_type}' }}, highlights: {highlights_json} }}"

# For each state with new cities, find the state's array and append
added_count = 0
for state, cities in cities_by_state.items():
    # Find the pattern for this state's array
    # Pattern: "  STATE: [\n    ...entries...\n  ],"
    pattern = rf'(  {state}: \[[\s\S]*?)(  \],)'
    
    match = re.search(pattern, content)
    if match:
        # State exists, append to its array
        existing_array = match.group(1)
        closing = match.group(2)
        
        # Generate new city entries
        new_entries = []
        for city in cities:
            ts_entry = city_to_ts(city)
            new_entries.append(f"    {ts_entry},")
        
        new_entries_str = "\n".join(new_entries)
        
        # Insert before the closing bracket
        replacement = f"{existing_array.rstrip()}\n{new_entries_str}\n{closing}"
        content = content.replace(match.group(0), replacement)
        added_count += len(cities)
        print(f"Added {len(cities)} cities to {state}")
    else:
        print(f"WARNING: State {state} not found in cityData, skipping {len(cities)} cities")

# Write updated content
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'w') as f:
    f.write(content)

print(f"\n✅ Added {added_count} new cities to city-data.ts")
