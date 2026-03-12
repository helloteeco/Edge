#!/usr/bin/env python3
"""
Monthly Data Update Script for Edge
Runs on the 1st of each month via GitHub Actions.

Downloads fresh data from:
  - Zillow ZHVI (state-level home values + appreciation)
  - Redfin Data Center (inventory, DOM, price cuts)
  - Freddie Mac PMMS (mortgage rates)

Then surgically updates:
  - src/data/state-data.ts (appreciation + mortgage rates)
  - src/data/inventory-data.ts (DOM, price cuts, inventory level)
  - src/data/helpers.ts (DATA_LAST_UPDATED)
  - src/data/basic-city-data.ts (comment)

Does NOT modify:
  - STR revenue, ADR, occupancy (PriceLabs data)
  - Migration data (Census)
  - STR regulations (curated)
  - Demand drivers, playbooks, amenity deltas
  - City-level medianHomePrice
"""

import csv
import io
import gzip
import re
import sys
import urllib.request
from datetime import datetime

# ============================================================
# Config
# ============================================================
ZILLOW_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/State_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
REDFIN_URL = "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/state_market_tracker.tsv000.gz"
FREDDIE_URL = "https://www.freddiemac.com/pmms/docs/PMMS_history.csv"

STATE_DATA_TS = "src/data/state-data.ts"
INVENTORY_TS = "src/data/inventory-data.ts"
HELPERS_TS = "src/data/helpers.ts"
BASIC_CITY_TS = "src/data/basic-city-data.ts"

NAME_TO_CODE = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
}

def download(url):
    """Download a URL and return bytes."""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()

# ============================================================
# 1. Parse Zillow ZHVI state data
# ============================================================
def fetch_zillow():
    print("Downloading Zillow ZHVI state data...")
    data = download(ZILLOW_URL).decode('utf-8')
    reader = csv.DictReader(io.StringIO(data))
    cols = reader.fieldnames
    date_cols = sorted([c for c in cols if re.match(r'\d{4}-\d{2}-\d{2}', c)])
    latest = date_cols[-1]
    one_yr = date_cols[max(0, len(date_cols) - 13)]
    five_yr = date_cols[max(0, len(date_cols) - 61)]
    
    results = {}
    for row in reader:
        name = row['RegionName'].strip()
        code = NAME_TO_CODE.get(name)
        if not code:
            continue
        try:
            lv = float(row[latest]) if row[latest] else None
            ov = float(row[one_yr]) if row[one_yr] else None
            fv = float(row[five_yr]) if row[five_yr] else None
        except ValueError:
            continue
        if lv:
            results[code] = {
                'medianValue': round(lv),
                'oneYear': round(((lv - ov) / ov) * 100, 1) if ov else 0,
                'fiveYear': round(((lv - fv) / fv) * 100, 1) if fv else 0,
            }
    
    print(f"  Parsed {len(results)} states. Latest date: {latest}")
    return results

# ============================================================
# 2. Parse Redfin state data
# ============================================================
def fetch_redfin():
    print("Downloading Redfin state market data...")
    compressed = download(REDFIN_URL)
    data = gzip.decompress(compressed).decode('utf-8')
    
    results = {}
    lines = data.split('\n')
    header = lines[0]  # skip
    
    for line in lines[1:]:
        if not line.strip():
            continue
        fields = line.split('\t')
        if len(fields) < 51:
            continue
        
        period = fields[0].strip('"')
        state_code = fields[10].strip('"')
        prop_type = fields[11].strip('"')
        
        if prop_type != 'All Residential' or not state_code or len(state_code) != 2:
            continue
        
        if state_code not in results or period > results[state_code]['period']:
            def safe_float(idx):
                try:
                    val = fields[idx].strip('"')
                    return float(val) if val and val != 'NA' else None
                except (ValueError, IndexError):
                    return None
            
            results[state_code] = {
                'period': period,
                'inventory': safe_float(34),
                'inventoryYoY': round(safe_float(36) * 100, 1) if safe_float(36) is not None else None,
                'priceCuts': round(safe_float(49) * 100, 1) if safe_float(49) is not None else None,
                'dom': round(safe_float(40)) if safe_float(40) is not None else None,
            }
    
    print(f"  Parsed {len(results)} states. Latest period: {list(results.values())[0]['period'] if results else 'N/A'}")
    return results

# ============================================================
# 3. Parse Freddie Mac mortgage rates
# ============================================================
def fetch_freddie():
    print("Downloading Freddie Mac PMMS data...")
    data = download(FREDDIE_URL).decode('utf-8')
    lines = data.strip().split('\n')
    
    thirty_yr = None
    fifteen_yr = None
    date = None
    
    for line in reversed(lines):
        parts = line.strip().split(',')
        if len(parts) >= 4 and parts[1]:
            try:
                thirty_yr = float(parts[1])
                fifteen_yr = float(parts[3]) if parts[3] else None
                date = parts[0]
                break
            except ValueError:
                continue
    
    print(f"  Latest rates ({date}): 30yr={thirty_yr}%, 15yr={fifteen_yr}%")
    return {'thirtyYear': thirty_yr, 'fifteenYear': fifteen_yr, 'date': date}

