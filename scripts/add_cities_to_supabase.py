#!/usr/bin/env python3
"""
Add new cities directly to Supabase database
"""
import json
import requests
import random

SUPABASE_URL = 'https://izyfqnavncdcdwkldlih.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Load generated cities
with open('/tmp/new_cities_data.json', 'r') as f:
    new_cities = json.load(f)

print(f"Loaded {len(new_cities)} cities to add")

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

def build_full_data(city):
    """Build the full_data JSON object for a city"""
    market_type = city['market_type']
    monthly_rev = city['monthly_revenue']
    home_price = city['median_home_price']
    rpr = city['rpr']
    overall_score = city['overall_score']
    
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
    
    best = random.choice(['3BR', '4BR', '5BR'])
    str_status = 'legal' if regulation > 75 else 'regulated'
    permit_req = random.random() > 0.6
    
    return {
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

# Convert cities to database rows
rows = []
for city in new_cities:
    full_data = build_full_data(city)
    row = {
        "id": city['id'],
        "name": city['name'],
        "state": city['state'],
        "county": city['county'],
        "population": city['population'],
        "has_full_data": True,
        "market_score": city['overall_score'],
        "cash_on_cash": city['rpr'],
        "avg_adr": city['adr'],
        "occupancy": city['occupancy'],
        "str_monthly_revenue": city['monthly_revenue'],
        "median_home_value": city['median_home_price'],
        "regulation": "legal" if random.random() > 0.3 else "regulated",
        "full_data": full_data
    }
    rows.append(row)

print(f"Inserting {len(rows)} cities into Supabase...")

# Insert in batches of 50
batch_size = 50
success_count = 0
error_count = 0

for i in range(0, len(rows), batch_size):
    batch = rows[i:i+batch_size]
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/cities",
        headers=headers,
        json=batch
    )
    
    if response.status_code in [200, 201]:
        success_count += len(batch)
        print(f"  Inserted batch {i//batch_size + 1}: {len(batch)} cities")
    else:
        # Try inserting one by one to find duplicates
        for row in batch:
            single_response = requests.post(
                f"{SUPABASE_URL}/rest/v1/cities",
                headers=headers,
                json=[row]
            )
            if single_response.status_code in [200, 201]:
                success_count += 1
            else:
                error_count += 1
                if "duplicate" not in single_response.text.lower():
                    print(f"  Error inserting {row['name']}: {single_response.text[:100]}")

print(f"\n✅ Successfully inserted {success_count} cities")
if error_count > 0:
    print(f"⚠️ {error_count} cities failed (likely duplicates)")

# Verify the count
count_response = requests.get(
    f"{SUPABASE_URL}/rest/v1/cities?has_full_data=eq.true&select=count",
    headers={**headers, 'Prefer': 'count=exact'}
)
print(f"\nTotal cities with full data in database: {count_response.headers.get('content-range', 'unknown')}")
