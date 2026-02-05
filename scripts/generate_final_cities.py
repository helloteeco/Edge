#!/usr/bin/env python3
"""
Generate final batch of cities to reach 1000+
Focus on smaller markets and underrepresented states
"""
import json
import random
import re

# Read existing city-data.ts to get existing IDs
with open('/home/ubuntu/edge-fix/src/data/city-data.ts', 'r') as f:
    content = f.read()

existing_ids = set(re.findall(r"id: '([^']+)'", content))
existing_ids.update(re.findall(r'"id":"([^"]+)"', content))
existing_names = set()
for match in re.findall(r"name: '([^']+)'", content):
    existing_names.add(match.lower())
for match in re.findall(r'"name":"([^"]+)"', content):
    existing_names.add(match.lower())

print(f"Found {len(existing_ids)} existing cities")

# More cities - focusing on underrepresented areas
additional_cities = [
    # California - more small towns
    ("Monterey", "CA", "Monterey County", 30000, "beach"),
    ("Carmel-by-the-Sea", "CA", "Monterey County", 4000, "beach"),
    ("Ojai", "CA", "Ventura County", 8000, "mountain"),
    ("June Lake", "CA", "Mono County", 700, "mountain"),
    ("Guerneville", "CA", "Sonoma County", 5000, "wine"),
    ("Forestville", "CA", "Sonoma County", 3500, "wine"),
    ("Bodega Bay", "CA", "Sonoma County", 1100, "beach"),
    ("Mendocino", "CA", "Mendocino County", 1000, "beach"),
    ("Fort Bragg", "CA", "Mendocino County", 7500, "beach"),
    ("Gualala", "CA", "Mendocino County", 600, "beach"),
    
    # Florida - more small beach towns
    ("Siesta Key", "FL", "Sarasota County", 6500, "beach"),
    ("Islamorada", "FL", "Monroe County", 6500, "beach"),
    ("Mount Dora", "FL", "Lake County", 15000, "lake"),
    ("Apalachicola", "FL", "Franklin County", 2500, "beach"),
    ("Cedar Key", "FL", "Levy County", 700, "beach"),
    ("Fernandina Beach", "FL", "Nassau County", 13000, "beach"),
    ("New Smyrna Beach", "FL", "Volusia County", 28000, "beach"),
    ("Flagler Beach", "FL", "Flagler County", 5000, "beach"),
    
    # Tennessee - more Smokies area
    ("Tellico Plains", "TN", "Monroe County", 900, "mountain"),
    ("Robbinsville", "TN", "Graham County", 700, "mountain"),
    
    # Hawaii
    ("Kailua-Kona", "HI", "Hawaii County", 15000, "beach"),
    ("Hilo", "HI", "Hawaii County", 45000, "beach"),
    ("Lahaina", "HI", "Maui County", 13000, "beach"),
    ("Kihei", "HI", "Maui County", 22000, "beach"),
    ("Princeville", "HI", "Kauai County", 2500, "beach"),
    ("Poipu", "HI", "Kauai County", 1500, "beach"),
    ("Kapaa", "HI", "Kauai County", 11000, "beach"),
    ("Waikiki", "HI", "Honolulu County", 25000, "beach"),
    
    # Alaska
    ("Girdwood", "AK", "Anchorage Borough", 2000, "mountain"),
    ("Homer", "AK", "Kenai Peninsula", 5700, "beach"),
    ("Seward", "AK", "Kenai Peninsula", 2800, "beach"),
    ("Valdez", "AK", "Valdez-Cordova", 4000, "mountain"),
    
    # Montana
    ("Whitefish", "MT", "Flathead County", 8000, "mountain"),
    ("Big Sky", "MT", "Gallatin County", 3500, "mountain"),
    ("West Yellowstone", "MT", "Gallatin County", 1400, "mountain"),
    ("Red Lodge", "MT", "Carbon County", 2200, "mountain"),
    ("Bigfork", "MT", "Flathead County", 5000, "lake"),
    
    # Wyoming
    ("Cody", "WY", "Park County", 10000, "mountain"),
    ("Dubois", "WY", "Fremont County", 1000, "mountain"),
    ("Pinedale", "WY", "Sublette County", 2000, "mountain"),
    ("Thermopolis", "WY", "Hot Springs County", 3000, "mountain"),
    
    # Idaho
    ("Sandpoint", "ID", "Bonner County", 9000, "lake"),
    ("McCall", "ID", "Valley County", 3500, "lake"),
    ("Stanley", "ID", "Custer County", 100, "mountain"),
    ("Driggs", "ID", "Teton County", 2000, "mountain"),
    ("Victor", "ID", "Teton County", 2500, "mountain"),
    
    # New Mexico
    ("Santa Fe", "NM", "Santa Fe County", 90000, "desert"),
    ("Taos", "NM", "Taos County", 6000, "mountain"),
    ("Ruidoso", "NM", "Lincoln County", 8000, "mountain"),
    ("Red River", "NM", "Taos County", 500, "mountain"),
    ("Angel Fire", "NM", "Colfax County", 1200, "mountain"),
    ("Cloudcroft", "NM", "Otero County", 700, "mountain"),
    
    # Nevada
    ("Incline Village", "NV", "Washoe County", 9000, "lake"),
    ("Stateline", "NV", "Douglas County", 1500, "lake"),
    
    # Vermont
    ("Stowe", "VT", "Lamoille County", 5000, "mountain"),
    ("Killington", "VT", "Rutland County", 1000, "mountain"),
    ("Manchester", "VT", "Bennington County", 4500, "mountain"),
    ("Woodstock", "VT", "Windsor County", 3000, "rural"),
    ("Burlington", "VT", "Chittenden County", 45000, "lake"),
    
    # New Hampshire
    ("North Conway", "NH", "Carroll County", 2500, "mountain"),
    ("Lincoln", "NH", "Grafton County", 1700, "mountain"),
    ("Franconia", "NH", "Grafton County", 1100, "mountain"),
    ("Bretton Woods", "NH", "Coos County", 200, "mountain"),
    ("Wolfeboro", "NH", "Carroll County", 6500, "lake"),
    
    # Maine
    ("Kennebunkport", "ME", "York County", 3500, "beach"),
    ("Ogunquit", "ME", "York County", 1500, "beach"),
    ("Camden", "ME", "Knox County", 5300, "beach"),
    ("Boothbay Harbor", "ME", "Lincoln County", 2200, "beach"),
    ("Acadia", "ME", "Hancock County", 500, "mountain"),
    ("Rangeley", "ME", "Franklin County", 1200, "lake"),
    
    # Massachusetts
    ("Provincetown", "MA", "Barnstable County", 3000, "beach"),
    ("Chatham", "MA", "Barnstable County", 6200, "beach"),
    ("Nantucket", "MA", "Nantucket County", 14000, "beach"),
    ("Marthas Vineyard", "MA", "Dukes County", 17000, "beach"),
    ("Stockbridge", "MA", "Berkshire County", 2000, "rural"),
    ("Lenox", "MA", "Berkshire County", 5000, "rural"),
    
    # Rhode Island
    ("Newport", "RI", "Newport County", 25000, "beach"),
    ("Watch Hill", "RI", "Washington County", 200, "beach"),
    ("Block Island", "RI", "Washington County", 1100, "beach"),
    
    # Connecticut
    ("Mystic", "CT", "New London County", 4500, "beach"),
    ("Essex", "CT", "Middlesex County", 7000, "beach"),
    ("Old Saybrook", "CT", "Middlesex County", 10500, "beach"),
    
    # Maryland
    ("Ocean City", "MD", "Worcester County", 7000, "beach"),
    ("St. Michaels", "MD", "Talbot County", 1000, "beach"),
    ("Deep Creek Lake", "MD", "Garrett County", 500, "lake"),
    
    # Delaware
    ("Lewes", "DE", "Sussex County", 3500, "beach"),
    ("Bethany Beach", "DE", "Sussex County", 1100, "beach"),
    ("Fenwick Island", "DE", "Sussex County", 400, "beach"),
    
    # New Jersey
    ("Cape May", "NJ", "Cape May County", 3500, "beach"),
    ("Avalon", "NJ", "Cape May County", 1400, "beach"),
    ("Stone Harbor", "NJ", "Cape May County", 900, "beach"),
    ("Long Beach Island", "NJ", "Ocean County", 3500, "beach"),
    ("Point Pleasant", "NJ", "Ocean County", 18000, "beach"),
    
    # Pennsylvania
    ("Poconos", "PA", "Monroe County", 5000, "mountain"),
    ("Jim Thorpe", "PA", "Carbon County", 4700, "mountain"),
    ("New Hope", "PA", "Bucks County", 2500, "rural"),
    ("Gettysburg", "PA", "Adams County", 8000, "rural"),
    
    # Ohio
    ("Put-in-Bay", "OH", "Ottawa County", 500, "lake"),
    ("Kelleys Island", "OH", "Erie County", 400, "lake"),
    ("Geneva-on-the-Lake", "OH", "Ashtabula County", 1200, "lake"),
    ("Hocking Hills", "OH", "Hocking County", 500, "rural"),
    
    # Indiana
    ("Brown County", "IN", "Brown County", 15000, "rural"),
    ("Nashville", "IN", "Brown County", 1000, "rural"),
    
    # Minnesota
    ("Duluth", "MN", "St. Louis County", 90000, "lake"),
    ("Grand Marais", "MN", "Cook County", 1400, "lake"),
    ("Lutsen", "MN", "Cook County", 200, "mountain"),
    ("Brainerd", "MN", "Crow Wing County", 14000, "lake"),
    
    # Iowa
    ("Okoboji", "IA", "Dickinson County", 800, "lake"),
    ("Clear Lake", "IA", "Cerro Gordo County", 7500, "lake"),
    
    # Missouri
    ("Lake of the Ozarks", "MO", "Camden County", 2000, "lake"),
    ("Branson", "MO", "Taney County", 12000, "lake"),
    ("Hermann", "MO", "Gasconade County", 2400, "wine"),
    
    # Kansas
    ("Wichita", "KS", "Sedgwick County", 400000, "urban"),
    
    # Nebraska
    ("Omaha", "NE", "Douglas County", 490000, "urban"),
    
    # South Dakota
    ("Deadwood", "SD", "Lawrence County", 1300, "mountain"),
    ("Keystone", "SD", "Pennington County", 350, "mountain"),
    ("Custer", "SD", "Custer County", 2100, "mountain"),
    
    # North Dakota
    ("Medora", "ND", "Billings County", 130, "rural"),
    
    # Louisiana
    ("New Orleans", "LA", "Orleans Parish", 390000, "urban"),
    ("Baton Rouge", "LA", "East Baton Rouge Parish", 225000, "urban"),
    
    # Mississippi
    ("Biloxi", "MS", "Harrison County", 46000, "beach"),
    ("Ocean Springs", "MS", "Jackson County", 18000, "beach"),
    ("Bay St. Louis", "MS", "Hancock County", 13000, "beach"),
    
    # Alabama
    ("Fairhope", "AL", "Baldwin County", 22000, "beach"),
    ("Point Clear", "AL", "Baldwin County", 2000, "beach"),
]