# ============================================================
# 4. Update state-data.ts
# ============================================================
def update_state_data(zillow, freddie):
    print("Updating state-data.ts...")
    with open(STATE_DATA_TS, 'r') as f:
        content = f.read()
    
    # Determine mortgage trend
    trend = 'stable'  # Default; could be made smarter with historical comparison
    
    changes = 0
    for code, data in zillow.items():
        # Update appreciation
        pattern = rf"(  {code}: \{{.*?appreciation: \{{ oneYear: )([\d.-]+)(, fiveYear: )([\d.-]+)(, medianValue: )(\d+)( \}})"
        m = re.search(pattern, content, re.DOTALL)
        if m:
            old_text = m.group(0)
            new_text = (old_text[:m.start(2) - m.start(0)] + str(data['oneYear']) +
                       old_text[m.end(2) - m.start(0):m.start(4) - m.start(0)] + str(data['fiveYear']) +
                       old_text[m.end(4) - m.start(0):m.start(6) - m.start(0)] + str(data['medianValue']) +
                       old_text[m.end(6) - m.start(0):])
            content = content.replace(old_text, new_text)
            changes += 1
        
        # Update mortgage rates
        mort_pattern = rf"(  {code}: \{{.*?mortgageRates: \{{ thirtyYear: )([\d.]+)(, fifteenYear: )([\d.]+)(, trend: ')([^']+)(' \}})"
        m2 = re.search(mort_pattern, content, re.DOTALL)
        if m2:
            old_text = m2.group(0)
            new_text = (old_text[:m2.start(2) - m2.start(0)] + str(freddie['thirtyYear']) +
                       old_text[m2.end(2) - m2.start(0):m2.start(4) - m2.start(0)] + str(freddie['fifteenYear']) +
                       old_text[m2.end(4) - m2.start(0):m2.start(6) - m2.start(0)] + trend +
                       old_text[m2.end(6) - m2.start(0):])
            content = content.replace(old_text, new_text)
    
    with open(STATE_DATA_TS, 'w') as f:
        f.write(content)
    print(f"  Updated {changes} states")

# ============================================================
# 5. Update inventory-data.ts
# ============================================================
def update_inventory_data(redfin):
    print("Updating inventory-data.ts...")
    with open(INVENTORY_TS, 'r') as f:
        content = f.read()
    
    changes = 0
    for code, data in redfin.items():
        if data.get('dom') is None or data.get('priceCuts') is None:
            continue
        
        inv_yoy = data.get('inventoryYoY', 0) or 0
        dom = data['dom']
        price_cuts = data['priceCuts']
        
        # Classify inventory level
        if dom >= 80 and price_cuts >= 25:
            level = 'very-high'
        elif dom >= 60 and price_cuts >= 20:
            level = 'high'
        elif dom >= 40 and price_cuts >= 15:
            level = 'moderate'
        else:
            level = 'low'
        
        pattern = rf"({code}: \{{ inventoryLevel: ')([^']+)(',\s*inventoryGrowthYoY:\s*)([\d.-]+)(,\s*inventoryVs2019:\s*)([\d.-]+)(,\s*priceCutPercent:\s*)([\d.]+)(,\s*daysOnMarket:\s*)(\d+)"
        m = re.search(pattern, content)
        if m:
            old_vs2019 = m.group(6)
            new_line = f"{code}: {{ inventoryLevel: '{level}', inventoryGrowthYoY: {round(inv_yoy)}, inventoryVs2019: {old_vs2019}, priceCutPercent: {round(price_cuts, 1)}, daysOnMarket: {dom}"
            content = content[:m.start()] + new_line + content[m.end():]
            changes += 1
    
    with open(INVENTORY_TS, 'w') as f:
        f.write(content)
    print(f"  Updated {changes} states")

# ============================================================
# 6. Update DATA_LAST_UPDATED
# ============================================================
def update_last_updated():
    now = datetime.now()
    month_name = now.strftime('%B %Y')  # e.g., "March 2026"
    
    # helpers.ts
    with open(HELPERS_TS, 'r') as f:
        content = f.read()
    content = re.sub(
        r"export const DATA_LAST_UPDATED = '[^']+';",
        f"export const DATA_LAST_UPDATED = '{month_name}';",
        content
    )
    with open(HELPERS_TS, 'w') as f:
        f.write(content)
    
    # basic-city-data.ts comment
    with open(BASIC_CITY_TS, 'r') as f:
        content = f.read()
    content = re.sub(
        r"// Last updated: [A-Z][a-z]+ \d{4}",
        f"// Last updated: {month_name}",
        content
    )
    with open(BASIC_CITY_TS, 'w') as f:
        f.write(content)
    
    print(f"  DATA_LAST_UPDATED → '{month_name}'")

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print("=" * 60)
    print(f"EDGE MONTHLY DATA UPDATE — {datetime.now().strftime('%B %d, %Y')}")
    print("=" * 60)
    
    try:
        zillow = fetch_zillow()
        redfin = fetch_redfin()
        freddie = fetch_freddie()
    except Exception as e:
        print(f"\nERROR downloading data: {e}")
        print("Aborting update — no files were modified.")
        sys.exit(1)
    
    # Sanity checks before writing
    if len(zillow) < 45:
        print(f"ERROR: Only {len(zillow)} states from Zillow (expected 50+). Aborting.")
        sys.exit(1)
    if len(redfin) < 45:
        print(f"ERROR: Only {len(redfin)} states from Redfin (expected 50+). Aborting.")
        sys.exit(1)
    if not freddie['thirtyYear'] or freddie['thirtyYear'] < 2 or freddie['thirtyYear'] > 15:
        print(f"ERROR: Suspicious mortgage rate: {freddie['thirtyYear']}%. Aborting.")
        sys.exit(1)
    
    print("\nAll data validated. Applying updates...")
    update_state_data(zillow, freddie)
    update_inventory_data(redfin)
    update_last_updated()
    
    print("\n" + "=" * 60)
    print("UPDATE COMPLETE")
    print("=" * 60)
