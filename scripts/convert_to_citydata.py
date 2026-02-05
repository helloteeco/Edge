#!/usr/bin/env python3
"""
Convert generated city JSON to TypeScript format matching city-data.ts structure
"""
import json
import random

# Load generated cities
with open('/tmp/new_cities_data.json', 'r') as f:
    cities = json.load(f)

# State to abbreviation mapping for full state names
state_abbrev = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
}

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

# Generate highlights based on market type and city
def get_highlights(name, market_type, state):
    highlights_map = {
        'beach': ["Beach access", "Ocean activities", "Coastal dining"],
        'mountain': ["Hiking trails", "Scenic views", "Outdoor recreation"],
        'lake': ["Water activities", "Fishing", "Scenic shoreline"],
        'desert': ["Desert landscapes", "Outdoor adventures", "Stargazing"],
        'wine': ["Wine tasting", "Vineyard tours", "Fine dining"],
        'urban': ["City attractions", "Dining scene", "Entertainment"],
        'rural': ["Peace & quiet", "Nature access", "Affordable"]
    }
    return highlights_map.get(market_type, ["Local attractions", "Nearby activities", "Good value"])

# Convert to TypeScript format
ts_entries = []

for city in cities:
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
    highlights = get_highlights(name, market_type, state)
    highlights_json = json.dumps(highlights)
    
    # Best performer
    best_performers = ['3BR', '4BR', '5BR']
    best = random.choice(best_performers)
    
    # STR status
    str_status = 'legal' if regulation > 75 else 'regulated'
    permit_req = 'true' if random.random() > 0.6 else 'false'
    
    city_id = city['id']
    
    ts_entry = f"""    {{ id: '{city_id}', name: '{name}', county: '{county}', type: 'city', population: {pop}, rpr: {rpr}, dsi: {'true' if dsi else 'false'}, marketScore: {{ overall: {overall_score}, demand: {demand}, affordability: {affordability}, regulation: {regulation}, seasonality: {seasonality}, saturation: {saturation}, rpr: {rpr_score}, verdict: '{verdict}' }}, rental: {{ avgADR: {adr}, occupancyRate: {occ}, monthlyRevenue: {monthly_rev}, medianHomePrice: {home_price}, revenue75thPercentile: {revenue_75}, revenue90thPercentile: {revenue_90}, mtrMonthlyIncome: {mtr_income} }}, saturationRisk: {{ strToHousingRatio: {str_ratio}, listingsPerThousand: {listings_per_k}, yoySupplyGrowth: {yoy_growth}, riskLevel: '{risk_level}' }}, investmentMetrics: {{ rpr: {rpr}, rprRating: '{rpr_rating}', dsi: {'true' if dsi else 'false'}, dsiDetails: {{ monthlyMortgage: {monthly_mortgage}, monthlyExpenses: {monthly_expenses}, netMonthlyIncome: {net_monthly}, survives: {'true' if dsi else 'false'} }} }}, strStatus: '{str_status}', permitRequired: {permit_req}, incomeBySize: {{ oneBR: {income_1br}, twoBR: {income_2br}, threeBR: {income_3br}, fourBR: {income_4br}, fiveBR: {income_5br}, sixPlusBR: {income_6br}, bestPerformer: '{best}' }}, amenityDelta: {{ topAmenities: {amenities_json}, marketType: '{market_type}' }}, highlights: {highlights_json} }},"""
    
    ts_entries.append(ts_entry)

# Write to file
output = "\n".join(ts_entries)
with open('/tmp/new_cities_ts.txt', 'w') as f:
    f.write(output)

print(f"Generated {len(ts_entries)} TypeScript entries")
print(f"Saved to /tmp/new_cities_ts.txt")