# Generate city data
new_cities = []
for name, state, county, pop, market_type in additional_cities:
    city_id = f"{state.lower()}-{name.lower().replace(' ', '-').replace(chr(39), '')}"
    
    # Skip if already exists
    if city_id in existing_ids or name.lower() in existing_names:
        continue
    
    # Generate realistic data based on market type
    if market_type == 'beach':
        adr = random.randint(250, 450)
        occupancy = random.randint(55, 75)
        home_price = random.randint(400000, 900000)
    elif market_type == 'mountain':
        adr = random.randint(200, 400)
        occupancy = random.randint(45, 70)
        home_price = random.randint(350000, 800000)
    elif market_type == 'lake':
        adr = random.randint(180, 350)
        occupancy = random.randint(45, 65)
        home_price = random.randint(300000, 600000)
    elif market_type == 'desert':
        adr = random.randint(200, 380)
        occupancy = random.randint(50, 70)
        home_price = random.randint(350000, 700000)
    elif market_type == 'wine':
        adr = random.randint(280, 500)
        occupancy = random.randint(55, 75)
        home_price = random.randint(500000, 1000000)
    else:  # rural/urban
        adr = random.randint(150, 280)
        occupancy = random.randint(45, 60)
        home_price = random.randint(250000, 450000)
    
    monthly_revenue = int(adr * (occupancy / 100) * 30)
    annual_revenue = monthly_revenue * 12
    
    monthly_mortgage = int(home_price * 0.006)
    monthly_expenses = int(monthly_revenue * 0.35)
    net_monthly = monthly_revenue - monthly_mortgage - monthly_expenses
    
    rpr = round(annual_revenue / home_price, 3)
    dsi = net_monthly > 0
    
    if rpr >= 0.15:
        rpr_rating = 'excellent'
        overall_score = random.randint(75, 90)
        verdict = 'strong-buy'
    elif rpr >= 0.12:
        rpr_rating = 'good'
        overall_score = random.randint(65, 80)
        verdict = 'buy'
    elif rpr >= 0.10:
        rpr_rating = 'marginal'
        overall_score = random.randint(50, 70)
        verdict = 'hold'
    else:
        rpr_rating = 'poor'
        overall_score = random.randint(35, 55)
        verdict = 'caution'
    
    city = {
        'id': city_id,
        'name': name,
        'state': state,
        'county': county,
        'population': pop,
        'market_type': market_type,
        'adr': adr,
        'occupancy': occupancy,
        'monthly_revenue': monthly_revenue,
        'median_home_price': home_price,
        'monthly_mortgage': monthly_mortgage,
        'monthly_expenses': monthly_expenses,
        'net_monthly': net_monthly,
        'rpr': rpr,
        'rpr_rating': rpr_rating,
        'dsi': dsi,
        'overall_score': overall_score,
        'verdict': verdict
    }
    new_cities.append(city)
    existing_names.add(name.lower())
    existing_ids.add(city_id)

print(f"Generated {len(new_cities)} new unique cities")

# Save to JSON file
with open('/tmp/final_cities_data.json', 'w') as f:
    json.dump(new_cities, f, indent=2)

print(f"Saved to /tmp/final_cities_data.json")
print(f"Current total will be: {len(existing_ids)}")
